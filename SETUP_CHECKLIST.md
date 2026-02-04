# ✅ Complete Setup & Getting Started Checklist

Follow this checklist to get your Trip Planner platform up and running!

---

## 📋 Pre-Setup Checklist

- [ ] Python 3.9+ installed (check: `python --version`)
- [ ] Node.js 16+ installed (check: `node --version`)
- [ ] MongoDB installed or Atlas account created
- [ ] Git installed (optional but recommended)
- [ ] Code editor ready (VS Code, PyCharm, WebStorm, etc.)

---

## 🔧 Backend Setup

### Step 1: Create Virtual Environment
- [ ] Navigate to `backend` folder
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate on Windows: `.\venv\Scripts\Activate`
- [ ] Activate on Mac/Linux: `source venv/bin/activate`

### Step 2: Install Dependencies
- [ ] Run: `pip install -r requirements.txt`
- [ ] Wait for installation to complete
- [ ] Verify: `pip list` (should show fastapi, pymongo, etc.)

### Step 3: Configure Environment
- [ ] Copy: `copy .env.example .env`
- [ ] Edit `.env` file:
  - [ ] Set `MONGODB_URL` (local or Atlas)
  - [ ] Keep other defaults or customize
- [ ] Save file

### Step 4: Start MongoDB (if local)
- [ ] Open terminal/PowerShell
- [ ] Run: `mongod`
- [ ] Leave running (don't close)

### Step 5: Start Backend Server
- [ ] In `backend` folder (venv activated)
- [ ] Run: `python -m uvicorn main:app --reload`
- [ ] Watch for: "Uvicorn running on http://127.0.0.1:8000"
- [ ] Verify: Open http://localhost:8000/docs in browser

### ✅ Backend Status
- [ ] Server running on http://localhost:8000
- [ ] API docs visible at /docs
- [ ] No error messages in terminal

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend
- [ ] Open new terminal/PowerShell
- [ ] Navigate to `frontend` folder
- [ ] Do NOT use venv

### Step 2: Install Dependencies
- [ ] Run: `npm install`
- [ ] Wait for node_modules to install
- [ ] Should take 2-5 minutes
- [ ] Verify: `npm list` (shows dependencies)

### Step 3: Configure Environment
- [ ] Copy: `copy .env.local.example .env.local`
- [ ] Edit `.env.local`:
  - [ ] Verify `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] Save file

### Step 4: Start Frontend Server
- [ ] In `frontend` folder
- [ ] Run: `npm run dev`
- [ ] Watch for: "ready - started server on 0.0.0.0:3000"

### ✅ Frontend Status
- [ ] Server running on http://localhost:3000
- [ ] Page loads in browser
- [ ] No error messages in terminal

---

## 🧪 Testing - Register & Login

### Test 1: Create Account
- [ ] Go to http://localhost:3000
- [ ] Click "Register"
- [ ] Fill in:
  - Email: `test@example.com`
  - Username: `testuser`
  - Password: `password123`
- [ ] Click "Register"
- [ ] ✅ Should redirect to home page

### Test 2: Create Trip
- [ ] On home page, click "Create New Trip"
- [ ] Fill in:
  - Title: `Paris Weekend`
  - Start Location: `Paris`
  - End Location: `Paris`
  - Start Date: Any future date
  - End Date: 2-3 days later
- [ ] Click "Create Trip"
- [ ] ✅ Should redirect to edit page

### Test 3: Add Places
- [ ] On edit page, select Day 1
- [ ] See "Recommended Places" section
- [ ] Click "+" on any place (e.g., Eiffel Tower)
- [ ] ✅ Place should appear in itinerary

### Test 4: Add Custom Place
- [ ] Type custom place name
- [ ] Type description (optional)
- [ ] Click "Add Place"
- [ ] ✅ Should appear in itinerary

### Test 5: Save & View
- [ ] Click "Save" button at top
- [ ] Make trip public (toggle checkbox)
- [ ] Click "Save" again
- [ ] Go back to home (click logo)
- [ ] ✅ Trip should appear in "Your Trips"

### Test 6: Discover
- [ ] Click "Discover" in navigation
- [ ] ✅ Should see your trip in "Discover Trips"
- [ ] Try searching by location

### Test 7: Profile
- [ ] Click "Profile" in navigation
- [ ] ✅ Should see your profile info
- [ ] Try editing bio (coming soon)

---

## 🚀 All Systems Go!

- [ ] Backend: Running ✅
- [ ] Frontend: Running ✅
- [ ] Database: Connected ✅
- [ ] Can register: ✅
- [ ] Can create trip: ✅
- [ ] Can add places: ✅
- [ ] Can save trip: ✅
- [ ] Can discover trips: ✅
- [ ] Can view profile: ✅

---

## 📚 Next: Learn the Code

After everything is working:

### Quick Exploration (30 minutes)
- [ ] Look at `backend/main.py` - App structure
- [ ] Look at `backend/app/models/` - Data models
- [ ] Look at `backend/app/routes/auth.py` - Login endpoint
- [ ] Look at `frontend/app/page.tsx` - Home page
- [ ] Look at `frontend/components/` - React components

### Read Documentation (1 hour)
- [ ] Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Overview
- [ ] Read [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - All endpoints
- [ ] Read [DEVELOPMENT.md](DEVELOPMENT.md) - How to develop

### Understand Architecture (1-2 hours)
- [ ] Read [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [ ] Study database queries in `trip_service.py`
- [ ] Understand auth flow in `auth_service.py`

---

## 🎯 Ready to Develop?

### Common First Tasks

**Add a new field to trips:**
1. Add to database schema
2. Update Pydantic model
3. Update route handler
4. Update frontend form

**Add a new page:**
1. Create new folder in `app/`
2. Create `page.tsx` file
3. Add link in Navbar
4. Build UI and add API call

**Add API endpoint:**
1. Create route in `app/routes/`
2. Create service method if needed
3. Register route in `main.py`
4. Test with API docs (/docs)

**See examples:** [DEVELOPMENT.md](DEVELOPMENT.md#adding-new-features)

---

## 🐛 Troubleshooting

### Backend won't start
```
❌ "Port already in use"
✅ Change port: python -m uvicorn main:app --port 8001

❌ "MongoDB connection failed"
✅ Ensure MongoDB is running: mongod
✅ Check .env MONGODB_URL

❌ Module not found error
✅ Ensure venv is activated
✅ Reinstall: pip install -r requirements.txt
```

### Frontend won't start
```
❌ npm install takes too long
✅ Normal, be patient (5-10 minutes first time)

❌ Port 3000 already in use
✅ Run: npm run dev -- -p 3001

❌ API connection error
✅ Ensure backend is running on port 8000
✅ Check .env.local has correct API_URL
```

### Database issues
```
❌ Can't connect to MongoDB
✅ If local: Run mongod in separate terminal
✅ If Atlas: Check connection string in .env

❌ Database appears empty
✅ Normal - create test data
✅ Check in MongoDB Atlas dashboard
```

**See full troubleshooting:** [QUICKSTART.md](QUICKSTART.md#troubleshooting)

---

## 📊 System Check

Verify everything is working:

```bash
# Backend health
curl http://localhost:8000/health
# Should return: {"status": "healthy"}

# Frontend loads
# Visit http://localhost:3000
# Should see login page

# API docs available
# Visit http://localhost:8000/docs
# Should see Swagger UI with all endpoints
```

---

## 🎓 Learning Resources

### Backend (Python/FastAPI)
- FastAPI docs: https://fastapi.tiangolo.com/
- Pydantic: https://pydantic-settings.readthedocs.io/
- MongoDB: https://docs.mongodb.com/

### Frontend (React/Next.js)
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/

### Styling (Tailwind)
- Tailwind CSS: https://tailwindcss.com/docs
- Tailwind Components: https://tailwindui.com/

---

## 💾 Backup & Save

Once working, protect your work:

- [ ] Initialize git: `git init`
- [ ] Create .gitignore (ignore venv, node_modules, .env)
- [ ] First commit: `git add . && git commit -m "Initial commit"`
- [ ] Create GitHub repo and push
- [ ] Enable GitHub Pages for frontend docs

---

## 🚀 Next Steps

### Immediate (This Week)
- [ ] Complete all checklist items
- [ ] Explore the UI
- [ ] Review code structure
- [ ] Read documentation

### Short Term (This Month)
- [ ] Add 1-2 features
- [ ] Deploy to production
- [ ] Test with friends/family
- [ ] Get feedback

### Medium Term (This Quarter)
- [ ] Add map integration
- [ ] Implement photo uploads
- [ ] Connect real place API
- [ ] Build mobile app

---

## 🎉 Success Criteria

You're successful when:

✅ Backend runs without errors
✅ Frontend loads in browser
✅ Can register new account
✅ Can create a trip
✅ Can add places to itinerary
✅ Can save and view trips
✅ Can discover other trips
✅ All pages load properly
✅ No console errors
✅ API documentation visible

---

## 📞 Getting Help

### Check These First
1. [QUICKSTART.md](QUICKSTART.md) - Setup guide
2. [README.md](README.md) - Overview
3. [TROUBLESHOOTING](#-troubleshooting) - Common issues

### Review Code
1. Look at working examples in codebase
2. Check API documentation at http://localhost:8000/docs
3. Review [DEVELOPMENT.md](DEVELOPMENT.md)

### Last Resort
1. Check error messages carefully
2. Search error message online
3. Check platform-specific docs
4. Restart servers and try again

---

## ⏱️ Time Estimate

- Setup backend: 10 minutes
- Setup frontend: 10 minutes
- Testing features: 15 minutes
- Reading docs: 30 minutes
- **Total: ~1 hour to fully working system**

---

## ✨ Final Checklist

Before considering setup complete:

- [ ] Both servers running without errors
- [ ] Frontend loads at localhost:3000
- [ ] Can register new user
- [ ] Can create trip
- [ ] Can add places
- [ ] Can view home page
- [ ] Can view discover page
- [ ] Can view profile page
- [ ] Can logout
- [ ] Can login again
- [ ] No console errors
- [ ] API docs accessible at /docs

---

## 🎊 You're All Set!

Congratulations! You have a fully functional Trip Planner app! 

**Next:** Pick a feature to build or deploy to production!

---

**Happy building!** 🚀✈️

For detailed guides:
- Setup: [QUICKSTART.md](QUICKSTART.md)
- Features: [README.md](README.md)
- Development: [DEVELOPMENT.md](DEVELOPMENT.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
