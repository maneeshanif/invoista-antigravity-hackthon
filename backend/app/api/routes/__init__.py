from fastapi import APIRouter

from app.api.routes import requests

api_router = APIRouter()

api_router.include_router(requests.router, tags=["Agents"])
