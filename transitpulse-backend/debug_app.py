import uvicorn
from fastapi import FastAPI, Request
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Debug App", version="1.0.0")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"message": "Debug app is running"}

@app.get("/test")
async def test_endpoint():
    logger.info("Test endpoint called")
    return {"status": "success", "message": "Test endpoint is working!"}

# Print all registered routes
@app.on_event("startup")
async def startup():
    logger.info("\n" + "="*50)
    logger.info("REGISTERED ROUTES:")
    logger.info("="*50)
    for route in app.routes:
        if hasattr(route, 'path'):
            logger.info(f"{route.path} - {getattr(route, 'methods', [])}")
    logger.info("="*50 + "\n")

if __name__ == "__main__":
    logger.info("Starting debug app...")
    uvicorn.run(
        "debug_app:app",
        host="0.0.0.0",
        port=9000,
        reload=True,
        log_level="info"
    )
