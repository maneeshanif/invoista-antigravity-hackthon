import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import uuid
from app.main import app
from app.api.dependencies import get_current_user
from app.db.schemas import User

client = TestClient(app)

@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = lambda: User(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        clerk_user_id="clerk-test-id",
        name="Test User",
        phone="123456",
        role="user",
        preferred_language="en",
        area="G-13",
        lat=33.0,
        lng=72.0,
        email="test_user@example.com"
    )
    yield
    app.dependency_overrides.clear()

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}

def test_create_request():
    # Mock start_workflow and create_session to avoid real LLM/MCP/DB calls
    with patch("app.api.routes.requests.start_workflow") as mock_start_workflow, \
         patch("app.api.routes.requests.create_session") as mock_create_session:
        mock_start_workflow.return_value = {"status": "completed", "session_id": "test-uuid", "summary": "done"}
        
        response = client.post(
            "/api/v1/requests/",
            json={"message": "Mujhe AC technician chahiye", "user_id": "11111111-1111-1111-1111-111111111111"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["status"] == "started"

@patch("app.api.routes.requests.supabase")
def test_get_request_status(mock_supabase):
    # Mock supabase response
    session_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    mock_response = MagicMock()
    mock_response.data = [{
        "id": session_id,
        "user_id": user_id,
        "raw_input": "input",
        "status": "completed",
        "detected_language": "en",
        "started_at": "2023-01-01T00:00:00"
    }]
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
    
    response = client.get(f"/api/v1/requests/{session_id}")
    assert response.status_code == 200
    assert response.json()["id"] == session_id

def test_get_request_status_not_found():
    with patch("app.api.routes.requests.supabase") as mock_supabase:
        mock_response = MagicMock()
        mock_response.data = []
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        response = client.get(f"/api/v1/requests/{uuid.uuid4()}")
        assert response.status_code == 404

def test_list_providers():
    with patch("app.api.routes.providers.supabase") as mock_supabase:
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "name": "Provider 1",
            "category": "AC",
            "area": "G-13",
            "lat": 33.0,
            "lng": 72.0,
            "rating": 4.5,
            "jobs_completed": 10,
            "price_range": "$$",
            "is_active": True
        }]
        mock_supabase.table.return_value.select.return_value.execute.return_value = mock_response
        
        response = client.get("/api/v1/providers/")
        assert response.status_code == 200
        assert len(response.json()) == 1

def test_admin_list_traces():
    with patch("app.api.routes.admin.supabase") as mock_supabase:
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "session_id": str(uuid.uuid4()),
            "step": 1,
            "agent_name": "Orchestrator",
            "tool_used": "find_providers_tool",
            "output_summary": "Found providers"
        }]
        mock_supabase.table.return_value.select.return_value.order.return_value.order.return_value.execute.return_value = mock_response
        
        response = client.get("/api/v1/admin/traces")
        assert response.status_code == 200
        assert len(response.json()) == 1

def test_admin_list_sessions():
    with patch("app.api.routes.admin.supabase") as mock_supabase:
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "raw_input": "hello",
            "status": "completed",
            "started_at": "2023-01-01T00:00:00"
        }]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = mock_response
        
        response = client.get("/api/v1/admin/sessions")
        assert response.status_code == 200
        assert len(response.json()) == 1

def test_admin_list_bookings():
    with patch("app.api.routes.admin.supabase") as mock_supabase:
        mock_response = MagicMock()
        mock_response.data = [{
            "id": str(uuid.uuid4()),
            "provider_id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "slot_id": str(uuid.uuid4()),
            "status": "confirmed",
            "confirmation_code": "ABC123",
            "booked_at": "2023-01-01T00:00:00"
        }]
        mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value = mock_response
        
        response = client.get("/api/v1/admin/bookings")
        assert response.status_code == 200
        assert len(response.json()) == 1
