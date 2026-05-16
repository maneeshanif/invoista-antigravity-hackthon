"""
intent_agent.py — Extracts intent from user requests using Gemini.
"""

import os
import google.generativeai as genai
from typing import Any, Dict, Optional
from app.agents.prompts import INTENT_AGENT_PROMPT

import logging

logger = logging.getLogger(__name__)

class IntentAgent:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def extract(self, user_input: str) -> Optional[Dict[str, Any]]:
        """
        Extracts structured intent from user input.
        Returns the intent dictionary or None if extraction/parsing fails.
        """
        prompt = f"{INTENT_AGENT_PROMPT}\n\nUser Request: {user_input}\n\nReturn JSON only."
        
        import asyncio
        import json
        
        try:
            # Wrap the synchronous SDK call in a thread to avoid blocking the event loop
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    self.model.generate_content,
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                ),
                timeout=10.0
            )
            return json.loads(response.text)
        except asyncio.TimeoutError:
            logger.error("Intent extraction timed out after 10s.")
        except Exception as e:
            logger.error(f"Error extracting or parsing intent: {e}", exc_info=True)

        return None
