from pydantic import BaseModel
from typing import List, Optional

class TranscriptionSegment(BaseModel):
    id: int
    seek: int
    start: float
    end: float
    text: str
    tokens: List[int]
    temperature: float
    avg_logprob: float
    compression_ratio: float
    no_speech_prob: float

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    segments: List[TranscriptionSegment]
    error: Optional[str] = None

class ErrorResponse(BaseModel):
    detail: str

# Configuration
ALLOWED_AUDIO_TYPES = [
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/webm',
    'video/webm',
    'video/mp4'
]

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB