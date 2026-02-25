from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.services.auth_service import AuthService
from app.database import db
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["auth"])

class VerifyTokenRequest(BaseModel):
    token: str

@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    user = AuthService.register_user(
        email=user_data.email,
        username=user_data.username,
        password=user_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already exists"
        )
    
    access_token = AuthService.create_access_token(user["_id"])
    
    user_response = UserResponse(
        id=user["_id"],
        email=user["email"],
        username=user["username"],
        profile=user["profile"],
        created_at=user["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user"""
    user = AuthService.authenticate_user(
        email=user_data.email,
        password=user_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = AuthService.create_access_token(user["_id"])
    
    user_response = UserResponse(
        id=user["_id"],
        email=user["email"],
        username=user["username"],
        profile=user["profile"],
        created_at=user["created_at"]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@router.post("/verify-token")
async def verify_token(data: VerifyTokenRequest):
    """Verify if token is valid and return user data"""
    user_id = AuthService.decode_token(data.token)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Try to get user from database or mock data
    database = db.get_db()
    if database is not None:
        try:
            users_collection = database["users"]
            user = users_collection.find_one({"_id": ObjectId(user_id)})
        except:
            user = None
    else:
        user = None
    
    # If not found in real DB, try mock data
    if not user:
        from app.services.auth_service import MOCK_USERS
        user = MOCK_USERS.get(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        profile=user["profile"],
        created_at=user["created_at"]
    )
    
    return {"valid": True, "user": user_response}
