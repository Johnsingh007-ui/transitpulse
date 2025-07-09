from fastapi import FastAPI
import uvicorn
import sys

# Print to stderr to ensure we see output
print("\n" + "="*50, file=sys.stderr)
print("STARTING FASTAPI ON PORT 9001", file=sys.stderr)
print("="*50, file=sys.stderr)
print(f"Python executable: {sys.executable}", file=sys.stderr)
print(f"Working directory: {__file__}", file=sys.stderr)
print("="*50 + "\n", file=sys.stderr)

app = FastAPI(title="FastAPI Test on 9001")

@app.get("/")
def read_root():
    print("\nRoot endpoint called", file=sys.stderr)
    return {"message": "Hello from FastAPI on port 9001"}

@app.get("/test")
def test():
    print("\nTest endpoint called", file=sys.stderr)
    return {"status": "success", "message": "Test endpoint is working on 9001!"}

if __name__ == "__main__":
    print("\nStarting FastAPI server on http://localhost:9001", file=sys.stderr)
    print("Available endpoints:", file=sys.stderr)
    print("  http://localhost:9001/", file=sys.stderr)
    print("  http://localhost:9001/test\n", file=sys.stderr)
    
    # Run with debug logging
    uvicorn.run(
        "fastapi_port_9001:app",
        host="0.0.0.0",
        port=9001,
        log_level="debug",
        reload=False
    )
