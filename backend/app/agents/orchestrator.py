"""
orchestrator.py — Main orchestrator for the AI Service Marketplace.

Coordinates between specialized agents and calls tools via the MCP client.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional

from app.agents.intent_agent import IntentAgent
from app.agents.mcp_client import get_mcp_client
from app.agents.prompts import ORCHESTRATOR_PROMPT


class AgentOrchestrator:
    def __init__(self, session_id: Optional[str] = None, user_id: Optional[str] = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.user_id = user_id or "11111111-1111-1111-1111-111111111111" # Default demo user
        self.intent_agent = IntentAgent()
        self.mcp_client = None

    async def run_workflow(self, user_input: str) -> Dict[str, Any]:
        """
        Runs the full multi-agent workflow.
        """
        start_time = time.time()
        self.mcp_client = await get_mcp_client()

        # Step 0: Create Session
        print(f"Creating session for input: {user_input[:20]}...")
        session_result = await self.mcp_client.call_tool(
            "create_session_tool", 
            {"input": {"user_id": self.user_id, "raw_input": user_input}}
        )
        self.session_id = session_result["session_id"]
        print(f"[{self.session_id}] Session created.")
        
        # Step 1: Intent Extraction
        print(f"[{self.session_id}] Step 1: Extracting intent...")
        intent_start = time.time()
        intent = await self.intent_agent.extract(user_input)
        intent_duration = int((time.time() - intent_start) * 1000)
        
        await self._trace(
            step=1,
            agent="IntentAgent",
            tool="gemini-extract",
            input={"user_input": user_input},
            output=intent,
            summary=f"Extracted intent: {intent.get('service_type')} in {intent.get('location_text')}",
            duration=intent_duration
        )

        # Step 2: Discovery
        print(f"[{self.session_id}] Step 2: Finding providers...")
        disc_start = time.time()
        discovery_args = {
            "input": {
                "service_type": intent.get("service_type", "AC Technician"),
                "area": intent.get("location_text", "G-13"),
                "slot_date": "2026-05-17" # Demo date
            }
        }
        discovery_result = await self.mcp_client.call_tool("find_providers_tool", discovery_args)
        disc_duration = int((time.time() - disc_start) * 1000)
        
        await self._trace(
            step=2,
            agent="DiscoveryAgent",
            tool="find_providers_tool",
            input=discovery_args,
            output=discovery_result,
            summary=f"Found {discovery_result.get('total_found', 0)} providers.",
            duration=disc_duration
        )

        if not discovery_result.get("providers"):
            await self.mcp_client.call_tool(
                "update_session_status_tool",
                {"input": {"session_id": self.session_id, "status": "failed"}}
            )
            return {"status": "failed", "message": "No providers found.", "session_id": self.session_id}

        # Step 3: Ranking
        print(f"[{self.session_id}] Step 3: Ranking providers...")
        rank_start = time.time()
        providers_for_ranking = []
        for p in discovery_result["providers"]:
            providers_for_ranking.append({
                "provider_id": p["provider_id"],
                "name": p["name"],
                "rating": p["rating"],
                "lat": p["lat"],
                "lng": p["lng"],
                "available_slots_count": len(p["available_slots"])
            })
        
        ranking_args = {
            "input": {
                "providers": providers_for_ranking,
                "user_lat": 33.6491, # Demo user lat
                "user_lng": 72.9818  # Demo user lng
            }
        }
        ranking_result = await self.mcp_client.call_tool("rank_providers_tool", ranking_args)
        rank_duration = int((time.time() - rank_start) * 1000)
        
        await self._trace(
            step=3,
            agent="RankingAgent",
            tool="rank_providers_tool",
            input=ranking_args,
            output=ranking_result,
            summary=f"Ranked {len(ranking_result.get('ranked_providers', []))} providers. Top: {ranking_result['ranked_providers'][0]['name']}",
            duration=rank_duration
        )

        # Step 4: Booking
        print(f"[{self.session_id}] Step 4: Creating booking...")
        book_start = time.time()
        top_provider = ranking_result["ranked_providers"][0]
        original_provider = next(p for p in discovery_result["providers"] if p["provider_id"] == top_provider["provider_id"])
        selected_slot = original_provider["available_slots"][0]
        
        booking_args = {
            "input": {
                "user_id": self.user_id,
                "provider_id": top_provider["provider_id"],
                "slot_id": selected_slot["slot_id"]
            }
        }
        booking_result = await self.mcp_client.call_tool("create_booking_tool", booking_args)
        book_duration = int((time.time() - book_start) * 1000)
        
        await self._trace(
            step=4,
            agent="BookingAgent",
            tool="create_booking_tool",
            input=booking_args,
            output=booking_result,
            summary=f"Created booking {booking_result.get('booking_id')} with code {booking_result.get('confirmation_code')}",
            duration=book_duration
        )

        # Step 5: Follow-ups
        print(f"[{self.session_id}] Step 5: Scheduling follow-ups...")
        follow_start = time.time()
        followup_args = {
            "input": {
                "booking_id": booking_result["booking_id"],
                "user_id": self.user_id,
                "slot_datetime": "2026-05-17T09:00:00Z" # Demo slot time
            }
        }
        followup_result = await self.mcp_client.call_tool("schedule_followups_tool", followup_args)
        follow_duration = int((time.time() - follow_start) * 1000)
        
        await self._trace(
            step=5,
            agent="FollowupAgent",
            tool="schedule_followups_tool",
            input=followup_args,
            output=followup_result,
            summary=f"Scheduled {len(followup_result.get('scheduled', []))} notifications.",
            duration=follow_duration
        )

        # Step 6: Finalize Session
        await self.mcp_client.call_tool(
            "update_session_status_tool",
            {"input": {
                "session_id": self.session_id, 
                "status": "completed",
                "detected_language": intent.get("detected_language", "en")
            }}
        )

        total_duration = int((time.time() - start_time) * 1000)
        print(f"[{self.session_id}] Workflow completed in {total_duration}ms.")

        return {
            "status": "success",
            "session_id": self.session_id,
            "booking": booking_result,
            "summary": f"Your booking with {top_provider['name']} is confirmed! Code: {booking_result['confirmation_code']}"
        }

    async def _trace(self, step: int, agent: str, tool: str, input: Any, output: Any, summary: str, duration: int):
        """Helper to write trace logs via MCP."""
        trace_args = {
            "input": {
                "session_id": self.session_id,
                "step": step,
                "agent_name": agent,
                "tool_used": tool,
                "input_payload": input,
                "output_payload": output,
                "output_summary": summary,
                "duration_ms": duration
            }
        }
        try:
            await self.mcp_client.call_tool("write_trace_log_tool", trace_args)
        except Exception as e:
            print(f"Failed to write trace log: {e}")
