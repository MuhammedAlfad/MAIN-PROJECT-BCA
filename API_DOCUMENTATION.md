# API Documentation

Complete reference for all Trip Planner API endpoints.

## Base URL

- **Local**: `http://localhost:8000`
- **Production**: `https://your-api-domain.com`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer {access_token}
```

Get token from `/api/auth/login` or `/api/auth/register` response.

---

## Authentication Endpoints

### Register User

Create a new user account.

```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword123"
}
```

**Response (201)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username",
    "profile": {
      "bio": "",
      "profile_picture": null,
      "followers": 0,
      "following": 0
    },
    "created_at": "2024-01-20T12:00:00"
  }
}
```

**Errors**
```json
{
  "detail": "Email or username already exists"
}
```

---

### Login

Authenticate and get access token.

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username",
    "profile": {
      "bio": "",
      "profile_picture": null,
      "followers": 0,
      "following": 0
    },
    "created_at": "2024-01-20T12:00:00"
  }
}
```

**Errors**
```json
{
  "detail": "Invalid email or password"
}
```

---

### Verify Token

Check if a token is valid and get user info.

```
POST /api/auth/verify-token
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200)**
```json
{
  "valid": true,
  "user_id": "507f1f77bcf86cd799439011",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "username",
    "profile": {
      "bio": "",
      "profile_picture": null,
      "followers": 0,
      "following": 0
    },
    "created_at": "2024-01-20T12:00:00"
  }
}
```

---

## Trip Endpoints

### Create Trip

Create a new trip.

```
POST /api/trips/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Paris Adventure",
  "description": "3 days exploring Paris",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "is_public": false
}
```

**Response (200)**
```json
{
  "_id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "title": "Paris Adventure",
  "description": "3 days exploring Paris",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "itinerary": [
    {
      "day": 1,
      "date": "2024-02-01",
      "places": [],
      "notes": ""
    },
    {
      "day": 2,
      "date": "2024-02-02",
      "places": [],
      "notes": ""
    },
    {
      "day": 3,
      "date": "2024-02-03",
      "places": [],
      "notes": ""
    }
  ],
  "is_public": false,
  "cover_image": null,
  "created_at": "2024-01-20T12:00:00",
  "updated_at": "2024-01-20T12:00:00"
}
```

---

### Get My Trips

Get all trips for current user.

```
GET /api/trips/my-trips
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "trips": [
    {
      "_id": "507f191e810c19729de860ea",
      "user_id": "507f1f77bcf86cd799439011",
      "title": "Paris Adventure",
      "description": "3 days exploring Paris",
      "start_location": "Paris",
      "end_location": "Paris",
      "start_date": "2024-02-01",
      "end_date": "2024-02-03",
      "itinerary": [...],
      "is_public": false,
      "cover_image": null,
      "created_at": "2024-01-20T12:00:00",
      "updated_at": "2024-01-20T12:00:00"
    }
  ]
}
```

---

### Get Specific Trip

Get a specific trip by ID.

```
GET /api/trips/{trip_id}
```

**Response (200)**
```json
{
  "_id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "title": "Paris Adventure",
  "description": "3 days exploring Paris",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "itinerary": [...],
  "is_public": true,
  "cover_image": null,
  "created_at": "2024-01-20T12:00:00",
  "updated_at": "2024-01-20T12:00:00"
}
```

---

### Update Trip

Update trip details.

```
PUT /api/trips/{trip_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "is_public": true,
  "cover_image": "https://example.com/image.jpg"
}
```

**Response (200)**
```json
{
  "_id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "title": "Updated Title",
  "description": "Updated description",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "itinerary": [...],
  "is_public": true,
  "cover_image": "https://example.com/image.jpg",
  "created_at": "2024-01-20T12:00:00",
  "updated_at": "2024-01-20T13:00:00"
}
```

---

### Delete Trip

Delete a trip permanently.

```
DELETE /api/trips/{trip_id}
Authorization: Bearer {token}
```

**Response (200)**
```json
{
  "message": "Trip deleted successfully"
}
```

---

### Get Public Trips

Browse public trips from all users.

```
GET /api/trips/discover/public?limit=20&skip=0
```

**Query Parameters**
- `limit` (optional, default: 20) - Number of trips to return
- `skip` (optional, default: 0) - Number of trips to skip (pagination)

**Response (200)**
```json
{
  "trips": [
    {
      "_id": "507f191e810c19729de860ea",
      "user_id": "507f1f77bcf86cd799439011",
      "title": "Paris Adventure",
      "description": "3 days exploring Paris",
      "start_location": "Paris",
      "end_location": "Paris",
      "start_date": "2024-02-01",
      "end_date": "2024-02-03",
      "itinerary": [...],
      "is_public": true,
      "cover_image": null,
      "created_at": "2024-01-20T12:00:00",
      "updated_at": "2024-01-20T12:00:00"
    }
  ]
}
```

---

## Itinerary Endpoints

### Add Place to Itinerary

Add a place to a specific day in the itinerary.

