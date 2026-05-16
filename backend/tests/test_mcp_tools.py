"""
tests/test_mcp_tools.py
=======================
Integration tests for all 5 MCP tools.

Data is inserted into the REAL Supabase database and LEFT THERE so you can
inspect it in the Supabase dashboard after the run. Each test prints the
exact table + row IDs it wrote so you know where to look.

Run with:
    uv run python -m tests.test_mcp_tools
"""

from __future__ import annotations

import sys
import traceback
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

# ---------------------------------------------------------------------------
# Seed UUIDs (from 20260516000000_initial_schema.sql)
# ---------------------------------------------------------------------------
DEMO_USER_ID = "11111111-1111-1111-1111-111111111111"
PROVIDER_ALI  = "22222222-2222-2222-2222-222222222221"
PROVIDER_COOL = "22222222-2222-2222-2222-222222222222"
SLOT_ALI_1   = "33333333-3333-3333-3333-333333333331"   # 09:00 AM – Ali AC
SLOT_ALI_2   = "33333333-3333-3333-3333-333333333332"   # 10:30 AM – Ali AC
SLOT_COOL_1  = "33333333-3333-3333-3333-333333333333"   # 09:30 AM – Cool Tech

TOMORROW = (date.today() + timedelta(days=1)).isoformat()

# ---------------------------------------------------------------------------
# Imports
# ---------------------------------------------------------------------------
from mcp_server.tools.provider_tools import FindProvidersInput, find_providers
from mcp_server.tools.ranking_tools import (
    ProviderForRanking,
    RankProvidersInput,
    rank_providers,
)
from mcp_server.tools.booking_tools import CreateBookingInput, create_booking
from mcp_server.tools.notification_tools import ScheduleFollowupsInput, schedule_followups
from mcp_server.tools.trace_tools import WriteTraceLogInput, write_trace_log
from mcp_server.db import supabase_client

# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------
results: list[dict[str, Any]] = []

# Track everything inserted so we can report it at the end
inserted: dict[str, list[str]] = {
    "sessions":      [],
    "bookings":      [],
    "notifications": [],
    "trace_logs":    [],
}


def run_test(name: str):
    """Decorator — catches exceptions and records PASS/FAIL."""
    def decorator(fn):
        def wrapper():
            print(f"\n{'─'*60}")
            print(f"  TEST: {name}")
            print(f"{'─'*60}")
            try:
                fn()
                results.append({"name": name, "status": "PASS"})
                print(f"  ✅  PASS")
            except Exception as exc:
                results.append({"name": name, "status": "FAIL", "error": str(exc)})
                print(f"  ❌  FAIL: {exc}")
                traceback.print_exc()
        return wrapper
    return decorator


def assert_eq(label: str, actual, expected):
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")
    print(f"    ✓ {label} = {actual!r}")


def assert_truthy(label: str, value):
    if not value:
        raise AssertionError(f"{label} is falsy: {value!r}")
    print(f"    ✓ {label} = {value!r}")


def assert_in(label: str, item, container):
    if item not in container:
        raise AssertionError(f"{label}: {item!r} not found")
    print(f"    ✓ {label!r} present")


# ---------------------------------------------------------------------------
# Pre-flight: reset seed slots so booking tests are not blocked by a
# previous partial run where a slot was left as booked.
# ---------------------------------------------------------------------------
def reset_seed_slots():
    supabase_client.table("provider_slots").update({"is_booked": False}).in_(
        "id", [SLOT_ALI_1, SLOT_ALI_2, SLOT_COOL_1]
    ).execute()
    print("  [pre-flight] Seed slots reset to is_booked=False")


# ===========================================================================
# TEST 1 — find_providers: happy path (READ ONLY — no DB writes)
# ===========================================================================

@run_test("find_providers — matches AC technicians in G-13")
def test_find_providers_happy():
    result = find_providers(
        FindProvidersInput(
            service_type="AC Technician",
            area="G-13",
            slot_date=date.fromisoformat(TOMORROW),
        )
    )
    print(f"    total_found = {result.total_found}")
    for p in result.providers:
        print(f"    • {p.name}  |  slots: {[s.slot_time for s in p.available_slots]}")

    assert_truthy("total_found >= 2", result.total_found >= 2)
    names = [p.name for p in result.providers]
    assert_in("Ali AC Repairs in results", "Ali AC Repairs", names)
    assert_in("Cool Tech Services in results", "Cool Tech Services", names)
    ali = next(p for p in result.providers if p.name == "Ali AC Repairs")
    assert_truthy("Ali has >= 1 available slot", len(ali.available_slots) >= 1)


# ===========================================================================
# TEST 2 — find_providers: no match (READ ONLY)
# ===========================================================================

@run_test("find_providers — returns empty for unknown service type")
def test_find_providers_no_match():
    result = find_providers(
        FindProvidersInput(
            service_type="Rocket Scientist",
            area="G-13",
            slot_date=date.fromisoformat(TOMORROW),
        )
    )
    assert_eq("total_found", result.total_found, 0)
    assert_eq("providers list empty", result.providers, [])


# ===========================================================================
# TEST 3 — rank_providers (pure computation, no DB writes)
# ===========================================================================

@run_test("rank_providers — ranks by formula with correct positions")
def test_rank_providers():
    result = rank_providers(
        RankProvidersInput(
            providers=[
                ProviderForRanking(
                    provider_id=PROVIDER_ALI,
                    name="Ali AC Repairs",
                    rating=4.8,
                    lat=33.6500,
                    lng=72.9820,
                    available_slots_count=2,
                ),
                ProviderForRanking(
                    provider_id=PROVIDER_COOL,
                    name="Cool Tech Services",
                    rating=4.5,
                    lat=33.6480,
                    lng=72.9800,
                    available_slots_count=1,
                ),
            ],
            user_lat=33.6491,
            user_lng=72.9818,
        )
    )

    print("    ranked providers:")
    for p in result.ranked_providers:
        print(
            f"    #{p.rank} {p.name} | total={p.total_score}"
            f"  (rating={p.rating_score}, proximity={p.proximity_score}, availability={p.availability_score})"
        )

    assert_eq("two results", len(result.ranked_providers), 2)
    assert_truthy(
        "rank 1 score > rank 2 score",
        result.ranked_providers[0].total_score > result.ranked_providers[1].total_score,
    )
    assert_eq("Ali AC is #1", result.ranked_providers[0].name, "Ali AC Repairs")
    for p in result.ranked_providers:
        assert_truthy(f"{p.name} score in [0,1]", 0.0 <= p.total_score <= 1.0)


# ===========================================================================
# TEST 4 — create_booking: WRITES to bookings + marks slot booked
# ===========================================================================

_booking_id: str = ""
_confirmation_code: str = ""


@run_test("create_booking — inserts confirmed booking row + marks slot booked")
def test_create_booking():
    global _booking_id, _confirmation_code

    result = create_booking(
        CreateBookingInput(
            user_id=DEMO_USER_ID,
            provider_id=PROVIDER_ALI,
            slot_id=SLOT_ALI_1,
        )
    )

    _booking_id = result.booking_id
    _confirmation_code = result.confirmation_code
    inserted["bookings"].append(_booking_id)

    print(f"    ➜ bookings row inserted")
    print(f"      id               : {result.booking_id}")
    print(f"      confirmation_code: {result.confirmation_code}")
    print(f"      status           : {result.status}")
    print(f"      booked_at        : {result.booked_at}")

    assert_truthy("booking_id non-empty", result.booking_id)
    assert_eq("status = confirmed", result.status, "confirmed")
    assert_truthy("confirmation_code length >= 6", len(result.confirmation_code) >= 6)

    # Verify in DB
    slot_row = (
        supabase_client.table("provider_slots")
        .select("is_booked")
        .eq("id", SLOT_ALI_1)
        .single()
        .execute()
    )
    assert_eq("provider_slots.is_booked = True in DB", slot_row.data["is_booked"], True)


# ===========================================================================
# TEST 5 — create_booking: double-booking guard
# ===========================================================================

@run_test("create_booking — rejects double-booking on the same slot")
def test_create_booking_double():
    try:
        create_booking(
            CreateBookingInput(
                user_id=DEMO_USER_ID,
                provider_id=PROVIDER_ALI,
                slot_id=SLOT_ALI_1,  # already booked by TEST 4
            )
        )
        raise AssertionError("Expected ValueError — none raised")
    except ValueError as exc:
        print(f"    ✓ Correctly raised ValueError: {exc}")


# ===========================================================================
# TEST 6 — schedule_followups: WRITES 2 notifications rows
# ===========================================================================

@run_test("schedule_followups — inserts reminder + completion_check in notifications")
def test_schedule_followups():
    slot_dt = datetime.now(timezone.utc) + timedelta(days=1, hours=9)

    result = schedule_followups(
        ScheduleFollowupsInput(
            booking_id=_booking_id,
            user_id=DEMO_USER_ID,
            slot_datetime=slot_dt,
        )
    )

    for n in result.scheduled:
        inserted["notifications"].append(n.notification_id)

    print(f"    ➜ {len(result.scheduled)} notification rows inserted")
    for n in result.scheduled:
        print(f"      [{n.type}]  id={n.notification_id}  scheduled_at={n.scheduled_at}")

    assert_eq("two rows created", len(result.scheduled), 2)
    types = {n.type for n in result.scheduled}
    assert_in("reminder present", "reminder", types)
    assert_in("completion_check present", "completion_check", types)

    reminder  = next(n for n in result.scheduled if n.type == "reminder")
    check     = next(n for n in result.scheduled if n.type == "completion_check")
    assert_truthy("reminder is before slot",         datetime.fromisoformat(reminder.scheduled_at) < slot_dt)
    assert_truthy("completion_check is after slot",  datetime.fromisoformat(check.scheduled_at)    > slot_dt)

    # Cross-check DB rows
    db = (
        supabase_client.table("notifications")
        .select("id, type, status, scheduled_at, booking_id")
        .in_("id", [n.notification_id for n in result.scheduled])
        .execute()
    )
    print(f"    DB rows verified:")
    for row in db.data:
        print(f"      {row}")
        assert_eq(f"  {row['type']}.status = pending", row["status"], "pending")
        assert_eq(f"  {row['type']}.booking_id correct", row["booking_id"], _booking_id)


