# Architecture & System Design

Complete technical architecture of the Trip Planner platform.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER BROWSER (Frontend)                      │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App (http://localhost:3000)                            │
│  ├─ Pages (Login, Home, Discover, Profile, Edit)              │
│  ├─ Components (Cards, Forms, Editor)                          │
│  ├─ API Client (Axios with auth interceptors)                 │
│  └─ State (React Context for auth)                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
          ┌──────▼──────────────────────┐
          │   HTTP REST Requests        │
          │   with JWT Bearer Token     │
          └──────┬──────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│              FastAPI Backend (http://localhost:8000)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Routes Layer ──────────────────────────────────┐           │
│  │ ├─ /api/auth/*         (Login, Register)       │           │
│  │ ├─ /api/trips/*        (CRUD operations)       │           │
│  │ └─ /api/places/*       (Recommendations)       │           │
│  └──────────────────────────────────────────────────┘           │
│                     ↓                                            │
│  ┌─ Services Layer ─────────────────────────────────┐           │
│  │ ├─ AuthService         (Authentication)         │           │
│  │ ├─ TripService         (Trip management)        │           │
│  │ └─ PlaceService        (Recommendations)        │           │
│  └──────────────────────────────────────────────────┘           │
│                     ↓                                            │
│  ┌─ Data Layer ─────────────────────────────────────┐           │
│  │ └─ MongoDB Connection & Queries                 │           │
│  └──────────────────────────────────────────────────┘           │
└────────────────┬────────────────────────────────────────────────┘
                 │
          ┌──────▼──────────────────────┐
          │   MongoDB Driver (Pymongo)  │
          │   Collections API           │
          └──────┬──────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                   MongoDB Database                              │
├─────────────────────────────────────────────────────────────────┤
│  ├─ users        Collection (Users & profiles)                 │
│  └─ trips        Collection (Trips & itineraries)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

### User Registration Flow
```
User Input (Email, Password)
        ↓
RegisterForm Component
        ↓
API Client (POST /api/auth/register)
        ↓
FastAPI Route Handler
        ↓
AuthService.register_user()
        ↓
Hash Password (bcrypt)
        ↓
MongoDB Insert User
        ↓
Create JWT Token
        ↓
Return {token, user}
        ↓
Frontend: Store token in localStorage
        ↓
Redirect to Home
```

### Trip Creation Flow
```
User Input (Title, Location, Dates)
        ↓
CreateTripModal Component
        ↓
API Client (POST /api/trips/create)
        ↓
Authentication Check (JWT verification)
        ↓
FastAPI Route Handler
        ↓
TripService.create_trip()
        ↓
Generate Itinerary (Day-by-day)
        ↓
MongoDB Insert Trip
        ↓
Return {trip_id, trip_data}
        ↓
Frontend: Redirect to edit page
        ↓
User: Edit itinerary and add places
```

### Adding Place to Itinerary Flow
```
User: Click "Add Place" button
        ↓
Frontend: Fetch recommendations (GET /api/places/recommendations)
        ↓
Display recommended places
        ↓
User: Click "Add" on place
        ↓
API Client (POST /api/trips/{id}/add-place/{day})
        ↓
Authentication Check
        ↓
TripService.add_place_to_itinerary()
        ↓
MongoDB Update (Push place to itinerary.day.places)
        ↓
Return updated trip
        ↓
Frontend: Update UI to show new place
```

---

## 📊 Component Hierarchy

```
App (Root Layout)
├─ AuthProvider (Context)
├─ Navbar (Navigation)
└─ Pages
   ├─ Login Page
   │  └─ LoginForm
   │
   ├─ Register Page
   │  └─ RegisterForm
   │
   ├─ Home Page
   │  ├─ CreateTripModal
   │  └─ TripCard (repeated)
   │
   ├─ Discover Page
   │  └─ TripCard (repeated)
   │
   ├─ Trip Edit Page
   │  └─ ItineraryEditor
   │     ├─ Day Selector
   │     ├─ Current Places List
   │     ├─ Add Custom Place Form
   │     └─ Recommended Places List
   │
   └─ Profile Page
      ├─ Profile Header
      ├─ Bio Editor
      └─ Stats Display
```

---

## 🔌 API Endpoint Categories

### Authentication Endpoints
```
POST /api/auth/register
├─ Input: {email, username, password}
├─ Output: {access_token, token_type, user}
└─ Status: 200/400

POST /api/auth/login
├─ Input: {email, password}
├─ Output: {access_token, token_type, user}
└─ Status: 200/401

POST /api/auth/verify-token
├─ Input: {token}
├─ Output: {valid, user_id, user}
└─ Status: 200/401
```

### Trip Management Endpoints
```
POST /api/trips/create
├─ Auth: Required
├─ Input: {title, start_location, end_location, start_date, end_date}
└─ Output: {_id, itinerary[], ...}

GET /api/trips/my-trips
├─ Auth: Required
└─ Output: {trips: Trip[]}

GET /api/trips/{id}
├─ Auth: Optional
└─ Output: Trip

PUT /api/trips/{id}
├─ Auth: Required
├─ Input: {title?, is_public?, ...}
└─ Output: Trip

DELETE /api/trips/{id}
├─ Auth: Required
└─ Output: {message: "deleted"}
```

### Itinerary Endpoints
```
POST /api/trips/{id}/add-place/{day}
├─ Auth: Required
├─ Input: {name, description, coordinates, rating, category}
└─ Output: Trip

DELETE /api/trips/{id}/remove-place/{day}/{placeName}
├─ Auth: Required
└─ Output: Trip

PUT /api/trips/{id}/day/{day}/notes
├─ Auth: Required
├─ Input: {notes}
└─ Output: Trip
```

### Place Endpoints
```
GET /api/places/recommendations?location=X&limit=10
├─ Auth: Optional
└─ Output: {location, places: Place[]}

GET /api/places/search?query=X
├─ Auth: Optional
└─ Output: {query, results: Place[]}
```

---

## 🗄️ Database Query Patterns

### User Authentication
```python
# Find user by email
users.find_one({"email": email})

# Verify password
bcrypt.verify(password, hashed_password)

# Create access token
jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY)
```

### Trip Management
```python
# Create trip with itinerary
trips.insert_one({
    "user_id": user_id,
    "title": title,
    "itinerary": [
        {"day": 1, "date": date1, "places": [], "notes": ""},
        {"day": 2, "date": date2, "places": [], "notes": ""},
        ...
    ]
})

# Add place to specific day
trips.find_one_and_update(
    {"_id": ObjectId(trip_id)},
    {"$push": {f"itinerary.{day-1}.places": place}}
)

# Get user's trips (most recent)
trips.find({"user_id": user_id}).sort("created_at", -1)
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────┐
│          Authentication Layer                      │
├─────────────────────────────────────────────────────┤
│ 1. Password Hashing                                │
│    └─ bcrypt: Password → Hash                      │
│                                                    │
│ 2. Token Generation                                │
│    └─ JWT: User ID → Token (Expires in 30 mins)  │
│                                                    │
│ 3. Token Verification                              │
│    └─ Check signature & expiration                 │
│                                                    │
│ 4. Authorization                                   │
│    └─ Verify user owns resource before update    │
└─────────────────────────────────────────────────────┘

CORS Protection
├─ Only allow requests from http://localhost:3000
├─ Production: Frontend domain only
└─ Headers: Authorization, Content-Type

Input Validation
├─ Email format validation
├─ Password strength check
├─ Pydantic type validation
└─ Reject invalid data at entry point
```

---

## 📈 Performance Optimization

### Database Optimization
```
Indexes:
├─ users: email (unique), username (unique)
├─ trips: user_id (for finding user's trips)
└─ trips: is_public (for discovery page)

Pagination:
├─ Limit: 20 items per page
├─ Skip: For pagination offset
└─ Sort: Created date descending

Projection:
├─ Only fetch needed fields
└─ Example: {trips: 1, _id: 0}
```

### Frontend Optimization
```
Code Splitting
├─ Dynamic imports for heavy components
└─ Load only needed code

Lazy Loading
├─ Images loaded on demand
└─ Components loaded when visible

Caching
├─ API responses cached
├─ User data cached in state
└─ Token cached in localStorage

State Management
├─ Minimal re-renders
├─ Context API for auth state
└─ Component-level state for forms
```

---

## 🔄 Deployment Architecture

### Local Development
```
Your Computer
├─ Backend: localhost:8000
├─ Frontend: localhost:3000
├─ MongoDB: localhost:27017 or Atlas
└─ All running simultaneously
```

### Production
```
┌─────────────┐         ┌──────────────┐
│   Browser   │────────▶│   Frontend   │  (Vercel)
│  (User)     │         │  (Next.js)   │
└─────────────┘         └──────┬───────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │     API Gateway    │
                    └────────┬───────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │  Backend Server    │  (Railway)
                    │  (FastAPI)         │
                    └────────┬───────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │   MongoDB Atlas    │
                    │   (Database)       │
                    └────────────────────┘
```

---

## 🎯 Key Design Decisions

### Why FastAPI?
- Built-in async support
- Automatic API documentation
- Type safety with Pydantic
- High performance

### Why MongoDB?
- Flexible schema (trips vary)
- Document structure matches data
- Easy to scale horizontally
- Great for nested data (itinerary)

### Why Next.js?
- Full-stack React framework
- Built-in routing and optimization
- Great developer experience
- Easy deployment to Vercel

### Why TypeScript?
- Catch errors before runtime
- Better IDE support
- Easier refactoring
- Self-documenting code

### Why Context API?
- Simple for auth state
- No external dependencies
- Perfect for this app size
- Easy to migrate to Redux if needed

---

## 🚀 Scalability Plan

### Level 1: Current
- Single FastAPI instance
- MongoDB Atlas free tier
- Vercel frontend
- ~1000 users

### Level 2: Growth
- Load balancer for backend
- MongoDB replica set
- CDN for frontend
- Caching layer (Redis)
- ~10,000 users

### Level 3: Scale
- Multiple backend instances
- Database sharding
- Advanced caching
- Microservices
- ~100,000+ users

---

## 📊 Request/Response Flow

### Successful Request
```
1. Browser sends request
   ├─ URL: /api/trips/123
   ├─ Method: GET
   ├─ Headers: {Authorization: "Bearer token"}
   └─ Body: null

2. FastAPI receives request
   ├─ Extracts token from header
   ├─ Verifies token signature
   ├─ Decodes user_id from token
   └─ Routes to endpoint handler

3. Handler executes
   ├─ Validates input
   ├─ Checks authorization (owns trip?)
   ├─ Queries database
   └─ Returns trip data

4. Response sent
   ├─ Status: 200
   ├─ Headers: {Content-Type: application/json}
   └─ Body: {_id, title, itinerary, ...}

5. Frontend receives
   ├─ Axios receives response
   ├─ Updates component state
   └─ Re-renders UI
```

### Failed Request
```
1. Missing Authentication
   ├─ No token in header
   ├─ FastAPI returns 401
   └─ Frontend redirects to login

2. Unauthorized Access
   ├─ Token valid but wrong user_id
   ├─ FastAPI returns 403
   └─ Frontend shows error

3. Invalid Data
   ├─ Wrong data type
   ├─ Pydantic validates and returns 400
   └─ Frontend shows validation error

4. Server Error
   ├─ Unexpected error in handler
   ├─ FastAPI returns 500
   └─ Frontend shows generic error
```

---

## 🎨 State Management Flow

### Authentication State
```
Initial State: {user: null, isAuthenticated: false}
                    ↓
             User Logs In
                    ↓
   {user: {...}, isAuthenticated: true, isLoading: false}
                    ↓
         Token Stored in localStorage
                    ↓
      Available to all components via useAuth()
```

### Component State Example
```
LoginForm
├─ email: string
├─ password: string
├─ error: string
└─ isLoading: boolean
       ↓
   Form submitted
       ↓
   API call
       ↓
   Success: redirect to home
   Failure: show error message
```

---

## 📋 Validation Flow

### Frontend Validation
```
User Input
    ↓
Component validation (required fields)
    ↓
Format validation (email)
    ↓
Length validation (password min 8 chars)
    ↓
Send to API if valid
    ↓
Show errors if invalid
```

### Backend Validation
```
HTTP Request
    ↓
Pydantic Model Validation
├─ Type checking
├─ Required fields
└─ Custom validators
    ↓
Business Logic Validation
├─ Duplicate email check
├─ Authorization check
└─ Data consistency
    ↓
Database Operation
    ↓
Return validated data
```

---

## 🔗 Complete Request Example

```
Scenario: User adds a place to trip itinerary

1. USER INTERFACE
   User clicks "Add" on "Eiffel Tower"
   
2. FRONTEND CODE
   const handleAddPlace = async (place) => {
     await tripsApi.addPlaceToTrip(tripId, day, place)
   }
   
3. API CLIENT
   POST /api/trips/507f/add-place/1
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   {
     "name": "Eiffel Tower",
     "description": "Iconic tower",
     "coordinates": {"lat": 48.8584, "lng": 2.2945},
     "rating": 4.8,
     "category": "Landmark"
   }
   
4. FASTAPI ROUTE
   @router.post("/{trip_id}/add-place/{day}")
   async def add_place(trip_id, day, place):
     # Verify token
     user_id = get_user_from_token(auth_header)
     
     # Verify ownership
     trip = TripService.get_trip(trip_id)
     assert trip.user_id == user_id
     
     # Add place
     return TripService.add_place_to_itinerary(...)
   
5. SERVICE LAYER
   trips.find_one_and_update(
     {"_id": ObjectId(trip_id)},
     {"$push": {f"itinerary.{day-1}.places": place}},
     return_document=True
   )
   
6. MONGODB
   Update Document
   itinerary[0].places.push(place)
   
7. RESPONSE
   Status: 200
   Body: {
     "_id": "507f...",
     "itinerary": [
       {
         "day": 1,
         "places": [
           {
             "name": "Eiffel Tower",
             ...
           }
         ]
       }
     ]
   }
   
8. FRONTEND
   const updated_trip = response.data
   setState(updated_trip)
   Re-render UI
   Show success message

9. USER SEES
   "Eiffel Tower" now appears in Day 1 itinerary
```

---

This architecture ensures:
- ✅ Security (auth, validation)
- ✅ Performance (indexing, caching)
- ✅ Scalability (modular design)
- ✅ Maintainability (clean separation)
- ✅ Reliability (error handling)

Happy architecting! 🏗️
