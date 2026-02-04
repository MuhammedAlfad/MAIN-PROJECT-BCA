from fastapi import APIRouter
from app.services.place_service import PlaceService

router = APIRouter(prefix="/api/places", tags=["places"])

@router.get("/recommendations")
async def get_recommendations(location: str, limit: int = 10):
    """Get place recommendations for a location"""
    places = PlaceService.get_recommendations(location, limit)
    return {"location": location, "places": places}

@router.get("/search")
async def search_places(query: str):
    """Search for places"""
    places = PlaceService.search_places(query)
    return {"query": query, "results": places}
