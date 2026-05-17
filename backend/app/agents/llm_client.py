"""
llm_client.py — Centralised LLM provider with OpenAI primary and Gemini fallback.

Usage in any agent:
    from app.agents.llm_client import get_model
    agent = Agent(name="...", model=get_model(), ...)

Fallback behaviour:
    - Primary:  gpt-4o-mini via OpenAI API
    - Fallback 1: gemini-2.5-flash via Google's OpenAI-compatible endpoint
    - Fallback 2: moonshotai/Kimi-K2.6:novita via Hugging Face
    - Triggers on: APIStatusError with status 400, 401, 429, 500, 503
"""

from openai import AsyncOpenAI, APIStatusError
from agents import OpenAIChatCompletionsModel
from app.core.config import settings

# Status codes that trigger an automatic fallback to Gemini
FALLBACK_STATUS_CODES = {400, 401, 429, 500, 503}


# ---------------------------------------------------------------------------
# Internal model builders
# ---------------------------------------------------------------------------

def _build_openai_model() -> OpenAIChatCompletionsModel:
    """Build the primary gpt-4o-mini model via OpenAI API."""
    print(f"DEBUG: OPENAI_API_KEY length: {len(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else 0}")
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not set in .env file or environment variables.")
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return OpenAIChatCompletionsModel(model="gpt-4o-mini", openai_client=client)


def _build_gemini_model() -> OpenAIChatCompletionsModel:
    """Build Gemini 2.5 Flash via Google's OpenAI-compatible API."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in .env file or environment variables.")
    client = AsyncOpenAI(
        api_key=settings.GEMINI_API_KEY,
        base_url=settings.GEMINI_BASE_URL,
    )
    return OpenAIChatCompletionsModel(model="gemini-2.5-flash", openai_client=client)

def _build_hf_model() -> OpenAIChatCompletionsModel:
    """Build Hugging Face Kimi model via HF's OpenAI-compatible API."""
    if not settings.HF_TOKEN:
        raise ValueError("HF_TOKEN is not set in .env file or environment variables.")
    client = AsyncOpenAI(
        api_key=settings.HF_TOKEN,
        base_url=settings.HF_BASE_URL,
    )
    return OpenAIChatCompletionsModel(model="deepseek-ai/DeepSeek-V4-Pro:novita", openai_client=client)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_model() -> OpenAIChatCompletionsModel:
    """
    Return the primary HF model.
    """
    # return _build_openai_model()
    return _build_hf_model()


def get_fallback_model() -> OpenAIChatCompletionsModel:
    """
    Return the HF model.
    """
    # return _build_gemini_model()
    return _build_hf_model()

def get_secondary_fallback_model() -> OpenAIChatCompletionsModel:
    """
    Return the HF Kimi fallback model.
    """
    return _build_hf_model()
