import httpx
import asyncio

async def list_operators(api_key: str):
    """List all available GTFS operators from the 511.org API."""
    url = f"http://api.511.org/transit/gtfsoperators?api_key={api_key}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            
            # The API returns XML by default, but we'll try to parse it as JSON if possible
            if 'application/json' in response.headers.get('content-type', ''):
                operators = response.json()
                print("\nAvailable Operators (JSON format):")
                for op in operators.get('operators', {}).get('operator', []):
                    print(f"- ID: {op.get('@id')}, Name: {op.get('@name')}")
            else:
                # If response is XML, print the raw content
                print("\nRaw API Response (XML):")
                print(response.text[:1000] + "..." if len(response.text) > 1000 else response.text)
                
        except Exception as e:
            print(f"Error fetching operators: {e}")

if __name__ == "__main__":
    # Use the same API key we've been using
    API_KEY = "b43cedb9-b614-4739-bb3a-e3c07f895fab"
    asyncio.run(list_operators(API_KEY))
