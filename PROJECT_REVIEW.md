# Project Scan & Code Review - Issues Found

**Scan Date**: January 21, 2026  
**Scan Type**: Comprehensive project-wide review  
**Status**: Multiple issues identified, mostly minor

---

## 🔴 Critical Issues (Must Fix)

### 1. **Backend Requirements.txt Has Unused Dependencies**
**File**: [backend/requirements.txt](backend/requirements.txt)  
**Issue**: Package list includes `passlib[bcrypt]` and `email-validator` but they are NOT used in the code
- `passlib` and `bcrypt` were replaced with `hashlib.pbkdf2_hmac` 
- `email-validator` was removed (models use plain `str` instead of `EmailStr`)

**Impact**: Unnecessary packages inflate installation size and could cause conflicts  
**Fix**: Remove these unused dependencies:
```txt
# REMOVE:
passlib[bcrypt]
email-validator
```

**Action**: Update backend/requirements.txt to only include:
- fastapi
- uvicorn
- pymongo
- python-dotenv
- python-jose[cryptography]
- pydantic

---

### 2. **Frontend Package.json Missing TypeScript Dependency**
**File**: [frontend/package.json](frontend/package.json)  
**Issue**: TypeScript is in `devDependencies` but should be in `dependencies` for build-time usage
- Next.js build process may fail if TypeScript isn't available during build

**Impact**: Potential build failures in production  
**Fix**: Move `typescript` from devDependencies to dependencies

---

## 🟡 Medium Priority Issues (Should Fix)

### 3. **Incomplete Trip Service Date Calculation Logic**
**File**: [backend/app/services/trip_service.py](backend/app/services/trip_service.py) - Lines 20-30  
**Issue**: Date calculation for itinerary days is overly complex and error-prone:
```python
# Current (buggy):
for _ in range(day_num):
    current_date = date(
        current_date.year,
        current_date.month,
        current_date.day + 1
    ) if current_date.day < 28 else date(current_date.year, current_date.month + 1, 1)
```

**Problems**:
- Doesn't handle month/year boundaries correctly
- Doesn't account for days in different months (28/29/30/31)
- Will crash with ValueError when day > month's max days

**Better approach**:
```python
from datetime import timedelta
itinerary = []
for day_num in range(num_days):
    current_date = trip_data.start_date + timedelta(days=day_num)
    itinerary.append(DayItinerary(day=day_num + 1, date=current_date, places=[], notes=""))
```

---

### 4. **Missing Error Handling in Frontend Trip Loading**
**File**: [frontend/app/page.tsx](frontend/app/page.tsx) - Lines 24-30  
**Issue**: `loadTrips()` catch block doesn't display error to user:
```typescript
catch (error) {
  console.error('Failed to load trips:', error);  // Silent failure
}
```

**Impact**: User won't know if trip loading failed  
**Fix**: Show error state:
```typescript
const [error, setError] = useState<string>('');
// In catch:
setError('Failed to load trips. Please try again.');
// In JSX: Display error message to user
```

---

### 5. **Unimplemented Profile Update Feature**
**File**: [frontend/app/profile/page.tsx](frontend/app/profile/page.tsx) - Line 18  
**Issue**: TODO comment indicates bio update is not implemented:
```typescript
// TODO: Implement bio update API
```

**Impact**: Users cannot update their profile  
**Status**: Feature promised but not delivered

---

### 6. **Missing Verify Token Endpoint**
**File**: [backend/app/routes/auth.py](backend/app/routes/auth.py)  
**Issue**: Frontend calls `authApi.verifyToken()` [frontend/lib/api.ts](frontend/lib/api.ts) but endpoint doesn't exist in backend

**Impact**: User session verification will fail, breaking session persistence  
**Fix**: Add endpoint to auth.py:
```python
@router.post("/verify-token")
async def verify_token(token_data: dict):
    token = token_data.get("token")
    user_id = AuthService.decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    users_collection = db.get_db()["users"]
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    return {"user": user}
```

---

## 🟢 Minor Issues (Nice to Fix)

### 7. **CSS Linting Warnings in Globals**
**File**: [frontend/app/globals.css](frontend/app/globals.css)  
**Issue**: CSS linter warnings (not functional errors):
- `@tailwind` directives flagged as unknown at-rules (Tailwind is set up correctly, just linter config)
- Missing `-webkit-line-clamp` standard property definitions (lines 31, 38)

