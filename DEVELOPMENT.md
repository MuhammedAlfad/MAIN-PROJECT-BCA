# Development Guide

Comprehensive guide for developing and extending the Trip Planner platform.

## 🏗️ Development Setup

### Prerequisites
- Python 3.9+
- Node.js 16+
- MongoDB
- Git
- Your favorite code editor

### Initial Setup

```bash
# Clone or navigate to project
cd trip

# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate  # Windows
# or
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env

# Frontend
cd ../frontend
npm install
copy .env.local.example .env.local
```

---

## 📝 Code Style & Conventions

### Python (Backend)

**File Organization**
```
app/
├── models/      # Pydantic schemas
├── routes/      # API endpoints
├── services/    # Business logic
├── config.py    # Configuration
└── database.py  # Database connection
```

**Naming Conventions**
- Classes: `PascalCase` (e.g., `UserModel`, `AuthService`)
- Functions: `snake_case` (e.g., `create_user`, `hash_password`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_PASSWORD_LENGTH`)
- Private: `_prefix` (e.g., `_internal_function`)

**Code Style**
```python
# Imports
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException

# Type hints required
def create_user(email: str, password: str) -> dict:
    """Create a new user account."""
    pass

# Docstrings
async def get_trips(user_id: str) -> List[dict]:
    """
    Get all trips for a specific user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        List of trip documents
        
    Raises:
        HTTPException: If user not found
    """
    pass
```

### TypeScript (Frontend)

**File Organization**
```
├── app/         # Pages and routes
├── components/  # Reusable components
├── lib/         # Utilities and API client
├── context/     # Global state
└── types/       # TypeScript definitions (add as needed)
```

**Naming Conventions**
- Components: `PascalCase` (e.g., `LoginForm`, `TripCard`)
- Functions: `camelCase` (e.g., `handleSubmit`, `fetchTrips`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Types: `PascalCase` (e.g., `User`, `Trip`, `ApiResponse`)

**Code Style**
```typescript
// Type definitions first
interface User {
  id: string;
  email: string;
  username: string;
  profile: UserProfile;
  created_at: string;
}

// Component with proper typing
const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // implementation
  };
  
  return <div>...</div>;
};

export default LoginForm;
```

---

## 🚀 Adding New Features

### Adding a New API Endpoint

1. **Create Model** (if needed)
```python
# app/models/new_model.py
from pydantic import BaseModel
from typing import Optional

class NewItem(BaseModel):
    name: str
    description: Optional[str] = None
    
class NewItemResponse(NewItem):
    id: str
```

2. **Create Service**
```python
# app/services/new_service.py
from app.database import db
from bson import ObjectId

class NewService:
    @staticmethod
    def create_item(data: dict) -> dict:
        """Create new item in database"""
        collection = db.get_db()["items"]
        result = collection.insert_one(data)
        data["_id"] = str(result.inserted_id)
        return data
```

3. **Create Route**
```python
# app/routes/new_route.py
from fastapi import APIRouter, HTTPException
from app.models.new_model import NewItem, NewItemResponse
from app.services.new_service import NewService

router = APIRouter(prefix="/api/items", tags=["items"])

@router.post("/", response_model=NewItemResponse)
async def create_item(item: NewItem):
    """Create a new item"""
    return NewService.create_item(item.model_dump())
```

4. **Register Route** in main.py
```python
from app.routes import new_route
app.include_router(new_route.router)
```

### Adding a New Frontend Page

1. **Create Page**
```typescript
// app/new-page/page.tsx
'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function NewPage() {
  const { user } = useAuth();
  
  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold">New Page</h1>
      </div>
    </ProtectedRoute>
  );
}
```

2. **Add to Navigation** in Navbar.tsx
```typescript
{isAuthenticated && (
  <>
    <Link href="/new-page">New Page</Link>
  </>
)}
```

### Adding a New Component

```typescript
// components/NewComponent.tsx
'use client';

import React, { useState } from 'react';

interface NewComponentProps {
  title: string;
  onAction?: () => void;
}

