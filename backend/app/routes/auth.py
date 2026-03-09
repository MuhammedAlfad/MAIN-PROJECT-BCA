from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel
from typing import Optional
from app.models.user import UserCreate, UserLogin, UserProfileUpdate, UserResponse, Token
from app.services.auth_service import AuthService
from app.database import db
from bson import ObjectId

router = APIRouter(prefix="/api/auth", tags=["auth"])

class VerifyTokenRequest(BaseModel):
    token: str

def get_user_from_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from authorization header"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )

    try:
        parts = authorization.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header format"
            )

        token = parts[1]
        user_id = AuthService.decode_token(token)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        return user_id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authorization: {str(e)}"
        )

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

    # Ensure built-in admin remains available for token verification after restarts.
    if not user and user_id == "admin_builtin":
        user = AuthService.get_builtin_admin_user()
    
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

@router.put("/profile", response_model=UserResponse)
async def update_profile(profile_data: UserProfileUpdate, authorization: Optional[str] = Header(None)):
    """Update current user profile fields"""
    user_id = get_user_from_token(authorization)

    try:
        updated_user = AuthService.update_user_profile(
            user_id=user_id,
            username=profile_data.username,
            bio=profile_data.bio,
            profile_picture=profile_data.profile_picture,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=str(updated_user["_id"]),
        email=updated_user["email"],
        username=updated_user["username"],
        profile=updated_user["profile"],
        created_at=updated_user["created_at"]
    )
