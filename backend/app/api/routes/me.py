from fastapi import APIRouter, HTTPException
from app.db.schemas import User
from app.db.supabase import supabase

router = APIRouter()

@router.get("/", response_model=User)
async def get_my_profile():
    """
    Get current user profile data.
    """
    # For demo, using hardcoded user ID
    user_id = "11111111-1111-1111-1111-111111111111"
    
    response = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return response.data
