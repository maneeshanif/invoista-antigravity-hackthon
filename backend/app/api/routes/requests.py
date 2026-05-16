from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.orchestrator import run_workflow
import uuid

router = APIRouter()

class RequestInput(BaseModel):
    user_id: str = str(uuid.uuid4())
    user_request: str

@router.post("/requests")
async def create_request(input_data: RequestInput):
    """
    Endpoint to trigger the full agent orchestration workflow.
    """
    try:
        result = await run_workflow(
            user_input=input_data.user_request,
            user_id=input_data.user_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
