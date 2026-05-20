"""
vapi.py — FastAPI router handling Vapi webhook calls for custom tools.
It provides two primary tool implementations:
* `find_providers` – searches providers and returns a structured list including UUIDs and available slots.
* `create_booking` – creates a booking, sends confirmation emails, and schedules reminder/completion follow‑up notifications.
The router is mounted twice (see backend/app/main.py) to support both legacy `/api/vapi/...` and current `/api/v1/vapi/...` URLs.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
import time

# MCP tool imports
from mcp_server.tools.provider_tools import find_providers, FindProvidersInput
from mcp_server.tools.booking_tools import create_booking, CreateBookingInput
from mcp_server.tools.trace_tools import create_session, CreateSessionInput, write_trace_log, WriteTraceLogInput
from mcp_server.tools.notification_tools import (
    send_booking_emails,
    SendBookingEmailsInput,
    schedule_followups,
    ScheduleFollowupsInput,
)

router = APIRouter()

# ─── Vapi Webhook Payload Schemas ───────────────────────────────────────────

class FunctionDetails(BaseModel):
    name: str
    arguments: Dict[str, Any]

class ToolCall(BaseModel):
    id: str
    type: str
    function: FunctionDetails

class ToolCallMessage(BaseModel):
    type: str = Field(..., alias="type")
    toolCalls: List[ToolCall]

class VapiWebhookPayload(BaseModel):
    message: ToolCallMessage

# ─── Webhook Endpoint ───────────────────────────────────────────────────

@router.post("/webhook")
async def handle_vapi_webhook(payload: VapiWebhookPayload):
    """Gateway for Vapi custom tool calls.
    Returns a list of `{"toolCallId": <id>, "result": <string|payload>}` as required by Vapi.
    """
    message = payload.message
    if message.type != "tool-calls":
        return {"status": "ignored"}

    results = []

    for tool_call in message.toolCalls:
        tool_id = tool_call.id
        func_name = tool_call.function.name
        args = tool_call.function.arguments

        # Resolve session handling – propagate an existing session_id or create a temporary one
        raw_session_id = args.get("session_id")
        if not raw_session_id or "{{" in str(raw_session_id):
            session_id = str(uuid.uuid4())
        else:
            session_id = raw_session_id

        # Resolve user_id – accept Clerk alphanumeric ID and map to UUID if needed
        user_id = args.get("user_id")
        if user_id:
            # If user_id is not a valid UUID, treat it as Clerk user ID and look up in DB
            try:
                uuid.UUID(user_id)
                # It's a valid UUID, keep as is
            except ValueError:
                # Not a UUID, query supabase for matching clerk_user_id
                try:
                    from mcp_server.db import supabase_client
                    user_resp = (
                        supabase_client.table("users")
                        .select("id")
                        .eq("clerk_user_id", user_id)
                        .execute()
                    )
                    if user_resp.data:
                        user_id = user_resp.data[0].get("id")
                except Exception as e:
                    print(f"[Vapi Webhook] Error mapping Clerk user_id to UUID: {e}")
        if not user_id:
            # fallback to default user as before
            try:
                from mcp_server.db import supabase_client
                users_resp = (
                    supabase_client.table("users")
                    .select("id")
                    .limit(1)
                    .execute()
                )
                if users_resp.data and len(users_resp.data) > 0:
                    user_id = users_resp.data[0]["id"]
                    print(f"[Vapi Webhook] Fallback: Using default user_id {user_id}")
            except Exception as e:
                print(f"[Vapi Webhook] Error fetching fallback user: {e}")

        # Idempotently ensure the session exists in the database before trace logging
        if user_id:
            try:
                create_session(
                    CreateSessionInput(
                        user_id=user_id,
                        raw_input="Voice call request",
                        session_id=session_id
                    )
                )
            except Exception as e:
                print(f"[Vapi Webhook] Error ensuring session exists idempotently: {e}")

        try:
            # ------------------------------------------------------------
            # find_providers tool
            # ------------------------------------------------------------
            if func_name == "find_providers":
                category = args.get("category", "")
                slot_date = args.get("slot_date", "")
                area = args.get("area", "")

                print(f"[Vapi Webhook] Running find_providers for session {session_id} on slot_date {slot_date}")

                # Trace step counting
                trace_count = 0
                try:
                    from mcp_server.db import supabase_client
                    traces_resp = (
                        supabase_client.table("trace_logs")
                        .select("id", count="exact")
                        .eq("session_id", session_id)
                        .execute()
                    )
                    if traces_resp.count is not None:
                        trace_count = traces_resp.count
                    elif isinstance(traces_resp.data, list):
                        trace_count = len(traces_resp.data)
                except Exception as e:
                    print(f"Error querying trace log count: {e}")

                step = trace_count + 1

                start_time = time.time()
                providers_output = find_providers(
                    FindProvidersInput(
                        service_type=category,
                        slot_date=slot_date,
                        area=area,
                    )
                )
                duration = int((time.time() - start_time) * 1000)
                providers_list = providers_output.providers

                # Build structured payload for Vapi to consume
                providers_data = []
                for p in providers_list:
                    providers_data.append(
                        {
                            "provider_id": p.provider_id,
                            "name": p.name,
                            "rating": p.rating,
                            "jobs_completed": p.jobs_completed,
                            "price_range": p.price_range,
                            "available_slots": [
                                {"slot_id": s.slot_id, "slot_time": s.slot_time}
                                for s in p.available_slots
                            ],
                        }
                    )
                if not providers_list:
                    summary = "No professionals are available for this service right now."
                    output_summary = f"Searched the local area for matching service professionals in category '{category}'."
                    result_payload = {
                        "status": "no_providers_found",
                        "message": summary,
                        "providers": [],
                    }
                else:
                    top_providers = [p.name for p in providers_list[:2]]
                    summary = f"I found {', '.join(top_providers)} who have exceptional ratings and reviews."
                    output_summary = f"Discovered {len(providers_list)} available local professionals matching your requested service type."
                    result_payload = {
                        "status": "success",
                        "message": summary,
                        "providers": providers_data,
                    }

                # Log trace
                try:
                    write_trace_log(
                        WriteTraceLogInput(
                            session_id=session_id,
                            step=step,
                            agent_name="DiscoveryAgent",
                            tool_used="find_providers_tool",
                            input_payload={"category": category, "slot_date": slot_date, "area": area},
                            output_payload={"providers": providers_data},
                            output_summary=output_summary,
                            duration_ms=duration,
                        )
                    )
                except Exception as e:
                    print(f"Error writing find_providers trace: {e}")

                results.append({"toolCallId": tool_id, "result": result_payload})

            # ------------------------------------------------------------
            # create_booking tool
            # ------------------------------------------------------------
            elif func_name == "create_booking":
                provider_id = args.get("provider_id", "")
                slot_id = args.get("slot_id", "")

                print(f"[Vapi Webhook] Finalizing booking slot {slot_id} for provider {provider_id}")

                # Trace step counting (reuse logic from above)
                trace_count = 0
                try:
                    from mcp_server.db import supabase_client
                    traces_resp = (
                        supabase_client.table("trace_logs")
                        .select("id", count="exact")
                        .eq("session_id", session_id)
                        .execute()
                    )
                    if traces_resp.count is not None:
                        trace_count = traces_resp.count
                    elif isinstance(traces_resp.data, list):
                        trace_count = len(traces_resp.data)
                except Exception as e:
                    print(f"Error querying trace log count: {e}")
                step = trace_count + 1

                # Fetch user_id from session table
                user_id = None
                try:
                    from mcp_server.db import supabase_client
                    session_resp = (
                        supabase_client.table("sessions")
                        .select("user_id")
                        .eq("id", session_id)
                        .execute()
                    )
                    if session_resp.data:
                        user_id = session_resp.data[0].get("user_id")
                except Exception as e:
                    print(f"Error fetching user_id for session in create_booking: {e}")

                if not user_id:
                    raise ValueError(f"Could not locate user_id for session {session_id}")

                start_time = time.time()
                booking_output = create_booking(
                    CreateBookingInput(
                        user_id=user_id,
                        provider_id=provider_id,
                        slot_id=slot_id,
                    )
                )
                duration = int((time.time() - start_time) * 1000)

                # Resolve provider name for human‑readable summary
                provider_name = "the selected professional"
                if provider_id:
                    try:
                        from mcp_server.db import supabase_client
                        prov_resp = (
                            supabase_client.table("providers")
                            .select("name")
                            .eq("id", provider_id)
                            .execute()
                        )
                        if prov_resp.data:
                            provider_name = prov_resp.data[0].get("name", "the selected professional")
                    except Exception as e:
                        print(f"Error querying provider name in webhook: {e}")

                output_summary = f"Successfully confirmed the appointment and secured a slot with {provider_name}."

                # Log trace for booking creation
                try:
                    write_trace_log(
                        WriteTraceLogInput(
                            session_id=session_id,
                            step=step,
                            agent_name="BookingAgent",
                            tool_used="create_booking_tool",
                            input_payload={"provider_id": provider_id, "slot_id": slot_id},
                            output_payload=booking_output.dict(),
                            output_summary=output_summary,
                            duration_ms=duration,
                        )
                    )
                except Exception as e:
                    print(f"Error writing create_booking trace: {e}")

                # Update session status to completed
                try:
                    from mcp_server.db import supabase_client
                    supabase_client.table("sessions").update({"status": "completed"}).eq("id", session_id).execute()
                except Exception as e:
                    print(f"Error updating session status to completed: {e}")

                # ----- Notification handling -----
                # 1️⃣ Send confirmation emails to user & provider
                try:
                    send_booking_emails(
                        SendBookingEmailsInput(
                            booking_id=booking_output.booking_id,
                            user_id=user_id,
                            provider_id=provider_id,
                        )
                    )
                except Exception as e:
                    print(f"Error sending booking confirmation emails from webhook: {e}")

                # 2️⃣ Schedule reminder & completion‑check follow‑ups
                try:
                    slot_resp = (
                        supabase_client.table("provider_slots")
                        .select("slot_date, slot_time")
                        .eq("id", slot_id)
                        .execute()
                    )
                    if slot_resp.data:
                        slot_date = slot_resp.data[0].get("slot_date")
                        slot_time = slot_resp.data[0].get("slot_time")
                        schedule_followups(
                            ScheduleFollowupsInput(
                                booking_id=booking_output.booking_id,
                                user_id=user_id,
                                slot_date=str(slot_date),
                                slot_time=str(slot_time),
                            )
                        )
                except Exception as e:
                    print(f"Error scheduling follow‑ups from webhook: {e}")

                # 3️⃣ Trigger arrival timer background task
                try:
                    booking_id = booking_output.booking_id
                    if booking_id:
                        import asyncio
                        from app.workers.arrival_timer import run_arrival_timer
                        asyncio.create_task(run_arrival_timer(booking_id, user_id))
                except Exception as e:
                    print(f"Error triggering arrival timer worker from webhook: {e}")

                # Construct a structured result payload for Vapi
                result_payload = {
                    "status": "success",
                    "message": output_summary,
                    "booking_id": booking_output.booking_id,
                    "confirmation_code": booking_output.confirmation_code,
                }
                results.append({"toolCallId": tool_id, "result": result_payload})

            # ------------------------------------------------------------
            else:
                results.append({"toolCallId": tool_id, "error": f"Tool {func_name} is unconfigured on Private Concierge."})
        except Exception as e:
            print(f"[Vapi Webhook Error] Failed to execute {func_name}: {e}")
            results.append({"toolCallId": tool_id, "error": str(e)})

    return {"results": results}
