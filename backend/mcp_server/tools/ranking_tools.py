"""
ranking_tools.py — MCP tool: rank_providers

Ranks a list of discovered providers using the architecture formula:
  score = (rating_score * 0.40) + (proximity_score * 0.35) + (availability_score * 0.25)

All three sub-scores are normalised to [0, 1] before weighting.
"""

import math
from typing import Any

from pydantic import BaseModel, Field


class ProviderForRanking(BaseModel):
    provider_id: str
    name: str
    rating: float = Field(..., ge=0, le=5, description="Provider rating out of 5")
    lat: float
    lng: float
    available_slots_count: int = Field(..., ge=0)


class RankProvidersInput(BaseModel):
    providers: list[ProviderForRanking] = Field(..., min_length=1)
    user_lat: float = Field(..., description="User's latitude for proximity scoring")
    user_lng: float = Field(..., description="User's longitude for proximity scoring")


class RankedProvider(BaseModel):
    provider_id: str
    name: str
    total_score: float
    rating_score: float
    proximity_score: float
    availability_score: float
    rank: int


class RankProvidersOutput(BaseModel):
    ranked_providers: list[RankedProvider]


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns the great-circle distance in kilometres between two coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def rank_providers(input: RankProvidersInput) -> RankProvidersOutput:
    """
    Ranks providers using the formula:
      score = rating_score*0.40 + proximity_score*0.35 + availability_score*0.25

    - rating_score    : normalised rating in [0, 1]  (rating / 5.0)
    - proximity_score : inverse distance score — closer = higher; capped at 50 km
    - availability_score: normalised slot count in [0, 1] (slots / max_slots across set)
    """
    providers = input.providers

    # --- raw distances ---
    distances: list[float] = [
        _haversine_km(input.user_lat, input.user_lng, p.lat, p.lng)
        for p in providers
    ]

    max_distance = max(distances) if distances else 1.0
    max_slots = max((p.available_slots_count for p in providers), default=1) or 1

    scored: list[dict[str, Any]] = []
    for p, dist in zip(providers, distances):
        rating_score = p.rating / 5.0
        proximity_score = 1.0 - (dist / max(max_distance, 1.0))  # closer → higher
        availability_score = p.available_slots_count / max_slots

        total = (rating_score * 0.40) + (proximity_score * 0.35) + (availability_score * 0.25)

        scored.append(
            {
                "provider_id": p.provider_id,
                "name": p.name,
                "total_score": round(total, 4),
                "rating_score": round(rating_score, 4),
                "proximity_score": round(proximity_score, 4),
                "availability_score": round(availability_score, 4),
            }
        )

    # Sort descending by total score
    scored.sort(key=lambda x: x["total_score"], reverse=True)

    ranked = [
        RankedProvider(**item, rank=idx + 1)
        for idx, item in enumerate(scored)
    ]

    return RankProvidersOutput(ranked_providers=ranked)
