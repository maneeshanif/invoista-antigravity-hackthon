from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    debug=settings.DEBUG,
)

# Global CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "0.1.0"}

# Include the main router
app.include_router(api_router, prefix="/api/v1")

# Include the legacy Vapi router prefix directly on the app instance
from app.api.routes import vapi
app.include_router(vapi.router, prefix="/api/vapi", tags=["Vapi Legacy"])

