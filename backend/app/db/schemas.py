from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import date, datetime
import uuid

# User Schemas
class UserBase(BaseModel):
    clerk_user_id: str
    name: str
    phone: str
    role: str
    preferred_language: str
    area: str
    lat: float
    lng: float
    email: Optional[str] = None

class User(UserBase):
    id: uuid.UUID

# Provider Schemas
class ProviderBase(BaseModel):
    name: str
    category: str
    area: str
    lat: float
    lng: float
    rating: float
    jobs_completed: int
    price_range: str
    is_active: bool

class Provider(ProviderBase):
    id: uuid.UUID

# Provider Slot Schemas
class ProviderSlot(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    slot_date: date
    slot_time: str
    is_booked: bool

# Booking Schemas
class BookingBase(BaseModel):
    provider_id: uuid.UUID
    user_id: uuid.UUID
    slot_id: uuid.UUID
    status: str
    confirmation_code: str
    booked_at: datetime
    slot_date: Optional[date] = None
    slot_time: Optional[str] = None

class Booking(BookingBase):
    id: uuid.UUID

class BookingCreate(BaseModel):
    provider_id: uuid.UUID
    slot_id: uuid.UUID

# Session Schemas
class SessionBase(BaseModel):
    user_id: uuid.UUID
    raw_input: str
    detected_language: Optional[str] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    hitl_status: Optional[str] = None
    hitl_state: Optional[Dict[str, Any]] = None
    provider_summary: Optional[Dict[str, Any]] = None

class Session(SessionBase):
    id: uuid.UUID

# Request Schemas
class RequestCreate(BaseModel):
    message: str
    user_id: Optional[str] = None

class RequestResponse(BaseModel):
    session_id: str
    status: str

# Trace Log Schemas
class TraceLog(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    step: int
    agent_name: str
    tool_used: Optional[str] = None
    input_payload: Optional[Dict[str, Any]] = None
    output_payload: Optional[Dict[str, Any]] = None
    output_summary: Optional[str] = None
    duration_ms: Optional[int] = None

# Notification Schemas
class Notification(BaseModel):
    id: uuid.UUID
    booking_id: uuid.UUID
    user_id: uuid.UUID
    type: str
    message: str
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    status: str

# Followup Schemas
class FollowupTrigger(BaseModel):
    booking_id: uuid.UUID
