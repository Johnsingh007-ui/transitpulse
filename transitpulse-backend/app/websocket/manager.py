from typing import Dict, Set, Optional
import asyncio
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, route_id: str):
        await websocket.accept()
        async with self.lock:
            if route_id not in self.active_connections:
                self.active_connections[route_id] = set()
            self.active_connections[route_id].add(websocket)
            print(f"New connection for route {route_id}. Total connections: {len(self.active_connections[route_id])}")

    async def disconnect(self, websocket: WebSocket, route_id: str):
        async with self.lock:
            if route_id in self.active_connections:
                self.active_connections[route_id].discard(websocket)
                if not self.active_connections[route_id]:
                    del self.active_connections[route_id]
                print(f"Connection closed for route {route_id}")

    async def broadcast(self, route_id: str, message: dict):
        async with self.lock:
            if route_id in self.active_connections:
                disconnected = set()
                for connection in self.active_connections[route_id]:
                    try:
                        await connection.send_json(message)
                    except Exception as e:
                        print(f"Error sending to WebSocket: {e}")
                        disconnected.add(connection)
                
                # Clean up disconnected clients
                for connection in disconnected:
                    self.active_connections[route_id].remove(connection)

# Create a global instance of the connection manager
manager = ConnectionManager()
