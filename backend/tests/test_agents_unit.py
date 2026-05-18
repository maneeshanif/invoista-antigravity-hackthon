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
        mock_run.return_value = mock_result
        
        # Mock settings
        with patch("app.agents.orchestrator.settings") as mock_settings:
            mock_settings.MCP_SERVER_URL = "http://localhost:8001/sse"
            
            result = await run_workflow("Mujhe AC technician chahiye", "user-123", "sess-123")
            
            assert result["status"] == "success"
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
        # First call fails, second call succeeds (fallback)
        mock_run.side_effect = [
            APIStatusError("OpenAI down", response=MagicMock(), body={}),
            MagicMock(final_output="Fallback success summary")
        ]
        
        # Mock settings
        with patch("app.agents.orchestrator.settings") as mock_settings:
            mock_settings.MCP_SERVER_URL = "http://localhost:8001/sse"
            
            result = await run_workflow("Need help", "user-123", "sess-123")
            
            assert result["status"] == "success"
            assert "Fallback success" in result["summary"]
            assert mock_run.call_count == 2
