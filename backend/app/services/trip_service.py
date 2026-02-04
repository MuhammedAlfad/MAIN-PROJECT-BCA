from app.database import db
from app.models.trip import Trip, TripCreate, TripUpdate, DayItinerary
from bson import ObjectId
from datetime import datetime, date, timedelta
from typing import List, Optional

class TripService:
    @staticmethod
    def create_trip(user_id: str, trip_data: TripCreate) -> dict:
        """Create a new trip"""
        trips_collection = db.get_db()["trips"]
        
        try:
            # Validate dates
            if trip_data.start_date > trip_data.end_date:
                raise ValueError("Start date must be before end date")
            
            # Calculate days for itinerary
            delta = trip_data.end_date - trip_data.start_date
            num_days = delta.days + 1
            
            itinerary = []
            for day_num in range(num_days):
                current_date = trip_data.start_date + timedelta(days=day_num)
                
                day_itinerary = DayItinerary(
                    day=day_num + 1,
                    date=current_date,
                    places=[],
                    notes=""
                )
                itinerary.append(day_itinerary)
            
            trip = {
                "user_id": user_id,
                "title": trip_data.title,
                "description": trip_data.description or "",
                "start_location": trip_data.start_location,
                "end_location": trip_data.end_location,
                "start_date": trip_data.start_date.isoformat() if hasattr(trip_data.start_date, 'isoformat') else str(trip_data.start_date),
                "end_date": trip_data.end_date.isoformat() if hasattr(trip_data.end_date, 'isoformat') else str(trip_data.end_date),
                "itinerary": [
                    {
                        "day": day.day,
                        "date": day.date.isoformat() if hasattr(day.date, 'isoformat') else str(day.date),
                        "places": [],
                        "notes": day.notes or ""
                    }
                    for day in itinerary
                ],
                "is_public": trip_data.is_public,
                "cover_image": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = trips_collection.insert_one(trip)
            trip["_id"] = str(result.inserted_id)
            
            return trip
        except Exception as e:
            print(f"Trip creation error in service: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    @staticmethod
    def get_user_trips(user_id: str) -> List[dict]:
        """Get all trips for a user"""
        trips_collection = db.get_db()["trips"]
        trips = list(trips_collection.find({"user_id": user_id}))
        
        for trip in trips:
            trip["_id"] = str(trip["_id"])
        
        return trips
    
    @staticmethod
    def get_trip(trip_id: str) -> Optional[dict]:
        """Get a specific trip"""
        trips_collection = db.get_db()["trips"]
        trip = trips_collection.find_one({"_id": ObjectId(trip_id)})
        
        if trip:
            trip["_id"] = str(trip["_id"])
        
        return trip
    
    @staticmethod
    def update_trip(trip_id: str, trip_data: TripUpdate) -> Optional[dict]:
        """Update a trip"""
        trips_collection = db.get_db()["trips"]
        
        update_data = {k: v for k, v in trip_data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        result = trips_collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    @staticmethod
    def delete_trip(trip_id: str) -> bool:
        """Delete a trip"""
        trips_collection = db.get_db()["trips"]
        result = trips_collection.delete_one({"_id": ObjectId(trip_id)})
        return result.deleted_count > 0
    
    @staticmethod
    def get_public_trips(limit: int = 20, skip: int = 0) -> List[dict]:
        """Get public trips for discovery"""
        trips_collection = db.get_db()["trips"]
        trips = list(trips_collection.find({"is_public": True})
                    .sort("created_at", -1)
                    .skip(skip)
                    .limit(limit))
        
        for trip in trips:
            trip["_id"] = str(trip["_id"])
        
        return trips
    
    @staticmethod
    def add_place_to_itinerary(trip_id: str, day: int, place: dict) -> Optional[dict]:
        """Add a place to a specific day in the itinerary"""
        trips_collection = db.get_db()["trips"]
        
        place["added_at"] = datetime.utcnow()
        
        result = trips_collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {"$push": {f"itinerary.{day - 1}.places": place}},
            return_document=True
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    @staticmethod
    def remove_place_from_itinerary(trip_id: str, day: int, place_name: str) -> Optional[dict]:
        """Remove a place from a specific day"""
        trips_collection = db.get_db()["trips"]
        
        result = trips_collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {"$pull": {f"itinerary.{day - 1}.places": {"name": place_name}}},
            return_document=True
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
    
    @staticmethod
    def update_day_notes(trip_id: str, day: int, notes: str) -> Optional[dict]:
        """Update notes for a day"""
        trips_collection = db.get_db()["trips"]
        
        result = trips_collection.find_one_and_update(
            {"_id": ObjectId(trip_id)},
            {"$set": {f"itinerary.{day - 1}.notes": notes}},
            return_document=True
        )
        
        if result:
            result["_id"] = str(result["_id"])
        
        return result