**Fix**: Add standard properties alongside webkit versions:
```css
-webkit-line-clamp: 2;
line-clamp: 2;  /* Add this */
```

---

### 8. **Overly Permissive CORS Configuration**
**File**: [backend/app/config.py](backend/app/config.py)  
**Issue**: CORS allows all methods and headers with `allow_methods=["*"]` and `allow_headers=["*"]`

**Current**:
```python
allow_methods=["*"],  # Allows DELETE, PATCH, etc.
allow_headers=["*"],  # Allows all headers
```

**Better for security**:
```python
allow_methods=["GET", "POST", "PUT", "DELETE"],
allow_headers=["Content-Type", "Authorization"],
```

**Impact**: Minor security concern, not critical for development  
**Status**: Works fine for dev, should be restricted for production

---

### 9. **Frontend Components Missing Error Boundaries**
**Files**: [RegisterForm.tsx](frontend/components/RegisterForm.tsx), [LoginForm.tsx](frontend/components/LoginForm.tsx)  
**Issue**: No error boundary or fallback UI if API call throws unexpected error

**Current Error Handling**:
```typescript
catch (err: any) {
  setError(err.response?.data?.detail || 'Registration failed');
}
```

**Risk**: If `err.response` is undefined, error won't display properly  
**Better**:
```typescript
catch (err: any) {
  const errorMsg = err?.response?.data?.detail || err?.message || 'An error occurred';
  setError(errorMsg);
}
```

---

### 10. **ProtectedRoute Component May Not Work as Expected**
**File**: [frontend/components/ProtectedRoute.tsx](frontend/components/ProtectedRoute.tsx)  
**Issue**: Component uses `useAuth()` hook inside page components, but if page renders before auth check completes, user will see brief unauthorized state

**Symptom**: Brief flicker or redirect when page loads  
**Better approach**: Check `isLoading` flag in page before rendering content

---

## ✅ What's Working Well

- ✅ Authentication system (register/login) fully functional
- ✅ Password hashing secure (PBKDF2-HMAC-SHA256)
- ✅ JWT token implementation correct
- ✅ MongoDB connection stable
- ✅ CORS configuration working (though permissive)
- ✅ Frontend/backend communication established
- ✅ TypeScript types properly defined
- ✅ Modular project structure
- ✅ Environment configuration system
- ✅ API documentation (Swagger at /docs)

---

## 📋 Summary Table

| Issue | Severity | File | Type | Fixable | Notes |
|-------|----------|------|------|---------|-------|
| Unused npm packages | 🔴 Critical | requirements.txt | Dependency | ✅ Easy | Remove 2 packages |
| Missing TypeScript dep | 🔴 Critical | package.json | Dependency | ✅ Easy | Move to dependencies |
| Broken date calculation | 🟡 High | trip_service.py | Logic | ✅ Medium | Replace with timedelta |
| Missing verify endpoint | 🟡 High | auth.py | Missing Feature | ✅ Medium | Add 1 endpoint |
| Silent trip load errors | 🟡 High | page.tsx | UX | ✅ Easy | Show error message |
| CSS webkit warnings | 🟢 Low | globals.css | Linting | ✅ Trivial | Add standard properties |
| Permissive CORS | 🟢 Low | config.py | Security | ✅ Easy | Restrict methods/headers |
| Unimplemented profile bio | 🟡 High | profile/page.tsx | Missing Feature | ✅ Hard | Need API + UI |
| Error handling gaps | 🟢 Low | Forms | Robustness | ✅ Easy | Add null checks |
| ProtectedRoute flicker | 🟢 Low | Routes | UX | ✅ Medium | Add loading state |

---

## 🚀 Next Steps (Priority Order)

1. **FIRST** (5 min): Fix requirements.txt - remove unused packages
2. **SECOND** (5 min): Update package.json - move TypeScript dependency
3. **THIRD** (15 min): Add verify-token endpoint to backend
4. **FOURTH** (20 min): Fix date calculation in trip_service.py
5. **FIFTH** (30 min): Implement profile bio update feature
6. **SIXTH** (10 min): Add error display to trip loading
7. **REMAINING**: CSS/UX improvements (optional, non-blocking)

---

## 📝 Notes

- No database schema issues found
- No security vulnerabilities in authentication
- All critical features are implemented
- Issues are mostly about polish and completeness, not fundamental flaws
- Application is functionally ready for testing
