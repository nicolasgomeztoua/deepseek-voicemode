from contextlib import asynccontextmanager
import logging
from pathlib import Path
import shutil
import time

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import uvicorn
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
    # Startup: Create temp directory and load model
    global model
    try:
        setup_temp_directory()
        logger.info("Loading Whisper model...")
        model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
        yield
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise
    finally:
        # Cleanup on shutdown
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_file(file_path: Path):
    """Background task to cleanup a specific file"""
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Cleaned up file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up file {file_path}: {e}")

@app.post("/transcribe", 
          response_model=TranscriptionResponse,
          responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def transcribe_audio(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    # Validate file type
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Must be one of: {ALLOWED_AUDIO_TYPES}"
        )
    
    try:
        # Clean up any old files before processing
        cleanup_old_files()
        
        # Create unique filename for this upload
        unique_filename = f"{os.urandom(8).hex()}{Path(file.filename).suffix}"
        file_path = temp_dir / unique_filename
        
        # Read and validate file size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size too large. Maximum size is {MAX_FILE_SIZE/1024/1024}MB"
            )
        
        # Save file
        file_path.write_bytes(content)
        logger.info(f"Saved audio file: {file_path}")
        
        # Schedule cleanup
        if background_tasks:
            background_tasks.add_task(cleanup_file, file_path)
        
        # Transcribe
        logger.info("Starting transcription...")
        result = model.transcribe(str(file_path))
        logger.info("Transcription completed")
        
        # Process with DeepSeek
        logger.info("Processing with DeepSeek...")
        deepseek_client = DeepSeekClient()
        ai_response = await deepseek_client.process_voice_input(result["text"])
        logger.info("DeepSeek processing completed")
        
        # Convert result to response model
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
    """Check if the service is healthy and model is loaded"""
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded"
        )
    return {
        "status": "healthy",
        "model": "base",
        "temp_dir": str(temp_dir),
        "temp_dir_exists": temp_dir.exists()
    }

@app.get("/config", response_model=ModelConfig)
async def get_config():
    """Get current configuration"""
    return ModelConfig(
        model_name="base",
        max_file_size=MAX_FILE_SIZE,
        allowed_types=ALLOWED_AUDIO_TYPES
    )


from fastapi import FastAPI, Body
from pydantic import BaseModel

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