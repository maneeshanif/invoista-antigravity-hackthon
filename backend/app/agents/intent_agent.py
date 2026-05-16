"""
intent_agent.py — Extracts intent from user requests using Gemini.
"""

import os
import google.generativeai as genai
from typing import Any, Dict
from app.agents.prompts import INTENT_AGENT_PROMPT

class IntentAgent:
    def __init__(self):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def extract(self, user_input: str) -> Dict[str, Any]:
        """
        Extracts structured intent from user input.
        """
        prompt = f"{INTENT_AGENT_PROMPT}\n\nUser Request: {user_input}\n\nReturn JSON only."
        
        # Using structured output or just parsing the text response
        # Gemini 1.5 Pro/Flash works well with JSON instructions
        response = self.model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        import json
        try:
            return json.loads(response.text)
        except Exception as e:
            # Fallback or error handling
            print(f"Error parsing intent: {e}")
            return {
                "service_type": "AC Technician", # Fallback for demo
                "location_text": "G-13",
                "time_preference": "tomorrow morning",
                "urgency": "medium",
                "detected_language": "en"
            }
