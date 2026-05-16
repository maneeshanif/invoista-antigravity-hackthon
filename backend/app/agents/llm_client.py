"""
llm_client.py — Centralised LLM provider with OpenAI primary and Gemini fallback.

Usage in any agent:
    from app.agents.llm_client import get_model
    agent = Agent(name="...", model=get_model(), ...)

Fallback behaviour:
    - Primary:  gpt-4o-mini via OpenAI API
    - Fallback: gemini-2.0-flash via Google's OpenAI-compatible endpoint
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
    """Build Gemini 2.0 Flash via Google's OpenAI-compatible API."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set in .env file or environment variables.")
    client = AsyncOpenAI(
        api_key=settings.GEMINI_API_KEY,
        base_url=settings.GEMINI_BASE_URL,
    )
    return OpenAIChatCompletionsModel(model="gemini-2.5-flash", openai_client=client)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_model() -> OpenAIChatCompletionsModel:
    """
    Return the primary OpenAI model (gpt-4o-mini).
    Use this in every Agent(model=get_model(), ...) call.
    The orchestrator handles fallback via get_fallback_model() on APIStatusError.
    """
    return _build_openai_model()


def get_fallback_model() -> OpenAIChatCompletionsModel:
    """
    Return the Gemini 2.0 Flash fallback model.
    Called by the orchestrator when the primary raises APIStatusError
    with a code in FALLBACK_STATUS_CODES.
    """
    return _build_gemini_model()
