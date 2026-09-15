from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Dat Pack Co. Calculator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=[],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "datpack-calculator"}
