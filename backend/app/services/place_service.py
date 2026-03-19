from typing import List, Dict, Optional, Tuple
from math import radians, sin, cos, sqrt, atan2
import requests
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
    ],
    "boston": [
        {
            "name": "Freedom Trail",
            "description": "Historic walking trail through downtown Boston",
            "coordinates": {"lat": 42.3598, "lng": -71.0585},
            "rating": 4.6,
            "category": "Historic Site",
            "image_url": "https://via.placeholder.com/300?text=Freedom+Trail"
        },
        {
            "name": "Fenway Park",
            "description": "Historic baseball stadium and home of Red Sox",
            "coordinates": {"lat": 42.3466, "lng": -71.0972},
            "rating": 4.7,
            "category": "Stadium",
            "image_url": "https://via.placeholder.com/300?text=Fenway+Park"
        },
        {
            "name": "Boston Common",
            "description": "America's oldest public park",
            "coordinates": {"lat": 42.3550, "lng": -71.0656},
            "rating": 4.5,
            "category": "Park",
            "image_url": "https://via.placeholder.com/300?text=Boston+Common"
        },
        {
            "name": "Harvard University",
            "description": "Ivy League university in Cambridge",
            "coordinates": {"lat": 42.3770, "lng": -71.1167},
            "rating": 4.8,
            "category": "University",
            "image_url": "https://via.placeholder.com/300?text=Harvard"
        }
    ],
    "london": [
        {
            "name": "Big Ben",
            "description": "Iconic clock tower at Westminster",
            "coordinates": {"lat": 51.5007, "lng": -0.1246},
            "rating": 4.6,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Big+Ben"
        },
        {
            "name": "Tower Bridge",
            "description": "Victorian Gothic bridge over Thames",
            "coordinates": {"lat": 51.5055, "lng": -0.0754},
            "rating": 4.7,
            "category": "Bridge",
            "image_url": "https://via.placeholder.com/300?text=Tower+Bridge"
        },
        {
            "name": "British Museum",
            "description": "World history and culture museum",
            "coordinates": {"lat": 51.5194, "lng": -0.1270},
            "rating": 4.8,
            "category": "Museum",
            "image_url": "https://via.placeholder.com/300?text=British+Museum"
        },
        {
            "name": "Buckingham Palace",
            "description": "Official residence of the British monarch",
            "coordinates": {"lat": 51.5014, "lng": -0.1419},
            "rating": 4.5,
            "category": "Palace",
            "image_url": "https://via.placeholder.com/300?text=Buckingham+Palace"
        }
    ],
    "dubai": [
        {
            "name": "Burj Khalifa",
            "description": "World's tallest building",
            "coordinates": {"lat": 25.1972, "lng": 55.2744},
            "rating": 4.8,
            "category": "Skyscraper",
            "image_url": "https://via.placeholder.com/300?text=Burj+Khalifa"
        },
        {
            "name": "Dubai Mall",
            "description": "One of the world's largest shopping malls",
            "coordinates": {"lat": 25.1972, "lng": 55.2794},
            "rating": 4.6,
            "category": "Shopping",
            "image_url": "https://via.placeholder.com/300?text=Dubai+Mall"
        },
        {
            "name": "Palm Jumeirah",
            "description": "Artificial archipelago in Palm shape",
            "coordinates": {"lat": 25.1125, "lng": 55.1399},
            "rating": 4.7,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Palm+Jumeirah"
        },
        {
            "name": "Dubai Fountain",
            "description": "Choreographed fountain show outside Dubai Mall",
            "coordinates": {"lat": 25.1972, "lng": 55.2744},
            "rating": 4.5,
            "category": "Attraction",
            "image_url": "https://via.placeholder.com/300?text=Dubai+Fountain"
        }
    ],
    "brazil": [
        {
            "name": "Christ the Redeemer",
            "description": "Iconic statue overlooking Rio de Janeiro",
            "coordinates": {"lat": -22.9519, "lng": -43.2105},
            "rating": 4.8,
            "category": "Monument",
            "image_url": "https://via.placeholder.com/300?text=Christ+the+Redeemer"
        },
        {
            "name": "Sugarloaf Mountain",
            "description": "Granite peak with panoramic views of Rio",
            "coordinates": {"lat": -22.9496, "lng": -43.1548},
            "rating": 4.7,
            "category": "Landmark",
            "image_url": "https://via.placeholder.com/300?text=Sugarloaf+Mountain"
        },
        {
            "name": "Iguazu Falls",
            "description": "Massive waterfall system on the Brazil-Argentina border",
            "coordinates": {"lat": -25.6953, "lng": -54.4367},
            "rating": 4.9,
            "category": "Waterfall",
            "image_url": "https://via.placeholder.com/300?text=Iguazu+Falls"
        },
        {
            "name": "Copacabana Beach",
            "description": "Famous beach district in Rio de Janeiro",
            "coordinates": {"lat": -22.9711, "lng": -43.1822},
            "rating": 4.6,
            "category": "Beach",
            "image_url": "https://via.placeholder.com/300?text=Copacabana+Beach"
        },
        {
            "name": "Amazon Theatre",
            "description": "Historic opera house in Manaus",
            "coordinates": {"lat": -3.1303, "lng": -60.0236},
            "rating": 4.5,
            "category": "Historic Site",
            "image_url": "https://via.placeholder.com/300?text=Amazon+Theatre"
        }
    ]
}