export const NewComponent: React.FC<NewComponentProps> = ({ 
  title, 
  onAction 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    setIsLoading(true);
    try {
      if (onAction) {
        await onAction();
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Action'}
      </button>
    </div>
  );
};
```

---

## 🔌 Database Operations

### Create Document
```python
collection = db.get_db()["collection_name"]
result = collection.insert_one({"field": "value"})
doc_id = str(result.inserted_id)
```

### Read Document
```python
# Find one
doc = collection.find_one({"field": "value"})

# Find many
docs = list(collection.find({"field": "value"}))
```

### Update Document
```python
result = collection.find_one_and_update(
    {"_id": ObjectId(id)},
    {"$set": {"field": "new_value"}},
    return_document=True
)
```

### Delete Document
```python
result = collection.delete_one({"_id": ObjectId(id)})
deleted_count = result.deleted_count
```

---

## 🧪 Testing

### Testing Backend

```python
# tests/test_auth.py
import pytest
from app.services.auth_service import AuthService

def test_hash_password():
    password = "test123"
    hashed = AuthService.hash_password(password)
    assert hashed != password
    assert AuthService.verify_password(password, hashed)

def test_create_token():
    user_id = "test_user"
    token = AuthService.create_access_token(user_id)
    decoded_id = AuthService.decode_token(token)
    assert decoded_id == user_id
```

### Testing Frontend

```typescript
// components/__tests__/LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import { LoginForm } from '@/components/LoginForm';

describe('LoginForm', () => {
  it('renders login form', () => {
    render(<LoginForm />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
```

---

## 📊 Database Queries

### Popular Queries

```python
# Get user with trips
user = collection.find_one(
    {"_id": ObjectId(user_id)},
    {"trips": 1}  # Project only trips field
)

# Pagination
trips = list(collection.find().skip(10).limit(20))

# Sorting
recent_trips = list(collection.find().sort("created_at", -1))

# Filtering
public_trips = list(collection.find({"is_public": True}))

# Aggregation
stats = list(collection.aggregate([
    {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]))
```

---

## 🔐 Security Best Practices

### Frontend
```typescript
// ✅ Good - Secure storage
localStorage.setItem('access_token', token);

// ❌ Bad - Don't use localStorage for sensitive data in production
// Consider using httpOnly cookies instead

// ✅ Good - Hide sensitive data from console
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
}
```

### Backend
```python
# ✅ Good - Hash passwords
hashed = AuthService.hash_password(password)

# ✅ Good - Use environment variables
SECRET_KEY = settings.SECRET_KEY

# ❌ Bad - Hardcoded secrets
SECRET_KEY = "my-secret-key"

# ✅ Good - Validate input
email = EmailStr(email)

# ✅ Good - CORS protection
app.add_middleware(CORSMiddleware, allow_origins=[...])
```

---

## 🚀 Performance Tips

### Backend
- Use indexes on frequently queried fields
- Cache responses when appropriate
- Use pagination for large result sets
- Optimize database queries with projections

### Frontend
- Code splitting with dynamic imports
- Image optimization with Next.js Image component
- Lazy loading for components
- Memoization for expensive calculations

---

## 🐛 Debugging

### Backend Debugging

```python
# Add print statements
print(f"Creating user: {email}")

# Use debugger
import pdb; pdb.set_trace()

# Check logs
import logging
logger = logging.getLogger(__name__)
logger.error(f"Error: {str(error)}")
```

### Frontend Debugging

```typescript
// Console logging
console.log('User data:', user);
console.error('Error:', error);

// React DevTools
// Install React DevTools browser extension

// Network debugging
// Open DevTools → Network tab

// State debugging
console.log('Auth context:', { user, isAuthenticated });
```

---

## 📦 Dependency Management

### Backend
```bash
# Add new package
pip install new-package

# Update requirements.txt
pip freeze > requirements.txt

# Check for vulnerabilities
pip-audit

# Remove unused packages
pip uninstall unused-package
```

### Frontend
```bash
# Add package
npm install package-name

# Add dev dependency
npm install --save-dev package-name

# Check security
npm audit

# Update packages
npm update
```

---

## 📚 Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
# Review and merge

# Delete branch
git branch -d feature/new-feature
```

---

## 🔄 CI/CD Suggestions

### GitHub Actions Example

```yaml
name: Test & Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run tests
      run: |
        cd backend
        pytest
    
    - name: Set up Node
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Build frontend
      run: |
        cd frontend
        npm install
        npm run build
```

---

## 📖 Useful Resources

- **FastAPI**: https://fastapi.tiangolo.com/
- **Next.js**: https://nextjs.org/docs
- **MongoDB**: https://docs.mongodb.com/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Pydantic**: https://pydantic-settings.readthedocs.io/

---

## 💡 Development Tips

1. **Use meaningful variable names** - Code is read more than written
2. **Keep functions small** - One responsibility per function
3. **Write comments for complex logic** - Explain the "why"
4. **Test as you develop** - Find bugs early
5. **Use type hints** - Catch errors before runtime
6. **Version your API** - Plan for future changes
7. **Document your code** - Future you will thank you
8. **Use environment variables** - Never hardcode secrets
9. **Monitor your application** - Track errors and performance
10. **Backup your database** - Data is precious

---

## 🎯 Next Development Tasks

### Short Term
- [ ] Add input validation
- [ ] Add more place recommendations
- [ ] Implement drag-and-drop for itinerary
- [ ] Add user profile picture upload
- [ ] Add trip photo gallery

### Medium Term
- [ ] Add map integration (Leaflet/Mapbox)
- [ ] Implement real-time collaboration
- [ ] Add rating and review system
- [ ] Email notifications
- [ ] Advanced search and filters

### Long Term
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Travel insurance partnership
- [ ] AI-powered recommendations
- [ ] Social network features

---

## 🆘 Getting Help

- Check documentation in `/docs` endpoints
- Review existing code patterns
- Use browser DevTools
- Check terminal/console for errors
- Ask in development communities

Happy developing! 🚀
