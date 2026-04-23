from fastapi import APIRouter, HTTPException, status, Header
from pydantic import BaseModel
from typing import Optional
from app.models.user import (
    AdminUserResponse,
    AdminUsersResponse,
    AdminUserUpdate,
    AuthResponse,
    UserCreate,
    UserLogin,
    UserProfileUpdate,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

class VerifyTokenRequest(BaseModel):
    token: str


def build_auth_response(user: dict) -> AuthResponse:
    access_token = AuthService.create_access_token(user["_id"])
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        profile=user["profile"],
        created_at=user["created_at"],
    )
    return AuthResponse(
        requires_otp=False,
        access_token=access_token,
        token_type="bearer",
        user=user_response,
    )

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


def require_admin_user(authorization: Optional[str] = Header(None)) -> str:
    user_id = get_user_from_token(authorization)
    if not AuthService.is_admin_user(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return user_id

@router.post("/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    """Register a new user with email OTP verification."""
    try:
        if user_data.otp:
            user = AuthService.complete_registration_with_otp(
                email=user_data.email,
                username=user_data.username,
                password=user_data.password,
                otp=user_data.otp,
            )
            return build_auth_response(user)

        challenge = AuthService.start_registration_otp(
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
        )
        return AuthResponse(
            requires_otp=True,
            message="OTP sent to your email. Enter it to complete registration.",
            email=challenge["email"],
            otp_expires_in_seconds=challenge["otp_expires_in_seconds"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

@router.post("/login", response_model=AuthResponse)
async def login(user_data: UserLogin):
    """Login user with email OTP verification for non-admin accounts."""
    try:
        if user_data.otp:
            user = AuthService.complete_login_with_otp(
                email=user_data.email,
                password=user_data.password,
                otp=user_data.otp,
            )
            return build_auth_response(user)

        result = AuthService.start_login_otp(
            email=user_data.email,
            password=user_data.password,
        )

        if result.get("bypass_otp"):
            return build_auth_response(result["user"])

        return AuthResponse(
            requires_otp=True,
            message="OTP sent to your email. Enter it to finish signing in.",
            email=result["email"],
            otp_expires_in_seconds=result["otp_expires_in_seconds"],
        )
    except ValueError as e:
        detail = str(e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED if detail == "Invalid email or password" else status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

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


@router.get("/admin/users", response_model=AdminUsersResponse)
async def get_admin_users(authorization: Optional[str] = Header(None)):
    """Get admin user management data."""
    require_admin_user(authorization)
    return AuthService.get_admin_users()


@router.put("/admin/users/{user_id}", response_model=AdminUserResponse)
async def update_admin_user(
    user_id: str,
    user_data: AdminUserUpdate,
    authorization: Optional[str] = Header(None),
):
    """Update a user from the admin panel."""
    require_admin_user(authorization)

    try:
        updated_user = AuthService.admin_update_user(
            user_id=user_id,
            email=user_data.email,
            username=user_data.username,
            bio=user_data.bio,
            profile_picture=user_data.profile_picture,
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

    return updated_user


@router.delete("/admin/users/{user_id}")
async def delete_admin_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Delete a user and their trips from the admin panel."""
    require_admin_user(authorization)

    try:
        deleted = AuthService.delete_user(user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return {
        "message": "User deleted successfully",
        **deleted,
    }