class PlaceService:
    @staticmethod
    def _normalize_location(value: str) -> str:
        """Normalize location text for key matching."""
        return "".join(ch for ch in value.lower().strip() if ch.isalnum())

    @staticmethod
    def _haversine_km(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
        """Compute haversine distance in kilometers between two lat/lon points."""
        earth_radius_km = 6371.0
        dlat = radians(b_lat - a_lat)
        dlon = radians(b_lon - a_lon)
        arc = sin(dlat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(dlon / 2) ** 2
        return earth_radius_km * (2 * atan2(sqrt(arc), sqrt(1 - arc)))

    @staticmethod
    def _safe_rating(tags: Dict[str, str]) -> float:
        """Extract a 0-5 style rating from OSM tags; fall back to a neutral value."""
        for key in ("stars", "rating"):
            raw = tags.get(key)
            if not raw:
                continue
            cleaned = "".join(ch for ch in str(raw) if ch.isdigit() or ch == ".")
            if not cleaned:
                continue
            try:
                value = float(cleaned)
                if value > 5:
                    continue
                return max(0.0, min(value, 5.0))
            except ValueError:
                continue
        return 4.2

    @staticmethod
    def _category_from_tags(tags: Dict[str, str]) -> str:
        """Map OSM tags to a user-friendly category."""
        tourism = tags.get("tourism")
        historic = tags.get("historic")
        leisure = tags.get("leisure")
        natural = tags.get("natural")

        if tourism:
            tourism_map = {
                "attraction": "Attraction",
                "museum": "Museum",
                "theme_park": "Theme Park",
                "zoo": "Zoo",
                "aquarium": "Aquarium",
                "gallery": "Gallery",
                "viewpoint": "Viewpoint",
            }
            return tourism_map.get(tourism, tourism.replace("_", " ").title())
        if historic:
            return "Historic Site"
        if leisure:
            leisure_map = {
                "park": "Park",
                "garden": "Garden",
                "nature_reserve": "Nature Reserve",
                "beach_resort": "Beach",
                "marina": "Marina",
            }
            return leisure_map.get(leisure, leisure.replace("_", " ").title())
        if natural:
            natural_map = {
                "beach": "Beach",
                "peak": "Mountain",
                "waterfall": "Waterfall",
                "cave": "Cave",
            }
            return natural_map.get(natural, natural.replace("_", " ").title())

        return "Attraction"

    @staticmethod
    def _is_accommodation(tags: Dict[str, str]) -> bool:
        """Filter out lodging/accommodation POIs from recommendations."""
        tourism = str(tags.get("tourism") or "").lower().strip()
        amenity = str(tags.get("amenity") or "").lower().strip()
        building = str(tags.get("building") or "").lower().strip()

        tourism_lodging = {
            "hotel",
            "hostel",
            "guest_house",
            "motel",
            "apartment",
            "chalet",
            "alpine_hut",
            "camp_site",
            "camp_pitch",
            "caravan_site",
        }
        amenity_lodging = {"hotel", "hostel", "motel"}

        return tourism in tourism_lodging or amenity in amenity_lodging or building == "hotel"

    @staticmethod
    def _is_tourist_spot(tags: Dict[str, str]) -> bool:
        """Keep only tourist-focused POIs."""
        tourism = str(tags.get("tourism") or "").lower().strip()
        historic = str(tags.get("historic") or "").lower().strip()
        leisure = str(tags.get("leisure") or "").lower().strip()
        natural = str(tags.get("natural") or "").lower().strip()
        boundary = str(tags.get("boundary") or "").lower().strip()
        water = str(tags.get("water") or "").lower().strip()
        man_made = str(tags.get("man_made") or "").lower().strip()

        allowed_tourism = {
            "attraction",
            "museum",
            "theme_park",
            "zoo",
            "aquarium",
            "gallery",
            "viewpoint",
            "artwork",
            "picnic_site",
        }
        allowed_leisure = {"park", "garden", "nature_reserve"}
        allowed_natural = {"beach", "peak", "waterfall", "cave"}
        allowed_water = {"lake", "reservoir"}
        allowed_man_made = {"tower", "observatory"}

        if tourism in allowed_tourism:
            return True
        if historic:
            return True
        if leisure in allowed_leisure:
            return True
        if natural in allowed_natural:
            return True
        if boundary == "national_park":
            return True
        if water in allowed_water:
            return True
        if man_made in allowed_man_made:
            return True
        return False

    @staticmethod
    def _description_from_tags(tags: Dict[str, str], category: str, location: str) -> str:
        """Build a readable description from OSM tags."""
        if tags.get("description"):
            return tags["description"]
        if tags.get("wikidata"):
            return f"Popular {category.lower()} in {location}"
        if tags.get("tourism"):
            return f"Well-known {tags['tourism'].replace('_', ' ')} in {location}"
        if tags.get("historic"):
            return f"Notable historic site in {location}"
        if tags.get("leisure"):
            return f"Popular {tags['leisure'].replace('_', ' ')} in {location}"
        if tags.get("natural"):
            return f"Scenic {tags['natural'].replace('_', ' ')} in {location}"
        if tags.get("boundary") == "national_park":
            return f"National park near {location}"
        if tags.get("water"):
            return f"Scenic {tags['water'].replace('_', ' ')} near {location}"
        if tags.get("man_made"):
            return f"Popular {tags['man_made'].replace('_', ' ')} near {location}"
        return f"Popular place to visit in {location}"

    @staticmethod
    def _overpass_queries(center_lat: float, center_lon: float, radius_m: int, overpass_limit: int) -> List[str]:
        """Use a primary tourist query and a broader fallback query for sparse areas."""
        return [
            f"""
[out:json][timeout:25];
(
  node(around:{radius_m},{center_lat},{center_lon})["tourism"~"attraction|museum|theme_park|zoo|aquarium|gallery|viewpoint|artwork|picnic_site"];
  way(around:{radius_m},{center_lat},{center_lon})["tourism"~"attraction|museum|theme_park|zoo|aquarium|gallery|viewpoint|artwork|picnic_site"];
  relation(around:{radius_m},{center_lat},{center_lon})["tourism"~"attraction|museum|theme_park|zoo|aquarium|gallery|viewpoint|artwork|picnic_site"];
  node(around:{radius_m},{center_lat},{center_lon})["historic"];
  way(around:{radius_m},{center_lat},{center_lon})["historic"];
  relation(around:{radius_m},{center_lat},{center_lon})["historic"];
  node(around:{radius_m},{center_lat},{center_lon})["leisure"~"park|garden|nature_reserve"];
  way(around:{radius_m},{center_lat},{center_lon})["leisure"~"park|garden|nature_reserve"];
  relation(around:{radius_m},{center_lat},{center_lon})["leisure"~"park|garden|nature_reserve"];
  node(around:{radius_m},{center_lat},{center_lon})["natural"~"beach|peak|waterfall|cave"];
  way(around:{radius_m},{center_lat},{center_lon})["natural"~"beach|peak|waterfall|cave"];
  relation(around:{radius_m},{center_lat},{center_lon})["natural"~"beach|peak|waterfall|cave"];
  node(around:{radius_m},{center_lat},{center_lon})["water"~"lake|reservoir"];
  way(around:{radius_m},{center_lat},{center_lon})["water"~"lake|reservoir"];
  relation(around:{radius_m},{center_lat},{center_lon})["water"~"lake|reservoir"];
  node(around:{radius_m},{center_lat},{center_lon})["man_made"~"tower|observatory"];
  way(around:{radius_m},{center_lat},{center_lon})["man_made"~"tower|observatory"];
  relation(around:{radius_m},{center_lat},{center_lon})["man_made"~"tower|observatory"];
  relation(around:{radius_m},{center_lat},{center_lon})["boundary"="national_park"];
);
out center {overpass_limit};
""",
            f"""
[out:json][timeout:25];
(
  node(around:{radius_m},{center_lat},{center_lon})["tourism"];
  way(around:{radius_m},{center_lat},{center_lon})["tourism"];
  relation(around:{radius_m},{center_lat},{center_lon})["tourism"];
  node(around:{radius_m},{center_lat},{center_lon})["historic"];
  way(around:{radius_m},{center_lat},{center_lon})["historic"];
  relation(around:{radius_m},{center_lat},{center_lon})["historic"];
  node(around:{radius_m},{center_lat},{center_lon})["leisure"];
  way(around:{radius_m},{center_lat},{center_lon})["leisure"];
  relation(around:{radius_m},{center_lat},{center_lon})["leisure"];
  node(around:{radius_m},{center_lat},{center_lon})["natural"];
  way(around:{radius_m},{center_lat},{center_lon})["natural"];
  relation(around:{radius_m},{center_lat},{center_lon})["natural"];
  node(around:{radius_m},{center_lat},{center_lon})["water"];
  way(around:{radius_m},{center_lat},{center_lon})["water"];
  relation(around:{radius_m},{center_lat},{center_lon})["water"];
  node(around:{radius_m},{center_lat},{center_lon})["man_made"];
  way(around:{radius_m},{center_lat},{center_lon})["man_made"];
  relation(around:{radius_m},{center_lat},{center_lon})["man_made"];
  relation(around:{radius_m},{center_lat},{center_lon})["boundary"];
);
out center {overpass_limit};
""",
        ]

    @staticmethod
    def _fetch_overpass_elements(
        center_lat: float,
        center_lon: float,
        radius_m: int,
        overpass_limit: int,
        headers: Dict[str, str],
    ) -> List[Dict]:
        """Try multiple Overpass mirrors and query shapes before giving up."""
        endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
        ]

        for query in PlaceService._overpass_queries(center_lat, center_lon, radius_m, overpass_limit):
            for endpoint in endpoints:
                try:
                    response = requests.post(endpoint, data=query, headers=headers, timeout=25)
                    if response.status_code != 200:
                        continue
                    payload = response.json()
                    elements = payload.get("elements") or []
                    if elements:
                        return elements
                except Exception:
                    continue
        return []

    @staticmethod
    def _nominatim_fallback_recommendations(
        location: str,
        limit: int,
        center_lat: float,
        center_lon: float,
        radius_km: float,
        headers: Dict[str, str],
    ) -> List[PlaceRecommendation]:
        """Fallback search when Overpass is empty or unavailable."""
        queries = [
            f"tourist attractions in {location}",
            f"viewpoints in {location}",
            f"museums in {location}",
        ]
        seen = set()
        results: List[Dict] = []

        def classify(entry: Dict) -> Optional[Tuple[str, str]]:
            entry_class = str(entry.get("class") or "").lower().strip()
            entry_type = str(entry.get("type") or "").lower().strip()

            if entry_type in {"hotel", "hostel", "guest_house", "motel"}:
                return None
            if entry_class == "tourism":
                tourism_map = {
                    "attraction": "Attraction",
                    "museum": "Museum",
                    "theme_park": "Theme Park",
                    "zoo": "Zoo",
                    "aquarium": "Aquarium",
                    "gallery": "Gallery",
                    "viewpoint": "Viewpoint",
                    "artwork": "Artwork",
                    "picnic_site": "Picnic Site",
                }
                if entry_type in tourism_map:
                    return tourism_map[entry_type], f"Popular {entry_type.replace('_', ' ')} in {location}"
            if entry_class == "historic":
                return "Historic Site", f"Notable historic site in {location}"
            if entry_class == "leisure" and entry_type in {"park", "garden", "nature_reserve"}:
                return entry_type.replace("_", " ").title(), f"Popular {entry_type.replace('_', ' ')} in {location}"
            if entry_class == "natural" and entry_type in {"beach", "peak", "waterfall", "cave"}:
                return entry_type.replace("_", " ").title(), f"Scenic {entry_type.replace('_', ' ')} in {location}"
            if entry_class == "boundary" and entry_type == "national_park":
                return "National Park", f"National park near {location}"
            if entry_class == "water" and entry_type in {"lake", "reservoir"}:
                return entry_type.title(), f"Scenic {entry_type} near {location}"
            return None

        for query in queries:
            try:
                response = requests.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": query, "format": "jsonv2", "limit": max(limit * 4, 30)},
                    headers=headers,
                    timeout=10,
                )
                if response.status_code != 200:
                    continue
                data = response.json()
            except Exception:
                continue

            for entry in data or []:
                classified = classify(entry)
                if not classified:
                    continue

                try:
                    lat = float(entry["lat"])
                    lon = float(entry["lon"])
                except (KeyError, TypeError, ValueError):
                    continue

                distance_km = PlaceService._haversine_km(center_lat, center_lon, lat, lon)
                if distance_km > radius_km:
                    continue

                name = (entry.get("name") or entry.get("display_name") or "").split(",")[0].strip()
                if not name:
                    continue

                dedupe_key = (name.lower(), round(lat, 3), round(lon, 3))
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)

                category, description = classified
                importance = float(entry.get("importance") or 0)
                rating = max(4.0, min(4.8, 4.1 + importance))
                results.append(
                    {
                        "name": name,
                        "description": description,
                        "coordinates": {"lat": lat, "lng": lon},
                        "rating": rating,
                        "category": category,
                        "image_url": None,
                        "distance_km": distance_km,
                    }
                )

            if results:
                break

        ranked = sorted(results, key=lambda x: (x["distance_km"], -x["rating"]))
        for place in ranked:
            place.pop("distance_km", None)
        return ranked[:limit]

    @staticmethod
    def _radius_for_location_scope(geocode_entry: Dict) -> int:
        """Choose search radius by location granularity."""
        # Nominatim commonly returns addresstype=country/state/county/etc.
        addresstype = str(geocode_entry.get("addresstype") or "").lower().strip()
        country_scopes = {"country"}
        state_scopes = {
            "state",
            "province",
            "region",
        }
        district_scopes = {
            "district",
            "state_district",
            "county",
            "city_district",
        }

        if addresstype in country_scopes:
            return 250_000  # 250km for country-level queries
        if addresstype in state_scopes:
            return 100_000  # 100km for state-level queries
        if addresstype in district_scopes:
            return 50_000  # 50km for district-level queries
        return 50_000

    @staticmethod
    def _worldwide_recommendations(location: str, limit: int = 10) -> List[PlaceRecommendation]:
        """Fetch nearby points of interest worldwide using OpenStreetMap + Overpass."""
        headers = {"User-Agent": "trip-planner-app/1.0 (development)"}

        # 1) Geocode location text to a center point.
        geocode_url = "https://nominatim.openstreetmap.org/search"
        geocode_params = {"q": location, "format": "json", "limit": 1, "addressdetails": 1}
        geocode_resp = requests.get(geocode_url, params=geocode_params, headers=headers, timeout=8)
        if geocode_resp.status_code != 200:
            return []

        geocode_data = geocode_resp.json()
        if not geocode_data:
            return []

        center_lat = float(geocode_data[0]["lat"])
        center_lon = float(geocode_data[0]["lon"])
        radius_m = PlaceService._radius_for_location_scope(geocode_data[0])
        radius_km = radius_m / 1000.0

        # 2) Fetch nearby POIs around geocoded center.
        overpass_limit = max(limit * 20, 200)
        elements = PlaceService._fetch_overpass_elements(center_lat, center_lon, radius_m, overpass_limit, headers)
        if not elements:
            return PlaceService._nominatim_fallback_recommendations(
                location,
                limit,
                center_lat,
                center_lon,
                radius_km,
                headers,
            )

        places: List[Dict] = []
        seen = set()
        for element in elements:
            tags = element.get("tags") or {}
            if not PlaceService._is_tourist_spot(tags):
                continue
            if PlaceService._is_accommodation(tags):
                continue

            name = (tags.get("name") or "").strip()
            if not name:
                continue

            if "lat" in element and "lon" in element:
                lat = float(element["lat"])
                lon = float(element["lon"])
            else:
                center = element.get("center") or {}
                if "lat" not in center or "lon" not in center:
                    continue
                lat = float(center["lat"])
                lon = float(center["lon"])

            # Deduplicate by name + approx coordinate.
            dedupe_key = (name.lower(), round(lat, 3), round(lon, 3))
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            category = PlaceService._category_from_tags(tags)
            distance_km = PlaceService._haversine_km(center_lat, center_lon, lat, lon)
            if distance_km > radius_km:
                continue

            places.append(
                {
                    "name": name,
                    "description": PlaceService._description_from_tags(tags, category, location),
                    "coordinates": {"lat": lat, "lng": lon},
                    "rating": PlaceService._safe_rating(tags),
                    "category": category,
                    "image_url": None,
                    "distance_km": distance_km,
                }
            )

        if not places:
            return PlaceService._nominatim_fallback_recommendations(
                location,
                limit,
                center_lat,
                center_lon,
                radius_km,
                headers,
            )

        ranked = sorted(places, key=lambda x: (x["distance_km"], -x["rating"]))
        for place in ranked:
            place.pop("distance_km", None)
        return ranked[:limit]

    @staticmethod
    def get_recommendations(location: str, limit: int = 10) -> List[PlaceRecommendation]:
        """Get place recommendations for a location"""
        # Use live geo recommendations first so radius logic is applied.
        try:
            live_places = PlaceService._worldwide_recommendations(location, limit)
            if live_places:
                return live_places
        except Exception:
            # Fall back to local static data below.
            pass

        # Normalize location for lookup
        location_key = PlaceService._normalize_location(location)
        places = []
        
        # Try exact match first
        if location_key in PLACES_DATABASE:
            places = PLACES_DATABASE[location_key]
        else:
            # Try common city name variations
            variations = {
                "newyork": "newyork",
                "nyc": "newyork", 
                "newyorkcity": "newyork",
                "boston": "boston",
                "london": "london",
                "paris": "paris",
                "tokyo": "tokyo",
                "dubai": "dubai",
                "ghana": "ghana",
                "india": "india",
                "brazil": "brazil",
                "brasil": "brazil",
                "rio": "brazil",
                "riodejaneiro": "brazil",
                "saopaulo": "brazil",
                "saopaulocity": "brazil",
                "kolkata": "india",
                "calcuta": "india",
                "calcutta": "india",
                "newdelhi": "india",
                "delhi": "india",
                "mumbai": "india",
                "agra": "india",
                "jaipur": "india",
                "varanasi": "india",
                "usa": "newyork",  # Default to New York for USA
                "uk": "london",    # Default to London for UK
                "france": "paris",  # Default to Paris for France
                "japan": "tokyo",   # Default to Tokyo for Japan
                "uae": "dubai"      # Default to Dubai for UAE
            }
            
            match_key = variations.get(location_key)
            if match_key and match_key in PLACES_DATABASE:
                places = PLACES_DATABASE[match_key]
            else:
                places = []
        
        # Sort by rating and return top places
        if not places:
            return []

        sorted_places = sorted(places, key=lambda x: x["rating"], reverse=True)
        return sorted_places[:limit]
    
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
