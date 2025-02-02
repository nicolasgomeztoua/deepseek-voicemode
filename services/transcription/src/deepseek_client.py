# deepseek_client.py
import os
from openai import OpenAI
from typing import Optional
import logging
from fastApiTypes import DeepSeekResponse

logger = logging.getLogger(__name__)

class DeepSeekClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("DeepSeek API key is required")
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com"
        )

    async def process_voice_input(self, text: str) -> DeepSeekResponse:
        """
        Process voice input through DeepSeek API using chat completions
        
        Args:
            text: The transcribed text to process
        
        Returns:
            DeepSeekResponse object containing the AI's response
        """
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant responding to voice input"},
                    {"role": "user", "content": text}
                ],
                stream=False
            )
            
            return DeepSeekResponse(
                response=response.choices[0].message.content
            )

        except Exception as e:
            logger.error(f"Error processing DeepSeek request: {str(e)}")
            return DeepSeekResponse(
                error=f"Error processing request: {str(e)}",
                response=""
            )