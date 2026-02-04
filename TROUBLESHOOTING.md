# 🔧 Troubleshooting Guide

## Registration Failed Error

### Issue
"Registration failed" message appears when trying to register a new account.

### Root Causes & Solutions

---

## ✅ Solution 1: MongoDB Connection (MOST COMMON)

### Check if MongoDB is Running

**Option A: Local MongoDB Installation**

1. Open a new PowerShell terminal
2. Run:
```powershell
# Check if MongoDB service is running
Get-Service MongoDB -ErrorAction SilentlyContinue

# If not running, start it:
Start-Service MongoDB
```

3. Or manually start MongoDB:
```powershell
# If installed via MongoDB installer
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

# If using Homebrew on Windows
mongod
```

**Option B: MongoDB Atlas (Cloud)**

1. Create free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Update `.env` file in backend:
```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=trip_planner
```

**Option C: Docker MongoDB**

```powershell
# Pull and run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Verify it's running
docker ps
```

---

## ✅ Solution 2: Check Backend is Actually Running

### Verify Backend Server

1. Open a new PowerShell terminal
2. Navigate to backend folder:
```powershell
cd C:\Users\USER\Desktop\trip\backend
```

3. Run backend with verbose output:
```powershell
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. You should see:
```
Uvicorn running on http://127.0.0.1:8000
Connected to MongoDB
Application startup complete
```

5. Test the API in browser:
   - Go to http://localhost:8000/docs (API docs)
   - Should show Swagger UI with endpoints

---

## ✅ Solution 3: Check Frontend Configuration

### Verify Frontend API Connection

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try registering again
4. Look for error messages:

**If you see network errors:**
- Check that backend is running on http://localhost:8000
- Check `.env.local` has correct API URL

**If you see "CORS" errors:**
- Backend CORS is not configured correctly
- Check `/backend/main.py` has CORS middleware

---

## ✅ Solution 4: Database Configuration

### Check .env Files

**Backend `.env`:**
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=trip_planner
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend `.env.local`:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🔍 Step-by-Step Debugging

### Step 1: Start MongoDB
```powershell
# New PowerShell window
mongod
# Should show: "waiting for connections on port 27017"
```

### Step 2: Start Backend
```powershell
cd C:\Users\USER\Desktop\trip\backend

# Activate venv if needed
.\venv\Scripts\Activate

# Run server
python -m uvicorn main:app --reload
# Should show: "Connected to MongoDB"
```

### Step 3: Test Backend Directly
```powershell
# In another terminal, test the API:
Invoke-WebRequest -Uri "http://localhost:8000/docs" -Method GET
# Should return 200 status

# Or use curl:
curl http://localhost:8000/docs
```

### Step 4: Start Frontend
```powershell
cd C:\Users\USER\Desktop\trip\frontend
npm run dev
# Should show: "Ready in X.XXs"
```

### Step 5: Test Registration
1. Open http://localhost:3000
2. Go to /register
3. Enter: email, username, password
4. Check browser DevTools (F12) Console for errors
5. Check backend terminal for request logs

---

## 📋 Common Error Messages & Fixes

### Error: "MongoDB connection refused"
```
Solution: MongoDB is not running
→ Start MongoDB service (see Solution 1)
```

### Error: "Failed to connect to MongoDB"
```
Solution: Connection string is wrong
→ Check MONGODB_URL in backend/.env
→ Verify MongoDB is running on that port
```

### Error: "CORS policy blocked request"
```
Solution: Backend CORS not set up
→ Check main.py has CORSMiddleware
→ Ensure frontend URL is allowed
```

### Error: "Network Error: connect ECONNREFUSED"
```
Solution: Backend is not running
→ Start backend with: python -m uvicorn main:app --reload
→ Verify it shows "Connected to MongoDB"
```

### Error: "Email or username already exists"
```
Solution: Account already registered
→ Use a different email/username
→ Or delete the user from MongoDB
```

---

## 🗄️ Managing MongoDB

### View Users in Database
```powershell
# Open MongoDB shell
mongosh

# Use database
use trip_planner

# View users
db.users.find().pretty()

# Delete all users (for fresh start)
db.users.deleteMany({})

# Exit
exit
```

### Reset Database
```powershell
# Option 1: Delete from MongoDB shell
mongosh
use trip_planner
db.dropDatabase()
exit

# Option 2: Delete local MongoDB data (Windows)
# MongoDB stores data in C:\data\db\
# Delete this folder and MongoDB will recreate it
```

---

## 🚀 Quick Fix Checklist

Before trying complex solutions, verify:

- [ ] MongoDB is running (mongod showing "waiting for connections")
- [ ] Backend started successfully (shows "Connected to MongoDB")
- [ ] Backend responding (http://localhost:8000/docs loads)
- [ ] Frontend started successfully (http://localhost:3000 loads)
- [ ] No CORS errors in browser console
- [ ] Using correct credentials format in registration
- [ ] Password and confirm password match

---

## 📞 Still Having Issues?

### Check All Three Layers

1. **Database Layer** (MongoDB)
   ```powershell
   mongosh
   show dbs
   ```

2. **API Layer** (FastAPI)
   ```powershell
   # Check if running
   Get-NetTCPConnection -LocalPort 8000
   ```

3. **Frontend Layer** (Next.js)
   ```powershell
   # Check if running
   Get-NetTCPConnection -LocalPort 3000
   ```

### Enable Debug Logging

**Backend:**
```python
# Add to main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend:**
```typescript
// In RegisterForm.tsx handleSubmit
console.log('Form submitted with:', { email, username });
console.error('Registration error:', err);
```

---

## 🎯 Recommended Setup Order

1. **Start MongoDB first**
   ```powershell
   mongod
   ```

2. **Then start Backend**
   ```powershell
   cd backend
   python -m uvicorn main:app --reload
   # Wait for "Connected to MongoDB"
   ```

3. **Then start Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

4. **Then test in browser**
   - http://localhost:3000/register

---

## 🔗 Useful Links

- MongoDB Windows Install: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- FastAPI Documentation: https://fastapi.tiangolo.com/
- Next.js Documentation: https://nextjs.org/docs

---

## 💡 Prevention Tips

1. Always start MongoDB first
2. Check backend shows "Connected to MongoDB"
3. Visit http://localhost:8000/docs to verify API
4. Check browser console (F12) for errors
5. Keep terminals open to see logs

---

**Last Updated:** January 20, 2026
**Status:** All solutions tested and working
