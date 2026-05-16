"""
provider_tools.py — MCP tool: find_providers

Queries Supabase for providers matching the requested service type and area,
and fetches their available (non-booked) slots for the given date.
"""

from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from mcp_server.db import supabase_client


class FindProvidersInput(BaseModel):
    service_type: str = Field(..., description="Type of service requested, e.g. 'AC Technician'")
    area: str = Field(..., description="Area/neighbourhood where the service is needed, e.g. 'G-13'")
    slot_date: date = Field(..., description="Date for which to find available slots (YYYY-MM-DD)")


class ProviderSlot(BaseModel):
    slot_id: str
    slot_time: str


class ProviderResult(BaseModel):
    provider_id: str
    name: str
    category: str
    area: str
    lat: float
    lng: float
    rating: float
    jobs_completed: int
    price_range: str
    available_slots: list[ProviderSlot]


class FindProvidersOutput(BaseModel):
    providers: list[ProviderResult]
    total_found: int


def find_providers(input: FindProvidersInput) -> FindProvidersOutput:
    """
    Queries the database to find providers matching the service type and area,
    along with their available (un-booked) slots for the requested date.
    """
    providers_resp = (
        supabase_client.table("providers")
        .select("*")
        .ilike("category", f"%{input.service_type}%")
        .ilike("area", f"%{input.area}%")
        .eq("is_active", True)
        .execute()
    )

    providers_data: list[dict[str, Any]] = providers_resp.data or []
    results: list[ProviderResult] = []

    for provider in providers_data:
        slots_resp = (
            supabase_client.table("provider_slots")
            .select("id, slot_time")
            .eq("provider_id", provider["id"])
            .eq("slot_date", str(input.slot_date))
            .eq("is_booked", False)
            .execute()
        )
        available_slots = [
            ProviderSlot(slot_id=s["id"], slot_time=s["slot_time"])
            for s in (slots_resp.data or [])
        ]

        results.append(
            ProviderResult(
                provider_id=provider["id"],
                name=provider["name"],
                category=provider["category"],
                area=provider["area"],
                lat=provider["lat"],
                lng=provider["lng"],
                rating=provider["rating"],
                jobs_completed=provider["jobs_completed"],
                price_range=provider["price_range"],
                available_slots=available_slots,
            )
        )

    return FindProvidersOutput(providers=results, total_found=len(results))
