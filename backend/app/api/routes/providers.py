from fastapi import APIRouter, HTTPException
from typing import List, Optional
from app.db.schemas import Provider
from app.db.supabase import supabase

router = APIRouter()

@router.get("/", response_model=List[Provider])
async def list_providers(category: Optional[str] = None, area: Optional[str] = None):
    """
    List providers with optional filtering.
    """
    query = supabase.table("providers").select("*")
    if category:
        query = query.ilike("category", f"%{category}%")
    if area:
        query = query.ilike("area", f"%{area}%")
    
    response = query.execute()
    return response.data

@router.get("/{id}", response_model=Provider)
async def get_provider(id: str):
    """
    Get details for a specific provider.
    """
    response = supabase.table("providers").select("*").eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Provider not found")
    return response.data[0]
