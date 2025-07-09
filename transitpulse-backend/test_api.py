import httpx
import asyncio

async def test_api():
    base_url = "http://localhost:9000"
    
    print("Testing API endpoints...")
    
    # Test root endpoint
    try:
        async with httpx.AsyncClient() as client:
            # Test root endpoint
            print("\n1. Testing root endpoint...")
            response = await client.get(f"{base_url}/")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
            # Test /api/v1/routes endpoint
            print("\n2. Testing /api/v1/routes endpoint...")
            response = await client.get(f"{base_url}/api/v1/routes")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            
            # Test WebSocket connection
            print("\n3. Testing WebSocket connection...")
            try:
                async with httpx.AsyncClient() as ws_client:
                    ws = await ws_client.ws_connect(
                        f"ws://localhost:9000/ws/1",  # Using route_id=1 for testing
                        timeout=5.0
                    )
                    print("   ✅ WebSocket connection successful")
                    await ws.close()
            except Exception as e:
                print(f"   ❌ WebSocket connection failed: {e}")
            
    except Exception as e:
        print(f"\n❌ Error testing API: {e}")
    
    print("\nAPI test completed")

if __name__ == "__main__":
    asyncio.run(test_api())
