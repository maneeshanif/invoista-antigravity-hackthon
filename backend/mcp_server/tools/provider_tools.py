"""
provider_tools.py — MCP tool: find_providers

Queries Supabase for providers matching the requested service type and area,
and fetches their available (non-booked) slots for the given date.

Area matching is intentionally flexible: only the first token of the area string
(split on space or comma) is used in the ILIKE query, so 'G-13 Islamabad',
'G-13, Islamabad', and 'G-13' all produce the same search.
"""

import uuid
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


def _extract_area_token(area: str) -> str:
    """Extract the first meaningful area token (e.g. 'G-13' from 'G-13 Islamabad')."""
    import re
    # Split on comma or whitespace, return first non-empty part
    parts = re.split(r"[,\s]+", area.strip())
    return parts[0] if parts else area


AREA_COORDINATES = {
    "G-13": (33.6852, 73.0147),
    "E-11": (33.6667, 73.0143),
    "F-11": (33.7168, 73.0348),
    "G-11": (33.6428, 73.0587),
    "D-12": (33.6913, 73.0030),
    "F-8": (33.6961, 73.0905),
    "Bahria Town": (33.6758, 73.0101),
    "Blue Area": (33.6780, 73.0634),
}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_providers(input: FindProvidersInput) -> FindProvidersOutput:
    """
    Queries the database to find providers matching the service type and area,
    along with their available (un-booked) slots for the requested date.

    If no providers match the area, falls back to a global category search and
    ranks results by distance (haversine) and rating. If still none, returns a
    static demo provider fallback.
    """
    # 1. Primary Strict Search
    area_token = _extract_area_token(input.area)
    providers_resp = (
        supabase_client.table("providers")
        .select("*")
        .ilike("category", f"%{input.service_type}%")
        .ilike("area", f"%{area_token}%")
        .eq("is_active", True)
        .execute()
    )
    providers_data = providers_resp.data or []

    # 2. Secondary Global Search Fallback
    if not providers_data:
        providers_resp = (
            supabase_client.table("providers")
            .select("*")
            .ilike("category", f"%{input.service_type}%")
            .eq("is_active", True)
            .execute()
        )
        providers_data = providers_resp.data or []

    results: list[ProviderResult] = []

    # 3. Fetch slots & filter
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

        if available_slots:
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

    # 4. Proximity Ranking
    target_coords = None
    for k, coords in AREA_COORDINATES.items():
        if k.lower() in input.area.lower():
            target_coords = coords
            break

    if target_coords and results:
        # Calculate distances & rank using a combination of rating & distance
        scored_providers = []
        user_lat, user_lng = target_coords
        for p in results:
            dist = _haversine_km(user_lat, user_lng, p.lat, p.lng)
            # Normalise rating (0-1) and proximity (0-1)
            rating_score = p.rating / 5.0
            proximity_score = 1.0 - (dist / max(dist + 5.0, 20.0))  # Cap decay gracefully
            total_score = (rating_score * 0.5) + (proximity_score * 0.5)
            scored_providers.append((total_score, p))

        scored_providers.sort(key=lambda x: x[0], reverse=True)
        results = [p for _, p in scored_providers]

    # 5. Demo Fallback (Safe creation handled in create_booking)
    if not results:
        default_provider_id = "00000000-0000-0000-0000-000000000000"  # Static Demo Provider ID
        default_slot_id = "00000000-0000-0000-0000-000000000001"      # Static Demo Slot ID
        results.append(
            ProviderResult(
                provider_id=default_provider_id,
                name="Demo Premium Provider",
                category=input.service_type,
                area=input.area,
                lat=33.6852,
                lng=73.0147,
                rating=5.0,
                jobs_completed=10,
                price_range="$$",
                available_slots=[
                    ProviderSlot(slot_id=default_slot_id, slot_time="09:00 AM")
                ],
            )
        )

    return FindProvidersOutput(providers=results, total_found=len(results))

