import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.agents.orchestrator import run_workflow
from app.agents.discovery_agent import create_discovery_agent
import json
import uuid

@pytest.mark.asyncio
async def test_agent_creation():
    # Mock MCP server and model
    mock_mcp = MagicMock()
    with patch("app.agents.discovery_agent.get_model") as mock_get_model:
        mock_get_model.return_value = "gpt-4o-mini"
        agent = create_discovery_agent(mock_mcp)
        assert agent.name == "DiscoveryAgent"
        assert "Discovery Agent" in agent.instructions

@pytest.mark.asyncio
async def test_run_workflow_success():
    # Mock the Runner and Agents to avoid real API calls
    with patch("app.agents.orchestrator.Runner.run", new_callable=AsyncMock) as mock_run, \
         patch("app.agents.orchestrator.MCPServerSse") as mock_mcp, \
         patch("app.agents.orchestrator.get_model") as mock_get_model, \
         patch("app.agents.orchestrator.create_session") as mock_create_sess, \
         patch("app.agents.orchestrator.update_session_status") as mock_update_sess:
        
        mock_get_model.return_value = "gpt-4o-mini"
        mock_result = MagicMock()
        mock_result.final_output = "Booking confirmed for AC technician."
        mock_result.interruptions = []
        mock_run.return_value = mock_result
        
        # Mock settings
        with patch("app.agents.orchestrator.settings") as mock_settings:
            mock_settings.MCP_SERVER_URL = "http://localhost:8001/sse"
            
            result = await run_workflow("Mujhe AC technician chahiye", "user-123", "sess-123")
            
            assert result["status"] == "completed"
            assert "Booking confirmed" in result["summary"]
            assert mock_run.called

@pytest.mark.asyncio
async def test_run_workflow_fallback():
    # Test fallback logic when primary model fails
    with patch("app.agents.orchestrator.Runner.run", new_callable=AsyncMock) as mock_run, \
         patch("app.agents.orchestrator.MCPServerSse") as mock_mcp, \
         patch("app.agents.orchestrator.get_model") as mock_get_model, \
         patch("app.agents.orchestrator.get_fallback_model") as mock_get_fallback, \
         patch("app.agents.orchestrator.create_discovery_agent") as mock_create_agent, \
         patch("app.agents.orchestrator.create_ranking_agent") as mock_create_rank, \
         patch("app.agents.orchestrator.create_booking_agent") as mock_create_book, \
         patch("app.agents.orchestrator.create_followup_agent") as mock_create_follow, \
         patch("app.agents.orchestrator.create_session") as mock_create_sess, \
         patch("app.agents.orchestrator.update_session_status") as mock_update_sess:
        
        mock_get_model.return_value = "gpt-4o-mini"
        mock_get_fallback.return_value = "gemini-1.5-flash"
        
        # Mock agent returns
        mock_create_agent.return_value = MagicMock()
        mock_create_rank.return_value = MagicMock()
        mock_create_book.return_value = MagicMock()
        mock_create_follow.return_value = MagicMock()
        
        from openai import APIStatusError
        fallback_res = MagicMock()
        fallback_res.final_output = "Fallback success summary"
        fallback_res.interruptions = []
        # First call fails, second call succeeds (fallback)
        mock_run.side_effect = [
            APIStatusError("OpenAI down", response=MagicMock(), body={}),
            fallback_res
        ]
        
        # Mock settings
        with patch("app.agents.orchestrator.settings") as mock_settings:
            mock_settings.MCP_SERVER_URL = "http://localhost:8001/sse"
            
            result = await run_workflow("Need help", "user-123", "sess-123")
            
            assert result["status"] == "completed"
            assert "Fallback success" in result["summary"]
            assert mock_run.call_count == 2


@pytest.mark.asyncio
async def test_resume_workflow_interruption_again():
    # Test resume_workflow when it pauses again for booking approval
    from app.agents.orchestrator import resume_workflow
    
    with patch("app.agents.orchestrator.Runner.run", new_callable=AsyncMock) as mock_run, \
         patch("app.agents.orchestrator.MCPServerSse") as mock_mcp, \
         patch("app.agents.orchestrator.get_model") as mock_get_model, \
         patch("app.agents.orchestrator.RunState.from_json", new_callable=AsyncMock) as mock_run_state_from_json, \
         patch("app.agents.orchestrator.update_session_status") as mock_update_sess:
        
        mock_get_model.return_value = "gpt-4o-mini"
        
        # Mock interruption returned from Runner.run
        mock_interruption = MagicMock()
        mock_interruption.arguments = '{"provider_id": "p-123", "slot_id": "s-123", "provider_name": "Test Provider"}'
        
        mock_result = MagicMock()
        mock_result.interruptions = [mock_interruption]
        mock_state = MagicMock()
        mock_state.to_json.return_value = {"state": "dummy"}
        mock_state.get_interruptions.return_value = [mock_interruption]
        mock_result.to_state.return_value = mock_state
        mock_run_state_from_json.return_value = mock_state
        mock_run.return_value = mock_result
        
        # Mock settings
        with patch("app.agents.orchestrator.settings") as mock_settings:
            mock_settings.MCP_SERVER_URL = "http://localhost:8001/sse"
            
            result = await resume_workflow(
                session_id="sess-123",
                approved=False,
                state_payload={"dummy": True},
                user_id="user-123",
                rejection_message="Find someone cheaper"
            )
            
            assert result["status"] == "pending_approval"
            assert result["state_payload"] == {"state": "dummy"}
            assert result["provider_summary"]["provider_name"] == "Test Provider"
            assert mock_run.called

