"""
vapi.py — FastAPI router handling Vapi webhook calls for custom tools.
It provides two primary tool implementations:
* `find_providers` – searches providers and returns a structured list including UUIDs and available slots.
* `create_booking` – creates a booking, sends confirmation emails, and schedules reminder/completion follow‑up notifications.
The router is mounted twice (see backend/app/main.py) to support both legacy `/api/vapi/...` and current `/api/v1/vapi/...` URLs.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
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

def is_valid_uuid(val: Any) -> bool:
    if not val:
        return False
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False


# ─── Agent/tool name constants (must match chat workflow conventions) ──────────

AGENT_DISCOVERY = "DiscoveryAgent"
TOOL_FIND_PROVIDERS = "find_providers_tool"

AGENT_BOOKING = "BookingAgent"
TOOL_CREATE_BOOKING = "create_booking_tool"


# ─── Context resolver ──────────────────────────────────────────────────────────

async def _resolve_context(message: dict, request: Request) -> Tuple[str, Optional[str]]:
    """Resolve session_id and user_id once before processing tool calls.

    Returns:
        (session_id, user_id) where session_id is always a valid UUID and
        user_id is a valid DB UUID or None if resolution failed entirely.
    """
    call_obj = message.get("call", {})
    var_values = call_obj.get("variableValues", {}) or call_obj.get("variables", {}) or {}

    # --- session_id resolution ---
    session_id = None

    # 1. Try from Vapi call variables
    val = var_values.get("session_id")
    if val and "{{" not in str(val):
        session_id = val

    # 2. Try from Vapi call ID
    if not session_id:
        session_id = call_obj.get("id")

    # 3. Fallback to a new UUID
    if not session_id or not is_valid_uuid(session_id):
        session_id = str(uuid.uuid4())

    # --- user_id resolution: JWT → Clerk ID → DB UUID → JIT provision ---
    user_id_raw = None
    clerk_jwt = None

    # 1. Try from Authorization Bearer token header (Clerk JWT)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        bearer_token = auth_header.split(" ")[1]
        if len(bearer_token.split(".")) == 3:
            clerk_jwt = bearer_token
            print(f"[Vapi Webhook] Found Clerk JWT in Authorization header")

    # 2. Try from Vapi call variables
    if not clerk_jwt:
        val = var_values.get("token")
        if val and "{{" not in str(val) and len(str(val).split(".")) == 3:
            clerk_jwt = val
            print(f"[Vapi Webhook] Found Clerk JWT in call overrides 'token'")

    # Decode token if found to extract clerk_user_id
    if clerk_jwt:
        try:
            import jwt
            payload_data = jwt.decode(clerk_jwt, options={"verify_signature": False, "verify_exp": False})
            clerk_user_id = payload_data.get("sub")
            if clerk_user_id:
                user_id_raw = clerk_user_id
                print(f"[Vapi Webhook] Resolved Clerk ID '{clerk_user_id}' from JWT token")
        except Exception as jwt_err:
            print(f"[Vapi Webhook] Error decoding JWT: {jwt_err}")

    # 3. Try from Vapi call variables (user_id directly)
    if not user_id_raw:
        val = var_values.get("user_id")
        if val and "{{" not in str(val):
            user_id_raw = val
            print(f"[Vapi Webhook] Found user_id '{val}' in call variables")

    # Map user_id_raw to the database UUID if needed
    user_id = None
    if user_id_raw:
        if is_valid_uuid(user_id_raw):
            user_id = str(user_id_raw)
        else:
            # Alphanumeric Clerk ID, look up in DB users table
            try:
                from mcp_server.db import supabase_client
                user_resp = (
                    supabase_client.table("users")
                    .select("id")
                    .eq("clerk_user_id", user_id_raw)
                    .execute()
                )
                if user_resp.data:
                    user_id = user_resp.data[0].get("id")
                    print(f"[Vapi Webhook] Mapped Clerk ID '{user_id_raw}' to DB UUID '{user_id}'")
                else:
                    # User not found in DB, JIT provision
                    name = "User"
                    email = None
                    if clerk_jwt:
                        try:
                            import jwt
                            payload_data = jwt.decode(clerk_jwt, options={"verify_signature": False, "verify_exp": False})
                            name = payload_data.get("name") or payload_data.get("fullname") or "User"
                            email = payload_data.get("email") or payload_data.get("primary_email_address")
                        except Exception:
                            pass

                    new_user_id = str(uuid.uuid4())
                    new_user_data = {
                        "id": new_user_id,
                        "clerk_user_id": user_id_raw,
                        "name": name,
                        "phone": "",
                        "role": "user",
                        "preferred_language": "en",
                        "area": "",
                        "lat": 0.0,
                        "lng": 0.0,
                        "email": email,
                    }
                    insert_resp = supabase_client.table("users").insert(new_user_data).execute()
                    if insert_resp.data:
                        user_id = insert_resp.data[0].get("id")
                        print(f"[Vapi Webhook] JIT provisioned user '{user_id_raw}' as UUID '{user_id}'")
            except Exception as e:
                print(f"[Vapi Webhook] Error mapping Clerk user_id to UUID or provisioning: {e}")

    # Fallback to default user
    if not user_id:
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
                    session_id=session_id,
                )
            )
        except Exception as e:
            print(f"[Vapi Webhook] Error ensuring session exists idempotently: {e}")

    return session_id, user_id


# ─── Webhook Endpoint ───────────────────────────────────────────────────

@router.post("/webhook")
async def handle_vapi_webhook(request: Request):
    """Gateway for Vapi custom tool calls.
    Returns a list of `{"toolCallId": <id>, "result": <string|payload>}` as required by Vapi.
    """
    try:
        payload_dict = await request.json()
    except Exception as parse_err:
        print(f"[Vapi Webhook] Error parsing JSON payload: {parse_err}")
        return {"error": "Invalid JSON payload"}

    message = payload_dict.get("message", {})
    message_type = message.get("type")
    if message_type != "tool-calls":
        return {"status": "ignored"}

    results = []
    tool_calls = message.get("toolCalls", [])

    session_id, user_id = await _resolve_context(message, request)

    for tool_call in tool_calls:
        tool_id = tool_call.get("id")
        func_details = tool_call.get("function", {})
        func_name = func_details.get("name")
        args = func_details.get("arguments", {}) or {}

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
                            agent_name=AGENT_DISCOVERY,
                            tool_used=TOOL_FIND_PROVIDERS,
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
                from mcp_server.db import supabase_client
                provider_id = args.get("provider_id", "")
                slot_id = args.get("slot_id", "")

                print(f"[Vapi Webhook] Finalizing booking slot {slot_id} for provider {provider_id}")

                if not slot_id or "{{" in slot_id:
                    raise ValueError("Invalid or missing slot_id received from Vapi webhook")

                if not user_id:
                    raise ValueError("user_id could not be resolved — cannot create booking")

                # Trace step counting
                trace_count = 0
                try:
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
                booking_output = create_booking(
                    CreateBookingInput(
                        user_id=user_id,
                        provider_id=provider_id,
                        slot_id=slot_id,
                    )
                )
                duration = int((time.time() - start_time) * 1000)

                # Resolve provider name for human-readable summary
                provider_name = "the selected professional"
                if provider_id:
                    try:
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

                # Update session status to completed
                try:
                    supabase_client.table("sessions").update({"status": "completed"}).eq("id", session_id).execute()
                except Exception as e:
                    print(f"Error updating session status to completed: {e}")

                # ----- Notification handling -----
                emails_ok = False
                followups_ok = False
                timer_ok = False

                # 1️⃣ Send confirmation emails to user & provider
                try:
                    print(f"[POST-BOOKING 1/3] Sending confirmation emails for booking {booking_output.booking_id}")
                    email_result = send_booking_emails(
                        SendBookingEmailsInput(
                            booking_id=booking_output.booking_id,
                            user_id=user_id,
                            provider_id=provider_id,
                        )
                    )
                    print(f"[POST-BOOKING 1/3] Email result: {email_result}")
                    emails_ok = True
                except Exception as e:
                    print(f"[POST-BOOKING 1/3] FAILED: {e}")

                # 2️⃣ Schedule reminder & completion-check follow-ups
                try:
                    print(f"[POST-BOOKING 2/3] Scheduling follow-ups for booking {booking_output.booking_id}")
                    slot_resp = (
                        supabase_client.table("provider_slots")
                        .select("slot_date, slot_time")
                        .eq("id", slot_id)
                        .execute()
                    )
                    if slot_resp.data:
                        print(f"[POST-BOOKING 2/3] Slot data found: {slot_resp.data}")
                        slot_date = slot_resp.data[0].get("slot_date")
                        slot_time = slot_resp.data[0].get("slot_time")
                        schedule_result = schedule_followups(
                            ScheduleFollowupsInput(
                                booking_id=booking_output.booking_id,
                                user_id=user_id,
                                slot_date=str(slot_date),
                                slot_time=str(slot_time),
                            )
                        )
                        print(f"[POST-BOOKING 2/3] Follow-ups scheduled: {schedule_result}")
                        followups_ok = True
                    else:
                        print("[POST-BOOKING 2/3] No slot data returned – skipping follow-ups")
                except Exception as e:
                    print(f"[POST-BOOKING 2/3] FAILED: {e}")

                # 3️⃣ Trigger arrival timer background task
                try:
                    booking_id = booking_output.booking_id
                    print(f"[POST-BOOKING 3/3] Launching arrival timer for booking {booking_id}")
                    if booking_id:
                        import asyncio
                        from app.workers.arrival_timer import run_arrival_timer
                        asyncio.create_task(run_arrival_timer(booking_id, user_id))
                        print("[POST-BOOKING 3/3] Arrival timer task created")
                        timer_ok = True
                    else:
                        print("[POST-BOOKING 3/3] No booking_id – skipping arrival timer")
                except Exception as e:
                    print(f"[POST-BOOKING 3/3] FAILED: {e}")

                output_summary = (
                    f"Successfully confirmed the appointment and secured a slot with {provider_name}. "
                    f"emails={emails_ok} followups={followups_ok} timer={timer_ok}"
                )

                # Log trace AFTER all post-booking steps to reflect actual pipeline outcome
                try:
                    write_trace_log(
                        WriteTraceLogInput(
                            session_id=session_id,
                            step=step,
                            agent_name=AGENT_BOOKING,
                            tool_used=TOOL_CREATE_BOOKING,
                            input_payload={"provider_id": provider_id, "slot_id": slot_id},
                            output_payload={**booking_output.dict(), "emails_ok": emails_ok, "followups_ok": followups_ok},
                            output_summary=output_summary,
                            duration_ms=duration,
                        )
                    )
                except Exception as e:
                    print(f"Error writing create_booking trace: {e}")

                # Construct a structured result payload for Vapi
                result_payload = {
                    "status": "success",
                    "message": f"Successfully confirmed the appointment and secured a slot with {provider_name}.",
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
