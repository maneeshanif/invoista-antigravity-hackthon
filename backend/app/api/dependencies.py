import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.supabase import supabase
from app.db.schemas import User
import uuid
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> User:
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
            
        # JIT Provisioning
        response = supabase.table("users").select("*").eq("clerk_user_id", clerk_user_id).execute()
        
        if response.data:
            return User(**response.data[0])
            
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
            "lng": 0.0
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
                return User(**retry_response.data[0])
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
