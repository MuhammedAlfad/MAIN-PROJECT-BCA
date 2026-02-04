# Trip Planner Platform

A next-generation travel planning platform built with FastAPI, MongoDB, and Next.js.

## Project Structure

```
trip/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── models/      # Pydantic models
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── config.py    # Configuration
│   │   └── database.py  # MongoDB connection
│   ├── main.py          # FastAPI app entry point
│   └── requirements.txt
└── frontend/            # Next.js frontend
    ├── app/            # Pages and routes
    ├── components/     # React components
    ├── lib/           # Utilities and API client
    ├── context/       # React Context for state
    └── package.json
```

## Features

✨ **Smart Itinerary Generator**
- Select destinations and dates
- Auto-generate place recommendations
- Build day-by-day itineraries

🗺️ **Interactive Itinerary Editor**
- Add/remove places from your trip
- Organize by day
- See place recommendations based on location
- Add custom places

👤 **Personal Travel Profiles**
- Create an account and login
- View and edit your profile
- See your trip history
- Make trips public or private

🔍 **Discover & Share**
- Browse public trips from other travelers
- Search by location
- Share your own trips
- Follow other travelers (coming soon)

## Getting Started

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string
   ```

3. **Start MongoDB**
   ```bash
   mongod
   ```

4. **Run the Server**
   ```bash
   python -m uvicorn main:app --reload
   ```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-token` - Verify JWT token

### Trips
- `POST /api/trips/create` - Create new trip
- `GET /api/trips/my-trips` - Get user's trips
- `GET /api/trips/{id}` - Get specific trip
- `PUT /api/trips/{id}` - Update trip
- `DELETE /api/trips/{id}` - Delete trip
- `GET /api/trips/discover/public` - Get public trips

### Places
- `GET /api/places/recommendations?location=Paris` - Get recommendations
- `GET /api/places/search?query=Eiffel` - Search places

### Itinerary Management
- `POST /api/trips/{id}/add-place/{day}` - Add place to day
- `DELETE /api/trips/{id}/remove-place/{day}/{placeName}` - Remove place
- `PUT /api/trips/{id}/day/{day}/notes` - Update day notes

## Technology Stack

**Backend**
- FastAPI - Modern Python web framework
- MongoDB - NoSQL database
- PyJWT - JWT authentication
- Pydantic - Data validation

**Frontend**
- Next.js 14 - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Axios - HTTP client
- Lucide React - Icons

## Usage Flow

1. **Register/Login** - Create an account or login
2. **Create Trip** - Click "Create New Trip" and set start/end locations
3. **Edit Itinerary** - Add recommended places or custom places to each day
4. **Save Trip** - Save your itinerary and optionally make it public
5. **Manage Trips** - View all your trips on the home page
6. **Discover** - Explore public trips from other travelers
7. **Profile** - Manage your profile information

## Future Features

- 📍 Interactive map view
- 🏙️ City guides and recommendations
- 📷 Trip photo uploads
- 👥 Follow system
- ⭐ Trip ratings and reviews
- 🔗 Share trips via link
- 📅 Real-time itinerary collaboration
- 💬 Comments and discussions

## Database Schema

### Users Collection
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "username": "username",
  "password_hash": "hashed_password",
  "profile": {
    "bio": "Bio text",
    "profile_picture": "url",
    "followers": 0,
    "following": 0
  },
  "created_at": ISODate
}
```

### Trips Collection
```json
{
  "_id": ObjectId,
  "user_id": "userId",
  "title": "Trip Title",
  "description": "Trip description",
  "start_location": "Paris",
  "end_location": "Paris",
  "start_date": ISODate,
  "end_date": ISODate,
  "itinerary": [
    {
      "day": 1,
      "date": ISODate,
      "places": [],
      "notes": ""
    }
  ],
  "is_public": false,
  "cover_image": null,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

**Backend**
```bash
cd backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

**Frontend**
```bash
cd frontend
npm run build
npm start
```

## Troubleshooting

**MongoDB Connection Error**
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`

**CORS Issues**
- Verify `ALLOWED_ORIGINS` in backend config
- Frontend and backend must be running on correct ports

**Port Already in Use**
- Backend: Change port in main.py
- Frontend: Use `npm run dev -- -p 3001`

## License

MIT License

## Support

For issues or questions, please create an issue in the repository.
