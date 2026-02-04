from typing import List, Dict
from app.models.trip import PlaceRecommendation

# Sample place database - in production, use a real API
PLACES_DATABASE = {
    "paris": [
        {
            "name": "Eiffel Tower",
            "description": "Iconic iron lattice tower in Paris",
            "coordinates": {"lat": 48.8584, "lng": 2.2945},
            "rating": 4.8,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Eiffel+Tower"
        },
        {
            "name": "Louvre Museum",
            "description": "World's largest art museum",
            "coordinates": {"lat": 48.8606, "lng": 2.3352},
            "rating": 4.7,
            "category": "Museum",
            "image_url": "https://via.placeholder.com/300?text=Louvre"
        },
        {
            "name": "Notre-Dame Cathedral",
            "description": "Historic Gothic cathedral",
            "coordinates": {"lat": 48.8530, "lng": 2.3499},
            "rating": 4.6,
            "category": "Church",
            "image_url": "https://via.placeholder.com/300?text=Notre-Dame"
        },
        {
            "name": "Arc de Triomphe",
            "description": "Monumental arch at the center of Place Charles de Gaulle",
            "coordinates": {"lat": 48.8738, "lng": 2.2950},
            "rating": 4.5,
            "category": "Monument",
            "image_url": "https://via.placeholder.com/300?text=Arc+de+Triomphe"
        }
    ],
    "tokyo": [
        {
            "name": "Senso-ji Temple",
            "description": "Ancient Buddhist temple in Asakusa",
            "coordinates": {"lat": 35.7148, "lng": 139.7967},
            "rating": 4.6,
            "category": "Temple",
            "image_url": "https://via.placeholder.com/300?text=Senso-ji"
        },
        {
            "name": "Tokyo Skytree",
            "description": "Tallest structure in Japan with observation decks",
            "coordinates": {"lat": 35.7101, "lng": 139.8107},
            "rating": 4.5,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Tokyo+Skytree"
        },
        {
            "name": "Meiji Shrine",
            "description": "Shinto shrine dedicated to Emperor Meiji",
            "coordinates": {"lat": 35.6762, "lng": 139.7009},
            "rating": 4.6,
            "category": "Shrine",
            "image_url": "https://via.placeholder.com/300?text=Meiji+Shrine"
        },
        {
            "name": "Shibuya Crossing",
            "description": "Famous pedestrian crossing",
            "coordinates": {"lat": 35.6595, "lng": 139.7004},
            "rating": 4.4,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Shibuya"
        }
    ],
    "newyork": [
        {
            "name": "Statue of Liberty",
            "description": "Iconic copper statue on Liberty Island",
            "coordinates": {"lat": 40.6892, "lng": -74.0445},
            "rating": 4.7,
            "category": "Monument",
            "image_url": "https://via.placeholder.com/300?text=Statue+of+Liberty"
        },
        {
            "name": "Central Park",
            "description": "Large public park in Manhattan",
            "coordinates": {"lat": 40.7829, "lng": -73.9654},
            "rating": 4.6,
            "category": "Park",
            "image_url": "https://via.placeholder.com/300?text=Central+Park"
        },
        {
            "name": "Times Square",
            "description": "Busy pedestrian intersection with bright billboards",
            "coordinates": {"lat": 40.7580, "lng": -73.9855},
            "rating": 4.3,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Times+Square"
        },
        {
            "name": "Empire State Building",
            "description": "Historic Art Deco skyscraper",
            "coordinates": {"lat": 40.7484, "lng": -73.9857},
            "rating": 4.6,
            "category": "Building",
            "image_url": "https://via.placeholder.com/300?text=Empire+State"
        }
    ],
    "ghana": [
        {
            "name": "Cape Coast Castle",
            "description": "Historic colonial fort and museum",
            "coordinates": {"lat": 5.1058, "lng": -1.2433},
            "rating": 4.6,
            "category": "Museum",
            "image_url": "https://via.placeholder.com/300?text=Cape+Coast+Castle"
        },
        {
            "name": "Mole National Park",
            "description": "Ghana's largest wildlife reserve with elephants and antelopes",
            "coordinates": {"lat": 9.5411, "lng": -1.5944},
            "rating": 4.5,
            "category": "National Park",
            "image_url": "https://via.placeholder.com/300?text=Mole+Park"
        },
        {
            "name": "Labadi Beach",
            "description": "Popular beach near Accra with water sports",
            "coordinates": {"lat": 5.3106, "lng": -0.0011},
            "rating": 4.4,
            "category": "Beach",
            "image_url": "https://via.placeholder.com/300?text=Labadi+Beach"
        },
        {
            "name": "Kakum National Park",
            "description": "Park known for canopy walkway through rainforest",
            "coordinates": {"lat": 5.3099, "lng": -1.3467},
            "rating": 4.7,
            "category": "National Park",
            "image_url": "https://via.placeholder.com/300?text=Kakum+Park"
        }
    ],
    "india": [
        {
            "name": "Taj Mahal",
            "description": "UNESCO World Heritage mausoleum in Agra",
            "coordinates": {"lat": 27.1751, "lng": 78.0421},
            "rating": 4.8,
            "category": "Monument",
            "image_url": "https://via.placeholder.com/300?text=Taj+Mahal"
        },
        {
            "name": "Hawa Mahal",
            "description": "Pink Palace of Jaipur",
            "coordinates": {"lat": 26.9245, "lng": 75.8267},
            "rating": 4.6,
            "category": "Historic Site",
            "image_url": "https://via.placeholder.com/300?text=Hawa+Mahal"
        },
        {
            "name": "Varanasi Ghats",
            "description": "Sacred bathing areas on the Ganges River",
            "coordinates": {"lat": 25.3245, "lng": 83.0119},
            "rating": 4.7,
            "category": "Religious Site",
            "image_url": "https://via.placeholder.com/300?text=Varanasi+Ghats"
        },
        {
            "name": "Gateway of India",
            "description": "Iconic monument in Mumbai",
            "coordinates": {"lat": 18.9667, "lng": 72.8344},
            "rating": 4.5,
            "category": "Monument",
            "image_url": "https://via.placeholder.com/300?text=Gateway+of+India"
        }
    ]
}

class PlaceService:
    @staticmethod
    def get_recommendations(location: str, limit: int = 10) -> List[PlaceRecommendation]:
        """Get place recommendations for a location"""
        # Normalize location for lookup
        location_key = location.lower().strip().replace(" ", "")
        
        # Try exact match first
        if location_key in PLACES_DATABASE:
            places = PLACES_DATABASE[location_key]
        else:
            # Try partial match
            matched = False
            for db_key in PLACES_DATABASE.keys():
                if location_key in db_key or db_key in location_key:
                    places = PLACES_DATABASE[db_key]
                    matched = True
                    break
            
            # If no match found, return empty list instead of defaulting to Paris
            if not matched:
                places = []
        
        # Sort by rating and return top places
        if places:
            sorted_places = sorted(places, key=lambda x: x["rating"], reverse=True)
            return sorted_places[:limit]
        else:
            return []
    
    @staticmethod
    def search_places(query: str) -> List[PlaceRecommendation]:
        """Search for places across all locations"""
        query_lower = query.lower()
        results = []
        
        for location_places in PLACES_DATABASE.values():
            for place in location_places:
                if query_lower in place["name"].lower() or query_lower in place["description"].lower():
                    results.append(place)
        
        return results
