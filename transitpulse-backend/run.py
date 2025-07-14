import uvicorn
import os

if __name__ == "__main__":
    print("Starting TransitPulse API server...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=9002,
        reload=True,
        log_level="debug"
    )
