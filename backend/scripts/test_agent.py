import httpx
import json
import asyncio

async def test_agent():
    url = "http://localhost:8000/api/v1/requests"
    payload = {
        "user_request": "I need a plumber in G-13 tomorrow morning for a leaky pipe"
    }
    
    print(f"Sending request to {url}...")
    print(f"Request: {payload['user_request']}")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
            print("\n--- AGENT RESPONSE ---")
            print(json.dumps(response.json(), indent=2))
        except Exception as e:
            print(f"\nError: {e}")
            if hasattr(e, 'response') and e.response:
                print(f"Status Code: {e.response.status_code}")
                print(f"Details: {e.response.text}")

if __name__ == "__main__":
    asyncio.run(test_agent())
