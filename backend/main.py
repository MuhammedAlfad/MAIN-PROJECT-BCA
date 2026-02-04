from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db
from app.routes import auth, trips, places
import uvicorn

# Create FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
async def startup_event():
    db.connect_db()

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    db.close_db()

# Include routers
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(places.router)

@app.get("/")
async def root():
    return {"message": "Trip Planner API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
