import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.supabase import supabase
from app.db.schemas import User
import uuid
import logging
from functools import lru_cache
from typing import Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)

async def fetch_email_from_clerk_api(clerk_user_id: str) -> Optional[str]:
    clerk_secret = settings.CLERK_SECRET_KEY
    if not clerk_secret:
        return None
    try:
        headers = {"Authorization": f"Bearer {clerk_secret}"}
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"https://api.clerk.com/v1/users/{clerk_user_id}", headers=headers)
            if r.status_code == 200:
                data = r.json()
                email_addresses = data.get("email_addresses", [])
                primary_email_id = data.get("primary_email_address_id")
                for email_data in email_addresses:
                    if email_data.get("id") == primary_email_id:
                        return email_data.get("email_address")
                if email_addresses:
                    return email_addresses[0].get("email_address")
    except Exception as e:
        logger.error(f"Error fetching user from Clerk API: {str(e)}")
    return None

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> User:
    token = credentials.credentials
    try:
        # Decode unverified to get issuer
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        iss = unverified_payload.get("iss")
        if not iss:
            raise HTTPException(status_code=401, detail="Token missing issuer")
        
        # Get JWKS from Clerk
        jwks_url = f"{iss.rstrip('/')}/.well-known/jwks.json"
        jwks_client = get_jwks_client(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Verify Token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=iss,
            options={"verify_aud": False}
        )
        
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Token missing subject")
            
        # Extract email from various possible sources
        email = None
        if payload:
            email = (
                payload.get("email") or 
                payload.get("email_address") or 
                payload.get("primary_email") or
                payload.get("primary_email_address")
            )
        if not email:
            email = request.headers.get("x-user-email")
        if not email:
            email = await fetch_email_from_clerk_api(clerk_user_id)

        # JIT Provisioning
        response = supabase.table("users").select("*").eq("clerk_user_id", clerk_user_id).execute()
        
        if response.data:
            user_data = response.data[0]
            # Update user if email has just been resolved but is missing in DB
            if email and not user_data.get("email"):
                try:
                    update_response = supabase.table("users").update({"email": email}).eq("id", user_data["id"]).execute()
                    if update_response.data:
                        user_data = update_response.data[0]
                except Exception as e:
                    logger.error(f"Error updating user email on JIT check: {str(e)}")
            return User(**user_data)
            
        # Create new user if not found
        new_user_data = {
            "id": str(uuid.uuid4()),
            "clerk_user_id": clerk_user_id,
            "name": "New User",
            "phone": "",
            "role": "user",
            "preferred_language": "en",
            "area": "",
            "lat": 0.0,
            "lng": 0.0,
            "email": email
        }
        
        try:
            insert_response = supabase.table("users").insert(new_user_data).execute()
            if insert_response.data:
                return User(**insert_response.data[0])
            raise Exception("Failed to insert user, no data returned")
        except Exception as e:
            # Handle potential unique constraint race condition
            retry_response = supabase.table("users").select("*").eq("clerk_user_id", clerk_user_id).execute()
            if retry_response.data:
                user_data = retry_response.data[0]
                if email and not user_data.get("email"):
                    try:
                        update_response = supabase.table("users").update({"email": email}).eq("id", user_data["id"]).execute()
                        if update_response.data:
                            user_data = update_response.data[0]
                    except Exception as ex:
                        logger.error(f"Error updating user email on retry JIT check: {str(ex)}")
                return User(**user_data)
            logger.error(f"Error provisioning user: {str(e)}")
            raise HTTPException(status_code=500, detail="Could not provision user")
            
    except jwt.PyJWKClientError as e:
        logger.error(f"JWKS fetch error: {str(e)}")
        raise HTTPException(status_code=401, detail="Unable to verify token keys")
    except jwt.InvalidTokenError as e:
        logger.error(f"Token invalid: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        logger.error(f"Unexpected auth error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication processing failed")

