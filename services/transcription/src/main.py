from contextlib import asynccontextmanager
import logging
from pathlib import Path
import shutil
import time
from collections import defaultdict

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import whisper
import tempfile
import os
import uvicorn
import aiofiles
from fastApiTypes import (
    TranscriptionResponse,
    TranscriptionSegment,
    ErrorResponse,
    ModelConfig,
    ALLOWED_AUDIO_TYPES,
    MAX_FILE_SIZE
)
from dotenv import load_dotenv
from deepseek_client import DeepSeekClient
from fastapi import Body
from pydantic import BaseModel

load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables
model = None
temp_dir = Path(tempfile.gettempdir()) / "whisper_audio"

def setup_temp_directory():
    """Create temporary directory for audio files"""
    temp_dir.mkdir(exist_ok=True)
    logger.info(f"Created temp directory at {temp_dir}")

def cleanup_old_files():
    """Remove files older than 1 hour"""
    try:
        current_time = time.time()
        for file_path in temp_dir.glob("*"):
            if current_time - file_path.stat().st_mtime > 3600:  # 1 hour
                file_path.unlink()
                logger.info(f"Cleaned up old file: {file_path}")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    try:
        setup_temp_directory()
        logger.info("Loading Whisper model...")
        model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
        yield
    except whisper.whisper.RuntimeError as e:
        logger.error(f"Failed to load Whisper model: {e}")
        raise RuntimeError("Failed to initialize speech recognition model")
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise
    finally:
        try:
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
                logger.info("Cleaned up temp directory")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

app = FastAPI(
    title="Whisper Transcription API",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting middleware
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: FastAPI, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        
        # Clean old requests
        self.requests[client_ip] = [req_time for req_time in self.requests[client_ip]
                                  if now - req_time < 60]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )
        
        self.requests[client_ip].append(now)
        return await call_next(request)

# Add rate limiting
app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

def cleanup_file(file_path: Path):
    """Background task to cleanup a specific file"""
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Cleaned up file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up file {file_path}: {e}")

async def validate_audio_file(file: UploadFile) -> None:
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided"
        )
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.wav', '.mp3', '.webm', '.mp4']:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {file_ext}"
        )

@app.post("/transcribe", 
          response_model=TranscriptionResponse,
          responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def transcribe_audio(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    await validate_audio_file(file)
    
    try:
        # Clean up any old files before processing
        cleanup_old_files()
        
        # Create unique filename with original extension
        original_ext = Path(file.filename).suffix
        unique_filename = f"{os.urandom(8).hex()}{original_ext}"
        file_path = temp_dir / unique_filename
        
        # Read and validate file size with progress tracking
        content = await file.read()
        file_size = len(content)
        
        if file_size == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file provided"
            )
            
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size too large. Maximum size is {MAX_FILE_SIZE/1024/1024:.1f}MB"
            )
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)
            
        logger.info(f"Saved audio file: {file_path}")
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(cleanup_file, file_path)
        
        # Transcribe with error handling
        try:
            logger.info("Starting transcription...")
            result = model.transcribe(str(file_path))
            logger.info("Transcription completed")
            
            if not result or not result.get("text"):
                raise HTTPException(
                    status_code=500,
                    detail="Transcription failed - no text generated"
                )
                
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Transcription failed: {str(e)}"
            )
        
        # Process with DeepSeek
        try:
            logger.info("Processing with DeepSeek...")
            deepseek_client = DeepSeekClient()
            ai_response = await deepseek_client.process_voice_input(result["text"])
            logger.info("DeepSeek processing completed")
            
            if ai_response.error:
                logger.warning(f"DeepSeek warning: {ai_response.error}")
                
        except Exception as e:
            logger.error(f"DeepSeek error: {e}")
            # Don't fail the whole request if AI processing fails
            ai_response = DeepSeekResponse(
                error=f"AI processing failed: {str(e)}",
                response=""
            )
        
        # Construct response
        response = TranscriptionResponse(
            text=result["text"],
            language=result["language"],
            segments=[TranscriptionSegment(**segment) for segment in result.get("segments", [])],
            ai_response=ai_response
        )
        
        return response
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Enhanced health check endpoint"""
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded"
        )
    
    # Check temp directory
    temp_dir_status = "ok" if temp_dir.exists() else "missing"
    
    # Check disk space
    try:
        total, used, free = shutil.disk_usage(temp_dir)
        disk_space = {
            "total": total // (2**30),  # GB
            "used": used // (2**30),    # GB
            "free": free // (2**30)     # GB
        }
    except Exception as e:
        disk_space = {"error": str(e)}
    
    return {
        "status": "healthy",
        "model": "base",
        "temp_dir": {
            "path": str(temp_dir),
            "status": temp_dir_status
        },
        "disk_space": disk_space,
        "timestamp": time.time()
    }

@app.get("/config", response_model=ModelConfig)
async def get_config():
    """Get current configuration"""
    return ModelConfig(
        model_name="base",
        max_file_size=MAX_FILE_SIZE,
        allowed_types=ALLOWED_AUDIO_TYPES
    )



class TextRequest(BaseModel):
    text: str

@app.post("/process-text")
async def process_text(request: TextRequest):
    try:
        logger.info("Processing text with DeepSeek...")
        deepseek_client = DeepSeekClient()
        ai_response = await deepseek_client.process_voice_input(request.text)
        logger.info("DeepSeek processing completed")
        
        return {
            "text": request.text,
            "ai_response": ai_response
        }
    except Exception as e:
        logger.error(f"Error processing text request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing request: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )