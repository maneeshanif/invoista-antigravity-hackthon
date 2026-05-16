"""
tests/test_orchestrator.py — Full workflow integration test.

Runs the AgentOrchestrator to process a user request through all agents.
"""

import asyncio
import os
from app.agents.orchestrator import AgentOrchestrator

async def main():
    # Verify GEMINI_API_KEY
    if not os.environ.get("GEMINI_API_KEY"):
        print("❌ Error: GEMINI_API_KEY not set in environment.")
        return

    orchestrator = AgentOrchestrator()
    user_input = "Mujhe kal subah G-13 mein AC technician chahiye"
    
    print(f"\n🚀 Starting Orchestrator for input: '{user_input}'")
    print("=" * 60)
    
    try:
        result = await orchestrator.run_workflow(user_input)
        print("\n" + "=" * 60)
        print("✅ WORKFLOW COMPLETED SUCCESSFULLY")
        print(f"Status     : {result['status']}")
        print(f"Session ID : {result['session_id']}")
        print(f"Summary    : {result['summary']}")
        print("=" * 60)
    except Exception as e:
        print("\n" + "=" * 60)
        print("❌ WORKFLOW FAILED")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
