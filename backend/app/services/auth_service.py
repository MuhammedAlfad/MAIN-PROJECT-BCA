import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.config import settings
from app.database import db
from bson import ObjectId
from pymongo import ReturnDocument

# Mock database for testing without MongoDB
MOCK_USERS = {}
MOCK_USER_COUNTER = 1
ADMIN_USER_ID = "admin_builtin"
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "admin#123"
ADMIN_USERNAME = "admin"


def _ensure_builtin_admin_user():
    admin_user = MOCK_USERS.get(ADMIN_USER_ID)
    if admin_user:
        return admin_user

    admin_user = {
        "_id": ADMIN_USER_ID,
        "email": ADMIN_EMAIL,
        "username": ADMIN_USERNAME,
        "password_hash": AuthService.hash_password(ADMIN_PASSWORD),
        "profile": {
            "bio": "System administrator",
            "profile_picture": None,
            "followers": 0,
            "following": 0,
        },
        "created_at": datetime.utcnow(),
        "trips": [],
    }
    MOCK_USERS[ADMIN_USER_ID] = admin_user
    return admin_user

class AuthService:
    @staticmethod
    def get_builtin_admin_user():
        return _ensure_builtin_admin_user()

    @staticmethod
    def get_user_by_id(user_id: str):
        if user_id == ADMIN_USER_ID:
            return AuthService.get_builtin_admin_user()

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                user = users_collection.find_one({"_id": ObjectId(user_id)})
                if user:
                    user["_id"] = str(user["_id"])
                    return user
            except:
                pass

        return MOCK_USERS.get(user_id)

    @staticmethod
    def is_admin_user(user_id: str) -> bool:
        user = AuthService.get_user_by_id(user_id)
        return bool(user and str(user.get("email", "")).lower() == ADMIN_EMAIL)

    @staticmethod
    def hash_password(password: str) -> str:
        """Simple SHA256 hash with salt"""
        salt = settings.SECRET_KEY[:16]
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return AuthService.hash_password(plain_password) == hashed_password
    
    @staticmethod
    def create_access_token(user_id: str, expires_delta: timedelta = None) -> str:
        if expires_delta is None:
            expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        expire = datetime.utcnow() + expires_delta
        to_encode = {"sub": user_id, "exp": expire}
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> str:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return user_id
        except JWTError:
            return None
    
    @staticmethod
    def register_user(email: str, username: str, password: str):
        global MOCK_USER_COUNTER
        
        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                
                # Check if user exists
                if users_collection.find_one({"$or": [{"email": email}, {"username": username}]}):
                    return None
                
                user = {
                    "email": email,
                    "username": username,
                    "password_hash": AuthService.hash_password(password),
                    "profile": {
                        "bio": "",
                        "profile_picture": None,
                        "followers": 0,
                        "following": 0
                    },
                    "created_at": datetime.utcnow(),
                    "trips": []
                }
                
                result = users_collection.insert_one(user)
                user["_id"] = str(result.inserted_id)
                return user
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        # Check if user exists in mock
        for user in MOCK_USERS.values():
            if user["email"] == email or user["username"] == username:
                return None
        
        # Create new user in mock
        user_id = f"mock_{MOCK_USER_COUNTER}"
        MOCK_USER_COUNTER += 1
        
        user = {
            "_id": user_id,
            "email": email,
            "username": username,
            "password_hash": AuthService.hash_password(password),
            "profile": {
                "bio": "",
                "profile_picture": None,
                "followers": 0,
                "following": 0
            },
            "created_at": datetime.utcnow(),
            "trips": []
        }
        
        MOCK_USERS[user_id] = user
        return user
    
    @staticmethod
    def authenticate_user(email: str, password: str):
        if email.strip().lower() == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            return AuthService.get_builtin_admin_user()

        # Try to use real database first
        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                user = users_collection.find_one({"email": email})
                
                if user and AuthService.verify_password(password, user.get("password_hash", "")):
                    user["_id"] = str(user["_id"])
                    return user
            except:
                pass  # Fall back to mock if DB fails
        
        # Mock database implementation
        for user in MOCK_USERS.values():
            if user["email"] == email and AuthService.verify_password(password, user.get("password_hash", "")):
                return user
        
        return None

    @staticmethod
    def update_user_profile(
        user_id: str,
        username: Optional[str] = None,
        bio: Optional[str] = None,
        profile_picture: Optional[str] = None,
    ):
        normalized_username = username.strip() if isinstance(username, str) else None
        normalized_bio = bio.strip() if isinstance(bio, str) else None
        normalized_picture = profile_picture.strip() if isinstance(profile_picture, str) else None
        if normalized_picture == "":
            normalized_picture = None

        if normalized_username is not None and not normalized_username:
            raise ValueError("Username cannot be empty")

        # Try real database first for non-admin users.
        database = db.get_db()
        if database is not None and user_id != ADMIN_USER_ID:
            try:
                users_collection = database["users"]
                object_id = ObjectId(user_id)
                existing_user = users_collection.find_one({"_id": object_id})
                if existing_user:
                    update_data = {}
                    if normalized_username is not None:
                        conflict = users_collection.find_one({
                            "username": normalized_username,
                            "_id": {"$ne": object_id},
                        })
                        if conflict:
                            raise ValueError("Username already exists")
                        update_data["username"] = normalized_username

                    profile_updates = {}
                    if normalized_bio is not None:
                        profile_updates["profile.bio"] = normalized_bio
                    if profile_picture is not None:
                        profile_updates["profile.profile_picture"] = normalized_picture

                    update_data.update(profile_updates)

                    if update_data:
                        updated = users_collection.find_one_and_update(
                            {"_id": object_id},
                            {"$set": update_data},
                            return_document=ReturnDocument.AFTER,
                        )
                        if updated:
                            updated["_id"] = str(updated["_id"])
                            return updated

                    existing_user["_id"] = str(existing_user["_id"])
                    return existing_user
            except ValueError:
                raise
            except Exception:
                pass

        # Mock-mode / built-in admin update path.
        user = MOCK_USERS.get(user_id)
        if not user and user_id == ADMIN_USER_ID:
            user = _ensure_builtin_admin_user()
            MOCK_USERS[ADMIN_USER_ID] = user

        if not user:
            return None

        if normalized_username is not None:
            for candidate_id, candidate in MOCK_USERS.items():
                if candidate_id == user_id:
                    continue
                if str(candidate.get("username", "")).lower() == normalized_username.lower():
                    raise ValueError("Username already exists")
            user["username"] = normalized_username

        if normalized_bio is not None:
            user.setdefault("profile", {})["bio"] = normalized_bio

        if profile_picture is not None:
            user.setdefault("profile", {})["profile_picture"] = normalized_picture

        return user
