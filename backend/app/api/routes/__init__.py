from fastapi import APIRouter
from app.api.routes import (
    requests,
    traces,
    providers,
    bookings,
    followups,
    me,
    admin,
    vapi,
    notifications,
)

api_router = APIRouter()

api_router.include_router(requests.router, prefix="/requests", tags=["Requests"])
api_router.include_router(traces.router, prefix="/requests", tags=["Traces"]) # Shared prefix for sub-routes
api_router.include_router(providers.router, prefix="/providers", tags=["Providers"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(followups.router, prefix="/followups", tags=["Followups"])
api_router.include_router(me.router, prefix="/me", tags=["Me"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(vapi.router, prefix="/vapi", tags=["Vapi"])

