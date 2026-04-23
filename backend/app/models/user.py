from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str
    otp: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str
    otp: Optional[str] = None

class UserProfile(BaseModel):
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    followers: int = 0
    following: int = 0

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None

class User(UserBase):
    id: str
    profile: UserProfile
    created_at: datetime
    
    class Config:
        from_attributes = True
        
class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    profile: UserProfile
    created_at: datetime

class AdminUserResponse(UserResponse):
    trip_count: int = 0
    is_admin: bool = False

class AdminUsersSummary(BaseModel):
    total_users: int
    admin_users: int
    regular_users: int
    total_trips: int

class AdminUsersResponse(BaseModel):
    summary: AdminUsersSummary
    users: List[AdminUserResponse]

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class AuthResponse(BaseModel):
    requires_otp: bool = False
    message: Optional[str] = None
    email: Optional[str] = None
    otp_expires_in_seconds: Optional[int] = None
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: Optional[UserResponse] = None

