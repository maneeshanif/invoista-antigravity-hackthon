# Feature Specification: Production User Authentication & Sync

## 1. Objective
Currently, backend endpoints (`/me/*`, etc.) are bypassing authentication and using a hardcoded dummy `user_id`. When a new user signs up on the React Native frontend via Clerk, they get a Clerk account but are not represented in our Supabase `users` table, nor is their session securely verified.

The objective is to replace the dummy mechanism with a production-ready authentication flow that securely verifies the Clerk JWT and synchronizes the Clerk user into our database.

## 2. Mechanism Decision: JIT (Just-In-Time) Provisioning

**Decision**: We will implement **Just-In-Time (JIT) User Provisioning** combined with JWT validation, rather than Webhooks. 

**Why JIT is better for this MVP/Hackathon:**
- **No Ngrok/Tunnels Required**: Webhooks require exposing the local backend to the internet via ngrok for Clerk to reach it. JIT happens entirely via standard API requests from the frontend.
- **Immediate Consistency**: The user is guaranteed to exist in our database the moment they make their first authenticated API request.
- **Simpler Infrastructure**: Removes the need to maintain Svix signature verification and webhook routing.

## 3. Implementation Plan

### 3.1 Verify Clerk JWT via FastAPI Dependency
We will create a new FastAPI dependency (e.g., `get_current_user` in `backend/app/api/dependencies.py` or similar).
1. Extract the `Authorization: Bearer <token>` from the request header.
2. Fetch the Clerk JWKS (JSON Web Key Set) from our Clerk instance (`https://<clerk-domain>/.well-known/jwks.json`).
3. Decode and verify the JWT using `PyJWT`.
4. Extract the `sub` claim, which contains the `clerk_user_id`.

### 3.2 JIT User Creation in Supabase
Once the JWT is validated and we have the `clerk_user_id`:
1. Query the Supabase `users` table: `SELECT * FROM users WHERE clerk_user_id = <sub_claim>`.
2. **If found**: Return the internal `uuid` of the user.
3. **If not found (New User)**: 
   - Insert a new row into the `users` table with the `clerk_user_id`.
   - Populate other required fields (name, phone, area) with safe defaults or data extracted from the JWT claims if available.
   - Return the newly created internal `uuid`.

### 3.3 Endpoint Refactoring
Update all endpoints that require the current user (e.g., `/api/v1/me/`, `/api/v1/me/bookings`, `/api/v1/me/notifications`, `/api/v1/requests/`) to use the new `get_current_user` dependency instead of hardcoded strings.

```python
# Example Refactor
@router.get("/bookings", response_model=List[Booking])
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    response = supabase.table("bookings").select("*").eq("user_id", current_user.id).execute()
    return response.data
```

## 4. Required Dependencies
- `PyJWT` (for decoding tokens)
- `cryptography` (for RSA key verification)
- Clerk Publisher Key / Secret Key added to `backend/.env`.

## 5. Security & Edge Cases
- **Token Caching**: To avoid fetching the JWKS on every single request, the JWKS should be cached in memory (e.g., using `functools.lru_cache` or a PyJWT JWK client with caching enabled).
- **Concurrency**: If two requests hit simultaneously for a brand new user, Supabase might throw a unique constraint error on `clerk_user_id`. We should handle this gracefully by catching the constraint error and re-fetching the user.
