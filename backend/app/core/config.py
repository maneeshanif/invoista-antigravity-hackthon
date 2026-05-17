import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Get the project root directory (one level up from app/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Antigravity Hackathon"
    DEBUG: bool = False
    
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    
    HF_TOKEN: str = ""
    HF_BASE_URL: str = "https://router.huggingface.co/v1"

    MCP_SERVER_URL: str = "http://localhost:8001/sse"
    MCP_PORT: int = 8001
    
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    
    REDIS_URL: str = "redis://localhost:6379"
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"), 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()
