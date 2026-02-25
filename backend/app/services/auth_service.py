import hashlib
import hmac
from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.config import settings
from app.database import db
from bson import ObjectId

# Mock database for testing without MongoDB
MOCK_USERS = {}
MOCK_USER_COUNTER = 1

class AuthService:
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
