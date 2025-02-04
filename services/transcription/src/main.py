from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import uvicorn
from fastApiTypes import TranscriptionResponse, TranscriptionSegment, ErrorResponse, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE

# Global model variable
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load the model
    global model
    try:
        model = whisper.load_model("base")
        yield
    except Exception as e:
        print(f"Error loading Whisper model: {e}")
        raise
    finally:
        # Shutdown: Could add cleanup code here if needed
        pass

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

@app.post("/transcribe", response_model=TranscriptionResponse, responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def transcribe_audio(file: UploadFile = File(...)):
    # Validate file type
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type not supported. Must be one of: {ALLOWED_AUDIO_TYPES}"
        )
    
    try:
        # Create temp file with proper extension
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            # Read and validate file size
            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size too large. Maximum size is {MAX_FILE_SIZE/1024/1024}MB"
                )
            
            # Write and process file
            temp_file.write(content)
            temp_file.flush()
            
            # Transcribe
            result = model.transcribe(temp_file.name)
            
            # Cleanup
            os.unlink(temp_file.name)
            
            # Convert result to our response model
            response = TranscriptionResponse(
                text=result["text"],
                language=result["language"],
                segments=[TranscriptionSegment(**segment) for segment in result.get("segments", [])]
            )
            
            return response
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio: {str(e)}"
        )

@app.get("/health")
async def health_check():
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded"
        )
    return {
        "status": "healthy",
        "model": "base"
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )