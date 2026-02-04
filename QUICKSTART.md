# Quick Start Guide

## Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB
- npm or yarn

## 1️⃣ MongoDB Setup

### Windows with MongoDB Atlas (Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Update `.env` in backend folder

### Windows Local MongoDB
```powershell
# Download from https://www.mongodb.com/try/download/community
# Install and run
mongod
```

## 2️⃣ Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env with your MongoDB URL
# Example for local: MONGODB_URL=mongodb://localhost:27017

# Run the server
python -m uvicorn main:app --reload
```

Server runs on: **http://localhost:8000**

## 3️⃣ Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Create .env.local
copy .env.local.example .env.local

# Verify API URL is correct in .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run development server
npm run dev
```

App runs on: **http://localhost:3000**

## 4️⃣ First Test

1. Open browser: http://localhost:3000
2. Click "Register" 
3. Create account:
   - Email: test@example.com
   - Username: testuser
   - Password: password123
4. Login with these credentials
5. Click "Create New Trip"
6. Set details:
   - Title: Paris Adventure
   - Start Location: Paris
   - End Location: Paris
   - Dates: Pick any dates
7. Click "Create Trip"
8. You'll be redirected to edit itinerary
9. Click on a day and add recommended places!

## 📁 Project Files

### Backend Structure
```
backend/
├── app/
│   ├── models/
│   │   ├── user.py       # User schemas
│   │   └── trip.py       # Trip schemas
│   ├── routes/
│   │   ├── auth.py       # Login/Register
│   │   ├── trips.py      # Trip CRUD
│   │   └── places.py     # Place recommendations
│   ├── services/
│   │   ├── auth_service.py      # Auth logic
│   │   ├── trip_service.py      # Trip logic
│   │   └── place_service.py     # Place recommendations
│   ├── config.py         # Settings
│   └── database.py       # MongoDB connection
├── main.py              # FastAPI app
└── requirements.txt     # Python dependencies
```

### Frontend Structure
```
frontend/
├── app/
│   ├── page.tsx         # Home/Landing
│   ├── login/page.tsx   # Login page
│   ├── register/page.tsx# Register page
│   ├── discover/page.tsx# Discover trips
│   ├── profile/page.tsx # User profile
│   ├── trip/[id]/edit/  # Edit itinerary
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/
│   ├── Navbar.tsx
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   ├── TripCard.tsx
│   ├── CreateTripModal.tsx
│   └── ItineraryEditor.tsx
├── lib/
│   └── api.ts          # API client
├── context/
│   └── AuthContext.tsx # Auth state
└── package.json
```

## 🎯 Main Features

### ✅ Login & Registration
- Secure JWT authentication
- User profiles with bio

### ✅ Create Trips
- Set start/end locations and dates
- Automatic itinerary generation (by day)

### ✅ Edit Itinerary
- See recommendations based on location
- Add/remove places from each day
- Add custom places
- Update day notes

### ✅ Trip Management
- View all your trips
- Edit and delete trips
- Make trips public or private
- Save changes

### ✅ Discover
- Browse public trips
- Search by location or title
- View other travelers' itineraries

### ✅ Profile
- View profile information
- Edit bio
- Follow users (coming soon)

## 🔧 API Endpoints Cheat Sheet

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/verify-token
```

### Trips
```
POST /api/trips/create
GET /api/trips/my-trips
GET /api/trips/{id}
PUT /api/trips/{id}
DELETE /api/trips/{id}
GET /api/trips/discover/public
```

### Places
```
GET /api/places/recommendations?location=Paris
GET /api/places/search?query=Eiffel
```

### Itinerary
```
POST /api/trips/{id}/add-place/{day}
DELETE /api/trips/{id}/remove-place/{day}/{placeName}
PUT /api/trips/{id}/day/{day}/notes
```

## 🚀 Deploy

### Deploy Backend (Vercel/Railway/Heroku)
```bash
cd backend
# Set environment variables in hosting platform
# Deploy!
```

### Deploy Frontend (Vercel)
```bash
cd frontend
npm install -g vercel
vercel
# Set NEXT_PUBLIC_API_URL to your backend URL
```

## 📝 Environment Variables

### Backend (.env)
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=trip_planner
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## ❓ Troubleshooting

**MongoDB connection fails**
- ✅ Make sure MongoDB is running
- ✅ Check connection string in .env

**CORS errors**
- ✅ Verify frontend is running on port 3000
- ✅ Backend has CORS configured

**Port already in use**
```bash
# Kill process on port
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or change port in main.py (FastAPI)
# python -m uvicorn main:app --port 8001
```

**API not responding**
- ✅ Check backend is running: http://localhost:8000/health
- ✅ Check API URL in frontend .env.local

## 📚 Next Steps

1. **Customize place recommendations** - Add real API (Google Places, Foursquare)
2. **Add map integration** - Show places on map (Leaflet, Mapbox)
3. **Implement drag-and-drop** - Reorder places in itinerary
4. **Photo uploads** - Let users upload trip photos
5. **Real-time collaboration** - Multiple users editing trips
6. **Rating system** - Rate and review trips
7. **Advanced search** - Filter by duration, season, etc.

## 🆘 Need Help?

- Check the README.md for detailed documentation
- Review API responses for error details
- Check browser console for frontend errors
- Check backend logs for server errors

Happy traveling! ✈️
