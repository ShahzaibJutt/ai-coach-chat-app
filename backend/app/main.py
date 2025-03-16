from app.api.routes import ai
from app.api.routes import auth  # Import auth routes
from app.core.database import init_db
from app.core.memory_manager import load_user_memories, save_user_memories
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Stream Chat API with Auth Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    init_db()
    load_user_memories()


@app.on_event("shutdown")
async def shutdown_event():
    save_user_memories()


app.include_router(auth.router, prefix="/api/auth")
app.include_router(ai.router, prefix="/api/ai")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
