from app.database import db
from app.models.trip import Trip, TripCreate, TripUpdate, DayItinerary
from bson import ObjectId
from datetime import datetime, date, timedelta
from typing import List, Optional

# Mock database for testing without MongoDB
MOCK_TRIPS = {}
MOCK_TRIP_COUNTER = 1

class TripService:
    @staticmethod
    def create_trip(user_id: str, trip_data: TripCreate) -> dict:
        """Create a new trip"""
        global MOCK_TRIP_COUNTER
        
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                
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
                print(f"DB trip creation failed: {str(e)}")
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
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
        
        trip_id = f"mock_trip_{MOCK_TRIP_COUNTER}"
        MOCK_TRIP_COUNTER += 1
        
        trip = {
            "_id": trip_id,
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
        
        MOCK_TRIPS[trip_id] = trip
        return trip
    
    @staticmethod
    def get_user_trips(user_id: str) -> List[dict]:
        """Get all trips for a user"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                trips = list(trips_collection.find({"user_id": user_id}))
                
                for trip in trips:
                    trip["_id"] = str(trip["_id"])
                
                return trips
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        user_trips = [trip for trip in MOCK_TRIPS.values() if trip["user_id"] == user_id]
        return user_trips
    
    @staticmethod
    def get_trip(trip_id: str) -> Optional[dict]:
        """Get a specific trip"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                trip = trips_collection.find_one({"_id": ObjectId(trip_id)})
                
                if trip:
                    trip["_id"] = str(trip["_id"])
                
                return trip
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        return MOCK_TRIPS.get(trip_id)
    
    @staticmethod
    def update_trip(trip_id: str, trip_data: TripUpdate) -> Optional[dict]:
        """Update a trip"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                
                update_data = {k: v for k, v in trip_data.model_dump(mode="json").items() if v is not None}
                update_data["updated_at"] = datetime.utcnow()
                
                result = trips_collection.find_one_and_update(
                    {"_id": ObjectId(trip_id)},
                    {"$set": update_data},
                    return_document=True
                )
                
                if result:
                    result["_id"] = str(result["_id"])
                
                return result
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        if trip_id in MOCK_TRIPS:
            trip = MOCK_TRIPS[trip_id]
            update_data = {k: v for k, v in trip_data.model_dump(mode="json").items() if v is not None}
            trip.update(update_data)
            trip["updated_at"] = datetime.utcnow()
            return trip
        
        return None
    
    @staticmethod
    def delete_trip(trip_id: str) -> bool:
        """Delete a trip"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                result = trips_collection.delete_one({"_id": ObjectId(trip_id)})
                return result.deleted_count > 0
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        if trip_id in MOCK_TRIPS:
            del MOCK_TRIPS[trip_id]
            return True
        
        return False
    
    @staticmethod
    def get_public_trips(limit: int = 20, skip: int = 0) -> List[dict]:
        """Get public trips for discovery"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                trips = list(trips_collection.find({"is_public": True})
                            .sort("created_at", -1)
                            .skip(skip)
                            .limit(limit))
                
                for trip in trips:
                    trip["_id"] = str(trip["_id"])
                
                return trips
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        public_trips = [trip for trip in MOCK_TRIPS.values() if trip.get("is_public", False)]
        # Sort by created_at (simple mock sorting)
        public_trips.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
        return public_trips[skip:skip + limit]
    
    @staticmethod
    def add_place_to_itinerary(trip_id: str, day: int, place: dict) -> Optional[dict]:
        """Add a place to a specific day in the itinerary"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                
                place["added_at"] = datetime.utcnow()
                
                result = trips_collection.find_one_and_update(
                    {"_id": ObjectId(trip_id)},
                    {"$push": {f"itinerary.{day - 1}.places": place}},
                    return_document=True
                )
                
                if result:
                    result["_id"] = str(result["_id"])
                
                return result
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        if trip_id in MOCK_TRIPS:
            trip = MOCK_TRIPS[trip_id]
            if 0 <= day - 1 < len(trip.get("itinerary", [])):
                place["added_at"] = datetime.utcnow()
                trip["itinerary"][day - 1]["places"].append(place)
                trip["updated_at"] = datetime.utcnow()
                return trip
        
        return None
    
    @staticmethod
    def remove_place_from_itinerary(trip_id: str, day: int, place_name: str) -> Optional[dict]:
        """Remove a place from a specific day"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                
                result = trips_collection.find_one_and_update(
                    {"_id": ObjectId(trip_id)},
                    {"$pull": {f"itinerary.{day - 1}.places": {"name": place_name}}},
                    return_document=True
                )
                
                if result:
                    result["_id"] = str(result["_id"])
                
                return result
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        if trip_id in MOCK_TRIPS:
            trip = MOCK_TRIPS[trip_id]
            if 0 <= day - 1 < len(trip.get("itinerary", [])):
                places = trip["itinerary"][day - 1]["places"]
                trip["itinerary"][day - 1]["places"] = [p for p in places if p.get("name") != place_name]
                trip["updated_at"] = datetime.utcnow()
                return trip
        
        return None
    
    @staticmethod
    def update_day_notes(trip_id: str, day: int, notes: str) -> Optional[dict]:
        """Update notes for a day"""
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                
                result = trips_collection.find_one_and_update(
                    {"_id": ObjectId(trip_id)},
                    {"$set": {f"itinerary.{day - 1}.notes": notes}},
                    return_document=True
                )
                
                if result:
                    result["_id"] = str(result["_id"])
                
                return result
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        if trip_id in MOCK_TRIPS:
            trip = MOCK_TRIPS[trip_id]
            if 0 <= day - 1 < len(trip.get("itinerary", [])):
                trip["itinerary"][day - 1]["notes"] = notes
                trip["updated_at"] = datetime.utcnow()
                return trip

        return None

    @staticmethod
    def get_admin_report(limit: int = 2000) -> dict:
        """Get admin report data with summary for all trips."""
        trips = []

        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                trips = list(trips_collection.find({})
                            .sort("updated_at", -1)
                            .limit(limit))
                for trip in trips:
                    trip["_id"] = str(trip["_id"])
            except:
                trips = []

        if not trips:
            trips = list(MOCK_TRIPS.values())
            trips.sort(key=lambda t: t.get("updated_at", t.get("created_at", datetime.min)), reverse=True)
            trips = trips[:limit]

        total_days = 0
        total_places = 0
        users = set()
        destination_counts = {}

        for trip in trips:
            itinerary = trip.get("itinerary", []) or []
            total_days += len(itinerary)
            users.add(trip.get("user_id", ""))

            for day in itinerary:
                total_places += len(day.get("places", []) or [])

            dest = str(trip.get("end_location", "")).strip()
            if dest:
                destination_counts[dest] = destination_counts.get(dest, 0) + 1

        public_trips = len([t for t in trips if t.get("is_public")])
        private_trips = len(trips) - public_trips

        top_destinations = [
            {"name": name, "count": count}
            for name, count in sorted(destination_counts.items(), key=lambda item: item[1], reverse=True)[:8]
        ]

        return {
            "summary": {
                "total_trips": len(trips),
                "public_trips": public_trips,
                "private_trips": private_trips,
                "total_days": total_days,
                "total_places": total_places,
                "unique_users": len([u for u in users if u]),
            },
            "top_destinations": top_destinations,
            "trips": trips,
        }
