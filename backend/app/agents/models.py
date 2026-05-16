"""
models.py — Pydantic output schemas for structured agent responses.
"""
from pydantic import BaseModel, Field


class IntentResult(BaseModel):
    service_type: str = Field(..., description="e.g. 'AC Technician', 'Plumber'")
    location_text: str = Field(..., description="Area name, e.g. 'G-13'")
    time_preference: str = Field(default="tomorrow morning", description="e.g. 'tomorrow morning'")
    urgency: str = Field(default="medium", description="low / medium / high")
    detected_language: str = Field(default="en", description="en / ur / roman_urdu")
