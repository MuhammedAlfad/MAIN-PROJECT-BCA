from fastapi import APIRouter, HTTPException, status, Header
from typing import Optional
from app.models.trip import TripCreate, TripUpdate, Place
from app.services.trip_service import TripService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/trips", tags=["trips"])

def get_user_from_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    try:
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format"
            )
        
        token = parts[1]
        user_id = AuthService.decode_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization: {str(e)}"
        )

@router.post("/create")
async def create_trip(trip_data: TripCreate, authorization: Optional[str] = Header(None)):
    """Create a new trip"""
    try:
        user_id = get_user_from_token(authorization)
        trip = TripService.create_trip(user_id, trip_data)
        return trip
    except Exception as e:
        print(f"Trip creation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create trip: {str(e)}"
        )

@router.get("/my-trips")
async def get_my_trips(authorization: Optional[str] = Header(None)):
    """Get all trips for current user"""
    user_id = get_user_from_token(authorization)
    trips = TripService.get_user_trips(user_id)
    return {"trips": trips}

@router.get("/discover/public")
async def get_public_trips(limit: int = 20, skip: int = 0):
    """Get public trips for discovery"""
    trips = TripService.get_public_trips(limit, skip)
    return {"trips": trips}

@router.get("/{trip_id}")
async def get_trip(trip_id: str):
    """Get a specific trip"""
    trip = TripService.get_trip(trip_id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    return trip

@router.put("/{trip_id}")
async def update_trip(trip_id: str, trip_data: TripUpdate, authorization: Optional[str] = Header(None)):
    """Update a trip"""
    user_id = get_user_from_token(authorization)
    
    # Verify ownership
    trip = TripService.get_trip(trip_id)
    if not trip or trip["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this trip"
        )
    
    updated_trip = TripService.update_trip(trip_id, trip_data)
    return updated_trip

@router.delete("/{trip_id}")
async def delete_trip(trip_id: str, authorization: Optional[str] = Header(None)):
    """Delete a trip"""
    user_id = get_user_from_token(authorization)
    
    # Verify ownership
    trip = TripService.get_trip(trip_id)
    if not trip or trip["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this trip"
        )
    
    deleted = TripService.delete_trip(trip_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return {"message": "Trip deleted successfully"}

@router.post("/{trip_id}/add-place/{day}")
async def add_place_to_trip(trip_id: str, day: int, place: Place, authorization: Optional[str] = Header(None)):
    """Add a place to a specific day in itinerary"""
    user_id = get_user_from_token(authorization)
    
    # Verify ownership
    trip = TripService.get_trip(trip_id)
    if not trip or trip["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this trip"
        )
    
    updated_trip = TripService.add_place_to_itinerary(trip_id, day, place.model_dump())
    if not updated_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return updated_trip

@router.delete("/{trip_id}/remove-place/{day}/{place_name}")
async def remove_place_from_trip(trip_id: str, day: int, place_name: str, authorization: Optional[str] = Header(None)):
    """Remove a place from a specific day"""
    user_id = get_user_from_token(authorization)
    
    # Verify ownership
    trip = TripService.get_trip(trip_id)
    if not trip or trip["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this trip"
        )
    
    updated_trip = TripService.remove_place_from_itinerary(trip_id, day, place_name)
    if not updated_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return updated_trip

@router.put("/{trip_id}/day/{day}/notes")
async def update_day_notes(trip_id: str, day: int, notes: dict, authorization: Optional[str] = Header(None)):
    """Update notes for a day"""
    user_id = get_user_from_token(authorization)
    
    # Verify ownership
    trip = TripService.get_trip(trip_id)
    if not trip or trip["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this trip"
        )
    
    updated_trip = TripService.update_day_notes(trip_id, day, notes.get("notes", ""))
    if not updated_trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
    
    return updated_trip