```
POST /api/trips/{trip_id}/add-place/{day}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Eiffel Tower",
  "description": "Iconic iron lattice tower in Paris",
  "coordinates": {
    "lat": 48.8584,
    "lng": 2.2945
  },
  "rating": 4.8,
  "category": "Landmark",
  "image_url": "https://example.com/eiffel.jpg"
}
```

**Response (200)**
```json
{
  "_id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "title": "Paris Adventure",
  "description": "3 days exploring Paris",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "itinerary": [
    {
      "day": 1,
      "date": "2024-02-01",
      "places": [
        {
          "name": "Eiffel Tower",
          "description": "Iconic iron lattice tower in Paris",
          "coordinates": {"lat": 48.8584, "lng": 2.2945},
          "rating": 4.8,
          "category": "Landmark",
          "image_url": "https://example.com/eiffel.jpg",
          "added_at": "2024-01-20T12:00:00"
        }
      ],
      "notes": ""
    }
  ],
  "is_public": false,
  "cover_image": null,
  "created_at": "2024-01-20T12:00:00",
  "updated_at": "2024-01-20T12:00:00"
}
```

---

### Remove Place from Itinerary

Remove a place from a specific day.

```
DELETE /api/trips/{trip_id}/remove-place/{day}/{place_name}
Authorization: Bearer {token}
```

**Path Parameters**
- `trip_id` - Trip ID
- `day` - Day number (1-based)
- `place_name` - Exact name of the place to remove

**Response (200)**
```json
{
  "_id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "title": "Paris Adventure",
  "description": "3 days exploring Paris",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "itinerary": [...],
  "is_public": false,
  "cover_image": null,
  "created_at": "2024-01-20T12:00:00",
  "updated_at": "2024-01-20T12:00:00"
}
```

---

### Update Day Notes

Update notes for a specific day.

```
PUT /api/trips/{trip_id}/day/{day}/notes
Authorization: Bearer {token}
Content-Type: application/json

{
  "notes": "Amazing first day! Visited the Eiffel Tower and had lunch at a local café."
}
```

**Response (200)**
```json
{
  "_id": "507f191e810c19729de860ea",
  "user_id": "507f1f77bcf86cd799439011",
  "title": "Paris Adventure",
  "description": "3 days exploring Paris",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": "2024-02-01",
  "end_date": "2024-02-03",
  "itinerary": [
    {
      "day": 1,
      "date": "2024-02-01",
      "places": [],
      "notes": "Amazing first day! Visited the Eiffel Tower and had lunch at a local café."
    }
  ],
  "is_public": false,
  "cover_image": null,
  "created_at": "2024-01-20T12:00:00",
  "updated_at": "2024-01-20T12:00:00"
}
```

---

## Place Endpoints

### Get Recommendations

Get recommended places for a location.

```
GET /api/places/recommendations?location=Paris&limit=10
```

**Query Parameters**
- `location` (required) - City or location name
- `limit` (optional, default: 10) - Number of recommendations

**Response (200)**
```json
{
  "location": "Paris",
  "places": [
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
    }
  ]
}
```

---

### Search Places

Search for places across all locations.

```
GET /api/places/search?query=Eiffel
```

**Query Parameters**
- `query` (required) - Search term

**Response (200)**
```json
{
  "query": "Eiffel",
  "results": [
    {
      "name": "Eiffel Tower",
      "description": "Iconic iron lattice tower in Paris",
      "coordinates": {"lat": 48.8584, "lng": 2.2945},
      "rating": 4.8,
      "category": "Landmark",
      "image_url": "https://via.placeholder.com/300?text=Eiffel+Tower"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid token"
}
```

### 403 Forbidden
```json
{
  "detail": "Not authorized to perform this action"
}
```

### 404 Not Found
```json
{
  "detail": "Trip not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Testing Endpoints

You can test these endpoints using:
- **Postman** - Import requests
- **cURL** - Command line
- **Thunder Client** - VS Code extension
- **Swagger UI** - Built-in FastAPI docs at `/docs`

### Quick Test with cURL

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create trip (replace TOKEN)
curl -X POST http://localhost:8000/api/trips/create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Trip","start_location":"Paris","end_location":"Paris","start_date":"2024-02-01","end_date":"2024-02-03","is_public":false}'

# Get recommendations
curl "http://localhost:8000/api/places/recommendations?location=Paris"
```

---

## Rate Limiting

No rate limiting currently implemented. For production, add rate limiting to prevent abuse:
- 100 requests per minute per IP for public endpoints
- 1000 requests per hour per user for authenticated endpoints

---

## Pagination

List endpoints that return multiple items support pagination:

```
GET /api/trips/discover/public?limit=10&skip=20
```

Returns items 20-30 (skip 20, get 10 items).

---

## Timestamps

All timestamps are in ISO 8601 format (UTC):
```
2024-01-20T12:00:00
```

---

## API Status

Check API health:

```
GET /api/health
```

**Response (200)**
```json
{
  "status": "healthy"
}
```

---

## Support

For API issues:
1. Check error message in response
2. Verify authentication token is valid
3. Ensure all required fields are provided
4. Check API documentation above
5. Test with cURL or Postman first

Happy API usage! 🚀