# ===========================================================================
# TEST 7 — write_trace_log: WRITES a session + trace_log row
# ===========================================================================

_session_id: str = str(uuid.uuid4())

@run_test("write_trace_log — inserts session + trace_log row with full payload")
def test_write_trace_log():
    global _session_id

    # Insert a real session row (required FK for trace_logs)
    sess = (
        supabase_client.table("sessions")
        .insert(
            {
                "id": _session_id,
                "user_id": DEMO_USER_ID,
                "raw_input": "Mujhe kal subah G-13 mein AC technician chahiye",
                "detected_language": "roman_urdu",
                "status": "completed",
            }
        )
        .execute()
    )
    inserted["sessions"].append(_session_id)
    print(f"    ➜ sessions row inserted  id={_session_id}")

    result = write_trace_log(
        WriteTraceLogInput(
            session_id=_session_id,
            step=1,
            agent_name="DiscoveryAgent",
            tool_used="find_providers",
            input_payload={
                "service_type": "AC Technician",
                "area": "G-13",
                "slot_date": TOMORROW,
            },
            output_payload={
                "total_found": 2,
                "providers": ["Ali AC Repairs", "Cool Tech Services"],
            },
            output_summary="Found 2 AC technicians in G-13 with available slots tomorrow morning.",
            duration_ms=142,
        )
    )
    inserted["trace_logs"].append(result.trace_id)

    print(f"    ➜ trace_logs row inserted")
    print(f"      id          : {result.trace_id}")
    print(f"      session_id  : {result.session_id}")
    print(f"      step        : {result.step}")

    assert_truthy("trace_id non-empty", result.trace_id)
    assert_eq("session_id matches", result.session_id, _session_id)
    assert_eq("step = 1", result.step, 1)

    # Cross-check DB
    db = (
        supabase_client.table("trace_logs")
        .select("*")
        .eq("id", result.trace_id)
        .single()
        .execute()
    )
    row = db.data
    print(f"    DB row verified:")
    print(f"      agent_name    : {row['agent_name']}")
    print(f"      tool_used     : {row['tool_used']}")
    print(f"      duration_ms   : {row['duration_ms']}")
    print(f"      output_summary: {row['output_summary']}")
    print(f"      input_payload : {row['input_payload']}")
    print(f"      output_payload: {row['output_payload']}")

    assert_eq("agent_name", row["agent_name"], "DiscoveryAgent")
    assert_eq("tool_used",  row["tool_used"],  "find_providers")
    assert_eq("duration_ms", row["duration_ms"], 142)
    assert_eq("output_summary", row["output_summary"],
              "Found 2 AC technicians in G-13 with available slots tomorrow morning.")


# ===========================================================================
# Main runner
# ===========================================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  MCP TOOL INTEGRATION TEST SUITE")
    print("  Data is inserted and LEFT in the DB — check Supabase!")
    print("=" * 60)

    print(f"\n{'─'*60}")
    print("  PRE-FLIGHT")
    print(f"{'─'*60}")
    reset_seed_slots()

    # Run tests
    test_find_providers_happy()
    test_find_providers_no_match()
    test_rank_providers()
    test_create_booking()
    test_create_booking_double()
    test_schedule_followups()
    test_write_trace_log()

    # ---------------------------------------------------------------------------
    # What's in your DB
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("  ROWS INSERTED INTO SUPABASE (go check the dashboard!)")
    print("=" * 60)
    for table, ids in inserted.items():
        if ids:
            print(f"\n  📋 {table}")
            for row_id in ids:
                print(f"     id = {row_id}")
    print(f"\n  📋 provider_slots  (is_booked updated)")
    print(f"     id = {SLOT_ALI_1}  →  is_booked = True")

    # ---------------------------------------------------------------------------
    # Summary
    # ---------------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("  TEST SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    for r in results:
        icon = "✅" if r["status"] == "PASS" else "❌"
        print(f"  {icon}  {r['name']}")
        if r["status"] == "FAIL":
            print(f"       → {r.get('error', '')}")
    print(f"\n  Passed: {passed}/{len(results)}   Failed: {failed}/{len(results)}")
    print("=" * 60 + "\n")

    sys.exit(0 if failed == 0 else 1)
