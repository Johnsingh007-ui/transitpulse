from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os
import traceback
import asyncio
from app.websocket.manager import manager
from app.api.endpoints import gtfs as gtfs_router

# Import routers
try:
    from app.api.endpoints import gtfs as gtfs_router
    from app.api.endpoints.shapes_router import router as shapes_router
    # from app.api.endpoints import gtfs_rt as gtfs_rt_router
except ImportError as e:
    print("\n🚨 ERROR IMPORTING ROUTERS 🚨", file=sys.stderr)
    print(f"Error: {e}", file=sys.stderr)
    print("\nCurrent working directory:", os.getcwd(), file=sys.stderr)
    print("Python path:", sys.path, file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)

# Print startup information
print("\n" + "="*50, file=sys.stderr)
print("STARTING TRANSITPULSE API", file=sys.stderr)
print("="*50, file=sys.stderr)
print(f"Python executable: {sys.executable}", file=sys.stderr)
print(f"Working directory: {__file__}", file=sys.stderr)
print("="*50 + "\n", file=sys.stderr)

# Create FastAPI app
app = FastAPI(
    title="TransitPulse API",
    description="API for TransitPulse real-time transit data",
    version="1.0.0"
)

# Get allowed origins from environment variable or default to localhost:3002
ALLOWED_ORIGINS = os.getenv(
    'ALLOWED_ORIGINS', 
    'http://localhost:3002,http://127.0.0.1:3002,http://localhost:3000,http://127.0.0.1:3000'
).split(',')

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(gtfs_router.router, prefix="/api/v1")

# WebSocket endpoint for real-time vehicle updates
@app.websocket("/ws/vehicles/{route_id}")
async def websocket_endpoint(websocket: WebSocket, route_id: str):
    await manager.connect(websocket, route_id)
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(10)
            await websocket.send_json({"type": "ping", "message": "Connection alive"})
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket, route_id)

# Background task to simulate vehicle updates (replace with real data source)
@app.on_event("startup")
async def startup_event():
    from app.api.endpoints.gtfs import simulate_vehicle_updates
    from app.websocket.manager import manager
    # Start the vehicle simulation
    asyncio.create_task(simulate_vehicle_updates(manager))

@app.get("/")
async def root():
    """Root endpoint that returns a welcome message"""
    return {"message": "Welcome to TransitPulse API - Running on port 9000"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "status": "success",
        "message": "Test endpoint is working!",
        "port": 9000
    }

# Include the API routers with appropriate prefixes
try:
    app.include_router(gtfs_router.router, prefix="/api/v1")
    app.include_router(shapes_router, prefix="/api/v1", tags=["shapes"])
    # app.include_router(gtfs_rt_router.router, prefix="/api/v1", tags=["gtfs-rt"])
    print("✅ Successfully registered routers", file=sys.stderr)
except Exception as e:
    print("\n🚨 ERROR REGISTERING ROUTERS 🚨", file=sys.stderr)
    print(f"Error: {e}", file=sys.stderr)
    traceback.print_exc()
    sys.exit(1)

@app.get("/debug/routes")
async def debug_routes():
    """Debug endpoint to list all registered routes"""
    routes = []
    for route in app.routes:
        route_info = {
            "path": getattr(route, "path", "No path"),
            "name": getattr(route, "name", "No name"),
            "methods": getattr(route, "methods", ["No methods"]),
            "endpoint": str(route.endpoint) if hasattr(route, "endpoint") else "No endpoint",
            "type": type(route).__name__
        }
        routes.append(route_info)
    return {"routes": routes, "total_routes": len(routes)}

# Print available routes on startup
@app.on_event("startup")
async def startup():
    print("\n" + "="*50, file=sys.stderr)
    print("AVAILABLE ROUTES:", file=sys.stderr)
    print("="*50, file=sys.stderr)
    for route in app.routes:
        if hasattr(route, 'path'):
            methods = getattr(route, 'methods', ['*'])
            print(f"{route.path} - {methods}", file=sys.stderr)
    print("="*50 + "\n", file=sys.stderr)

# Run with: uvicorn main:app --host 0.0.0.0 --port 9000 --reload
# if __name__ == "__main__":
#     uvicorn.run(
#         "main:app",
#         host="0.0.0.0",
#         port=9000,
#         reload=True,
#         log_level="debug"
#     )
