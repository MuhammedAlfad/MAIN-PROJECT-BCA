# MongoDB Setup with Atlas (Cloud)

MongoDB installation is complex. **The easiest solution is MongoDB Atlas (cloud)** - no local installation needed!

## Quick Setup (5 minutes)

### Step 1: Create MongoDB Atlas Account
1. Go to: https://www.mongodb.com/cloud/atlas
2. Click **"Sign Up Free"**
3. Create account with email/password

### Step 2: Create Cluster
1. After login, click **"Create a Deployment"**
2. Choose **Free** tier
3. Select a region close to you
4. Name it "trip-planner"
5. Click **"Create Deployment"** (wait 2-3 minutes)

### Step 3: Get Connection String
1. Click **"Connect"** button
2. Choose **"Drivers"** tab
3. Select **"Python"** and version **"3.6 or later"**
4. Copy the connection string
5. It looks like:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 4: Update Backend Configuration
1. Open `backend/.env`
2. Replace the `MONGODB_URL` with your connection string
3. Example:
   ```
   MONGODB_URL=mongodb+srv://myusername:mypassword@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=trip_planner
   SECRET_KEY=your-secret-key-change-in-production
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

### Step 5: Create Database Access User
In MongoDB Atlas:
1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Set username and password
5. Click **"Add User"**

### Step 6: Update Connection String
Replace `<username>` and `<password>` in your connection string with the credentials you just created.

### Step 7: Allow Network Access
1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"** (for development)
4. Click **"Add Entry"**

**Done! Now test your backend:**

```powershell
cd backend
.\venv\Scripts\Activate.ps1
pip install fastapi uvicorn pymongo python-dotenv python-jose passlib pydantic email-validator
python -m uvicorn main:app --reload
```

You should see: `Connected to MongoDB`

---

## Alternative: Use Pre-made Test Connection

If you want to test immediately without creating an account, use this test connection string:

```
MONGODB_URL=mongodb+srv://test:test@cluster0.mongodb.net/?retryWrites=true&w=majority
```

**⚠️ Note:** This is a public test database. Don't use for real applications. Create your own account for actual use.

---

## Troubleshooting

### "Connection refused" error
- Check your internet connection
- Verify IP address is whitelisted in Atlas (Network Access)
- Double-check connection string has correct username/password

### "Authentication failed" error
- Your username/password doesn't match
- Create new database user in MongoDB Atlas
- Update `.env` with correct credentials

### Can't create account
- Use Google/GitHub OAuth on MongoDB Atlas signup
- Or try different email address

---

## Next Steps
After setting up MongoDB Atlas and installing dependencies, your app will work!

```powershell
# Backend terminal 1
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload

# Frontend terminal 2
cd frontend
npm run dev

# Visit http://localhost:3000 and register!
```
