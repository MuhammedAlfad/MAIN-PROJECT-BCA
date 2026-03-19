from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, date

class Place(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    coordinates: dict  # {lat, lng}
    rating: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    added_at: Optional[datetime] = None
    visit_time: Optional[str] = None  # HH:MM
    duration_minutes: Optional[int] = None
    travel_minutes_from_previous: Optional[int] = None
    notes: Optional[str] = None
    auto_generated_time: Optional[bool] = None

class DayItinerary(BaseModel):
    day: int
    date: date
    places: List[Place] = []
    notes: Optional[str] = None

class TripMedia(BaseModel):
    id: Optional[str] = None
    type: Literal["image", "video"]
    url: str
    caption: Optional[str] = None

class Trip(BaseModel):
    id: Optional[str] = None
    user_id: str
    title: str
    description: Optional[str] = None
    feedback: Optional[str] = None
    start_location: str
    end_location: str
    start_date: date
    end_date: date
    itinerary: List[DayItinerary] = []
    is_public: bool = False
    is_finished: bool = False
    cover_image: Optional[str] = None
    media_gallery: List[TripMedia] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TripCreate(BaseModel):
    title: str
    description: Optional[str] = None
    feedback: Optional[str] = None
    start_location: str
    end_location: str
    start_date: date
    end_date: date
    is_public: bool = False
    is_finished: bool = False

class TripUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    feedback: Optional[str] = None
    is_public: Optional[bool] = None
    is_finished: Optional[bool] = None
    itinerary: Optional[List[DayItinerary]] = None
    cover_image: Optional[str] = None
    media_gallery: Optional[List[TripMedia]] = None

class TripResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    feedback: Optional[str]
    start_location: str
    end_location: str
    start_date: date
    end_date: date
    itinerary: List[DayItinerary]
    is_public: bool
    is_finished: bool
    cover_image: Optional[str]
    media_gallery: List[TripMedia]
    created_at: datetime
    updated_at: datetime

class PlaceRecommendation(BaseModel):
    name: str
    description: str
    coordinates: dict
    rating: float
    image_url: Optional[str]
    category: str
