from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    followers: int = 0
    following: int = 0

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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

