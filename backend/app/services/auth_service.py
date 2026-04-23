import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from jose import JWTError, jwt
from pymongo import ReturnDocument

from app.config import settings
from app.database import db
from app.services.email_service import EmailService

# Mock database for testing without MongoDB
MOCK_USERS = {}
MOCK_USER_COUNTER = 1
ADMIN_USER_ID = "admin_builtin"
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "admin#123"
ADMIN_USERNAME = "admin"

OTP_PURPOSE_LOGIN = "login"
OTP_PURPOSE_REGISTER = "register"
PENDING_OTP_CHALLENGES: Dict[str, Dict[str, Any]] = {}


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
    def normalize_email(email: str) -> str:
        return str(email or "").strip().lower()

    @staticmethod
    def normalize_username(username: str) -> str:
        return str(username or "").strip()

    @staticmethod
    def get_builtin_admin_user():
        return _ensure_builtin_admin_user()

    @staticmethod
    def _normalize_profile(profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        profile = profile or {}

        def as_count(value: Any) -> int:
            try:
                return int(value or 0)
            except (TypeError, ValueError):
                return 0

        return {
            "bio": str(profile.get("bio") or "").strip(),
            "profile_picture": (str(profile.get("profile_picture")).strip() or None) if profile.get("profile_picture") is not None else None,
            "followers": as_count(profile.get("followers")),
            "following": as_count(profile.get("following")),
        }

    @staticmethod
    def _serialize_admin_user(user: Dict[str, Any], trip_count: int = 0) -> Dict[str, Any]:
        created_at = user.get("created_at")
        if not isinstance(created_at, datetime):
            created_at = datetime.utcnow()

        return {
            "id": str(user.get("_id", "")),
            "email": AuthService.normalize_email(user.get("email", "")),
            "username": AuthService.normalize_username(user.get("username", "")),
            "profile": AuthService._normalize_profile(user.get("profile")),
            "created_at": created_at,
            "trip_count": max(int(trip_count or 0), 0),
            "is_admin": AuthService.is_admin_email(user.get("email", "")),
        }

    @staticmethod
    def is_admin_email(email: str) -> bool:
        return AuthService.normalize_email(email) == ADMIN_EMAIL

    @staticmethod
    def _case_insensitive_exact(value: str):
        return {"$regex": f"^{re.escape(value)}$", "$options": "i"}

    @staticmethod
    def _cleanup_expired_otps():
        now = datetime.utcnow()
        expired_keys = [
            key
            for key, challenge in PENDING_OTP_CHALLENGES.items()
            if challenge.get("expires_at") is None or challenge["expires_at"] <= now
        ]
        for key in expired_keys:
            PENDING_OTP_CHALLENGES.pop(key, None)

    @staticmethod
    def _build_otp_key(purpose: str, email: str) -> str:
        return f"{purpose}:{AuthService.normalize_email(email)}"

    @staticmethod
    def _create_otp_code() -> str:
        return f"{secrets.randbelow(1000000):06d}"

    @staticmethod
    def _store_otp_challenge(purpose: str, email: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        AuthService._cleanup_expired_otps()

        otp_code = AuthService._create_otp_code()
        expires_at = datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        key = AuthService._build_otp_key(purpose, email)

        PENDING_OTP_CHALLENGES[key] = {
            "purpose": purpose,
            "email": AuthService.normalize_email(email),
            "otp_hash": AuthService.hash_password(otp_code),
            "expires_at": expires_at,
            "attempts": 0,
            **payload,
        }

        EmailService.send_otp_email(
            recipient=AuthService.normalize_email(email),
            otp=otp_code,
            purpose=purpose,
        )

        return {
            "email": AuthService.normalize_email(email),
            "otp_expires_in_seconds": int((expires_at - datetime.utcnow()).total_seconds()),
        }

    @staticmethod
    def _consume_valid_otp(purpose: str, email: str, otp: str, expected_fields: Dict[str, Any]):
        AuthService._cleanup_expired_otps()
        key = AuthService._build_otp_key(purpose, email)
        challenge = PENDING_OTP_CHALLENGES.get(key)

        if not challenge:
            raise ValueError("OTP expired or not requested. Please request a new OTP.")

        for field_name, expected_value in expected_fields.items():
            if challenge.get(field_name) != expected_value:
                raise ValueError("Your details changed. Please request a new OTP.")

        otp_value = str(otp or "").strip()
        if not otp_value:
            raise ValueError("OTP is required")

        if not hmac.compare_digest(challenge["otp_hash"], AuthService.hash_password(otp_value)):
            challenge["attempts"] = int(challenge.get("attempts", 0)) + 1
            if challenge["attempts"] >= settings.OTP_MAX_ATTEMPTS:
                PENDING_OTP_CHALLENGES.pop(key, None)
                raise ValueError("OTP expired after too many failed attempts. Please request a new OTP.")
            raise ValueError("Invalid OTP")

        PENDING_OTP_CHALLENGES.pop(key, None)
        return challenge

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
            except Exception:
                pass

        return MOCK_USERS.get(user_id)

    @staticmethod
    def get_user_by_email(email: str):
        normalized_email = AuthService.normalize_email(email)
        if normalized_email == ADMIN_EMAIL:
            return AuthService.get_builtin_admin_user()

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                user = users_collection.find_one({"email": AuthService._case_insensitive_exact(normalized_email)})
                if user:
                    user["_id"] = str(user["_id"])
                    return user
            except Exception:
                pass

        for user in MOCK_USERS.values():
            if AuthService.normalize_email(user.get("email", "")) == normalized_email:
                return user

        return None

    @staticmethod
    def is_email_taken(email: str, exclude_user_id: Optional[str] = None) -> bool:
        normalized_email = AuthService.normalize_email(email)
        if not normalized_email:
            return False

        if normalized_email == ADMIN_EMAIL and exclude_user_id != ADMIN_USER_ID:
            return True

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                query: Dict[str, Any] = {
                    "email": AuthService._case_insensitive_exact(normalized_email)
                }
                if exclude_user_id and ObjectId.is_valid(exclude_user_id):
                    query["_id"] = {"$ne": ObjectId(exclude_user_id)}
                if users_collection.find_one(query):
                    return True
            except Exception:
                pass

        for user_id, user in MOCK_USERS.items():
            if exclude_user_id and user_id == exclude_user_id:
                continue
            if AuthService.normalize_email(user.get("email", "")) == normalized_email:
                return True

        return False

    @staticmethod
    def is_username_taken(username: str, exclude_user_id: Optional[str] = None) -> bool:
        normalized_username = AuthService.normalize_username(username)
        if not normalized_username:
            return False

        if normalized_username.lower() == ADMIN_USERNAME and exclude_user_id != ADMIN_USER_ID:
            return True

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                query: Dict[str, Any] = {
                    "username": AuthService._case_insensitive_exact(normalized_username)
                }
                if exclude_user_id and ObjectId.is_valid(exclude_user_id):
                    query["_id"] = {"$ne": ObjectId(exclude_user_id)}
                if users_collection.find_one(query):
                    return True
            except Exception:
                pass

        for user_id, user in MOCK_USERS.items():
            if exclude_user_id and user_id == exclude_user_id:
                continue
            if AuthService.normalize_username(user.get("username", "")).lower() == normalized_username.lower():
                return True

        return False

    @staticmethod
    def is_admin_user(user_id: str) -> bool:
        user = AuthService.get_user_by_id(user_id)
        return bool(user and str(user.get("email", "")).lower() == ADMIN_EMAIL)

    @staticmethod
    def hash_password(password: str) -> str:
        """Simple SHA256 hash with salt"""
        salt = settings.SECRET_KEY[:16]
        return hashlib.pbkdf2_hmac("sha256", str(password).encode(), salt.encode(), 100000).hex()

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

        normalized_email = AuthService.normalize_email(email)
        normalized_username = AuthService.normalize_username(username)

        if not normalized_email or not normalized_username:
            return None

        if AuthService.get_user_by_email(normalized_email) or AuthService.is_username_taken(normalized_username):
            return None

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                user = {
                    "email": normalized_email,
                    "username": normalized_username,
                    "password_hash": AuthService.hash_password(password),
                    "profile": {
                        "bio": "",
                        "profile_picture": None,
                        "followers": 0,
                        "following": 0,
                    },
                    "created_at": datetime.utcnow(),
                    "trips": [],
                }

                result = users_collection.insert_one(user)
                user["_id"] = str(result.inserted_id)
                return user
            except Exception:
                pass

        user_id = f"mock_{MOCK_USER_COUNTER}"
        MOCK_USER_COUNTER += 1

        user = {
            "_id": user_id,
            "email": normalized_email,
            "username": normalized_username,
            "password_hash": AuthService.hash_password(password),
            "profile": {
                "bio": "",
                "profile_picture": None,
                "followers": 0,
                "following": 0,
            },
            "created_at": datetime.utcnow(),
            "trips": [],
        }

        MOCK_USERS[user_id] = user
        return user

    @staticmethod
    def authenticate_user(email: str, password: str):
        normalized_email = AuthService.normalize_email(email)
        if normalized_email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            return AuthService.get_builtin_admin_user()

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                user = users_collection.find_one({"email": AuthService._case_insensitive_exact(normalized_email)})

                if user and AuthService.verify_password(password, user.get("password_hash", "")):
                    user["_id"] = str(user["_id"])
                    return user
            except Exception:
                pass

        for user in MOCK_USERS.values():
            if AuthService.normalize_email(user.get("email", "")) == normalized_email and AuthService.verify_password(password, user.get("password_hash", "")):
                return user

        return None

    @staticmethod
    def start_registration_otp(email: str, username: str, password: str):
        normalized_email = AuthService.normalize_email(email)
        normalized_username = AuthService.normalize_username(username)

        if AuthService.get_user_by_email(normalized_email) or AuthService.is_username_taken(normalized_username):
            raise ValueError("Email or username already exists")

        return AuthService._store_otp_challenge(
            purpose=OTP_PURPOSE_REGISTER,
            email=normalized_email,
            payload={
                "username": normalized_username,
                "password_hash": AuthService.hash_password(password),
            },
        )

    @staticmethod
    def complete_registration_with_otp(email: str, username: str, password: str, otp: str):
        normalized_email = AuthService.normalize_email(email)
        normalized_username = AuthService.normalize_username(username)

        AuthService._consume_valid_otp(
            purpose=OTP_PURPOSE_REGISTER,
            email=normalized_email,
            otp=otp,
            expected_fields={
                "username": normalized_username,
                "password_hash": AuthService.hash_password(password),
            },
        )

        user = AuthService.register_user(
            email=normalized_email,
            username=normalized_username,
            password=password,
        )
        if not user:
            raise ValueError("Email or username already exists")
        return user

    @staticmethod
    def start_login_otp(email: str, password: str):
        normalized_email = AuthService.normalize_email(email)
        user = AuthService.authenticate_user(normalized_email, password)
        if not user:
            raise ValueError("Invalid email or password")

        if AuthService.is_admin_email(normalized_email):
            return {
                "bypass_otp": True,
                "user": user,
            }

        return AuthService._store_otp_challenge(
            purpose=OTP_PURPOSE_LOGIN,
            email=normalized_email,
            payload={
                "password_hash": AuthService.hash_password(password),
            },
        )

    @staticmethod
    def complete_login_with_otp(email: str, password: str, otp: str):
        normalized_email = AuthService.normalize_email(email)
        user = AuthService.authenticate_user(normalized_email, password)
        if not user:
            raise ValueError("Invalid email or password")

        if AuthService.is_admin_email(normalized_email):
            return user

        AuthService._consume_valid_otp(
            purpose=OTP_PURPOSE_LOGIN,
            email=normalized_email,
            otp=otp,
            expected_fields={
                "password_hash": AuthService.hash_password(password),
            },
        )
        return user

    @staticmethod
    def _get_trip_count_for_user(user_id: str) -> int:
        database = db.get_db()
        if database is not None:
            try:
                trips_collection = database["trips"]
                return int(trips_collection.count_documents({"user_id": user_id}) or 0)
            except Exception:
                pass

        from app.services.trip_service import MOCK_TRIPS

        return len([
            trip
            for trip in MOCK_TRIPS.values()
            if str(trip.get("user_id", "")) == user_id
        ])

    @staticmethod
    def get_admin_users(limit: int = 500) -> Dict[str, Any]:
        users: List[Dict[str, Any]] = []
        trip_counts: Dict[str, int] = {}
        database = db.get_db()

        if database is not None:
            try:
                trips_collection = database["trips"]
                for row in trips_collection.aggregate([
                    {"$group": {"_id": "$user_id", "count": {"$sum": 1}}},
                ]):
                    trip_counts[str(row.get("_id", ""))] = int(row.get("count", 0) or 0)
            except Exception:
                trip_counts = {}

            try:
                users_collection = database["users"]
                db_users = list(users_collection.find({}).sort("created_at", -1).limit(limit))
                for user in db_users:
                    user["_id"] = str(user["_id"])
                    if AuthService.is_admin_email(user.get("email", "")):
                        continue
                    users.append(
                        AuthService._serialize_admin_user(
                            user,
                            trip_count=trip_counts.get(str(user["_id"]), 0),
                        )
                    )
            except Exception:
                users = []

        if not users:
            from app.services.trip_service import MOCK_TRIPS

            for trip in MOCK_TRIPS.values():
                trip_user_id = str(trip.get("user_id", ""))
                if trip_user_id:
                    trip_counts[trip_user_id] = trip_counts.get(trip_user_id, 0) + 1

            for user_id, user in MOCK_USERS.items():
                if user_id == ADMIN_USER_ID or AuthService.is_admin_email(user.get("email", "")):
                    continue
                users.append(
                    AuthService._serialize_admin_user(
                        user,
                        trip_count=trip_counts.get(str(user_id), 0),
                    )
                )

        admin_user = AuthService._serialize_admin_user(
            AuthService.get_builtin_admin_user(),
            trip_count=trip_counts.get(ADMIN_USER_ID, 0),
        )

        users.sort(key=lambda user: user.get("created_at") or datetime.min, reverse=True)
        users = [admin_user] + [user for user in users if user.get("id") != ADMIN_USER_ID]

        return {
            "summary": {
                "total_users": len(users),
                "admin_users": len([user for user in users if user.get("is_admin")]),
                "regular_users": len([user for user in users if not user.get("is_admin")]),
                "total_trips": sum(int(user.get("trip_count", 0) or 0) for user in users),
            },
            "users": users,
        }

    @staticmethod
    def admin_update_user(
        user_id: str,
        email: Optional[str] = None,
        username: Optional[str] = None,
        bio: Optional[str] = None,
        profile_picture: Optional[str] = None,
    ):
        normalized_email = AuthService.normalize_email(email) if isinstance(email, str) else None
        normalized_username = AuthService.normalize_username(username) if isinstance(username, str) else None
        normalized_bio = bio.strip() if isinstance(bio, str) else None
        normalized_picture = profile_picture.strip() if isinstance(profile_picture, str) else None
        if normalized_picture == "":
            normalized_picture = None

        if normalized_email is not None and not normalized_email:
            raise ValueError("Email cannot be empty")
        if normalized_username is not None and not normalized_username:
            raise ValueError("Username cannot be empty")
        if user_id == ADMIN_USER_ID and normalized_email is not None and normalized_email != ADMIN_EMAIL:
            raise ValueError("Built-in admin email cannot be changed")

        database = db.get_db()
        if database is not None and user_id != ADMIN_USER_ID:
            try:
                users_collection = database["users"]
                object_id = ObjectId(user_id)
                existing_user = users_collection.find_one({"_id": object_id})
                if existing_user:
                    update_data = {}
                    if normalized_email is not None:
                        if AuthService.is_email_taken(normalized_email, exclude_user_id=user_id):
                            raise ValueError("Email already exists")
                        update_data["email"] = normalized_email

                    if normalized_username is not None:
                        if AuthService.is_username_taken(normalized_username, exclude_user_id=user_id):
                            raise ValueError("Username already exists")
                        update_data["username"] = normalized_username

                    if normalized_bio is not None:
                        update_data["profile.bio"] = normalized_bio
                    if profile_picture is not None:
                        update_data["profile.profile_picture"] = normalized_picture

                    if update_data:
                        updated = users_collection.find_one_and_update(
                            {"_id": object_id},
                            {"$set": update_data},
                            return_document=ReturnDocument.AFTER,
                        )
                    else:
                        updated = existing_user

                    if updated:
                        updated["_id"] = str(updated["_id"])
                        return AuthService._serialize_admin_user(
                            updated,
                            trip_count=AuthService._get_trip_count_for_user(user_id),
                        )
            except ValueError:
                raise
            except Exception:
                pass

        user = MOCK_USERS.get(user_id)
        if not user and user_id == ADMIN_USER_ID:
            user = _ensure_builtin_admin_user()
            MOCK_USERS[ADMIN_USER_ID] = user

        if not user:
            return None

        if normalized_email is not None:
            if AuthService.is_email_taken(normalized_email, exclude_user_id=user_id):
                raise ValueError("Email already exists")
            user["email"] = normalized_email

        if normalized_username is not None:
            if AuthService.is_username_taken(normalized_username, exclude_user_id=user_id):
                raise ValueError("Username already exists")
            user["username"] = normalized_username

        if normalized_bio is not None:
            user.setdefault("profile", {})["bio"] = normalized_bio

        if profile_picture is not None:
            user.setdefault("profile", {})["profile_picture"] = normalized_picture

        from app.services.trip_service import MOCK_TRIPS

        trip_count = len([trip for trip in MOCK_TRIPS.values() if str(trip.get("user_id", "")) == user_id])
        return AuthService._serialize_admin_user(user, trip_count=trip_count)

    @staticmethod
    def delete_user(user_id: str):
        if user_id == ADMIN_USER_ID:
            raise ValueError("Built-in admin user cannot be deleted")

        database = db.get_db()
        if database is not None:
            try:
                users_collection = database["users"]
                trips_collection = database["trips"]
                object_id = ObjectId(user_id)
                user = users_collection.find_one({"_id": object_id})
                if user:
                    user_email = AuthService.normalize_email(user.get("email", ""))
                    if AuthService.is_admin_email(user_email):
                        raise ValueError("Admin user cannot be deleted")

                    deleted_trips = trips_collection.delete_many({"user_id": user_id})
                    deleted_user = users_collection.delete_one({"_id": object_id})
                    if deleted_user.deleted_count > 0:
                        return {
                            "deleted_user_id": user_id,
                            "deleted_trip_count": int(deleted_trips.deleted_count or 0),
                        }
                    return None
            except ValueError:
                raise
            except Exception:
                pass

        user = MOCK_USERS.get(user_id)
        if not user:
            return None

        user_email = AuthService.normalize_email(user.get("email", ""))
        if AuthService.is_admin_email(user_email):
            raise ValueError("Admin user cannot be deleted")

        from app.services.trip_service import MOCK_TRIPS

        deleted_trip_ids = [
            trip_id
            for trip_id, trip in MOCK_TRIPS.items()
            if str(trip.get("user_id", "")) == user_id
        ]
        for trip_id in deleted_trip_ids:
            del MOCK_TRIPS[trip_id]

        del MOCK_USERS[user_id]
        return {
            "deleted_user_id": user_id,
            "deleted_trip_count": len(deleted_trip_ids),
        }

    @staticmethod
    def update_user_profile(
        user_id: str,
        username: Optional[str] = None,
        bio: Optional[str] = None,
        profile_picture: Optional[str] = None,
    ):
        normalized_username = AuthService.normalize_username(username) if isinstance(username, str) else None
        normalized_bio = bio.strip() if isinstance(bio, str) else None
        normalized_picture = profile_picture.strip() if isinstance(profile_picture, str) else None
        if normalized_picture == "":
            normalized_picture = None

        if normalized_username is not None and not normalized_username:
            raise ValueError("Username cannot be empty")

        database = db.get_db()
        if database is not None and user_id != ADMIN_USER_ID:
            try:
                users_collection = database["users"]
                object_id = ObjectId(user_id)
                existing_user = users_collection.find_one({"_id": object_id})
                if existing_user:
                    update_data = {}
                    if normalized_username is not None:
                        if AuthService.is_username_taken(normalized_username, exclude_user_id=user_id):
                            raise ValueError("Username already exists")
                        update_data["username"] = normalized_username

                    if normalized_bio is not None:
                        update_data["profile.bio"] = normalized_bio
                    if profile_picture is not None:
                        update_data["profile.profile_picture"] = normalized_picture

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

        user = MOCK_USERS.get(user_id)
        if not user and user_id == ADMIN_USER_ID:
            user = _ensure_builtin_admin_user()
            MOCK_USERS[ADMIN_USER_ID] = user

        if not user:
            return None

        if normalized_username is not None:
            if AuthService.is_username_taken(normalized_username, exclude_user_id=user_id):
                raise ValueError("Username already exists")
            user["username"] = normalized_username

        if normalized_bio is not None:
            user.setdefault("profile", {})["bio"] = normalized_bio

        if profile_picture is not None:
            user.setdefault("profile", {})["profile_picture"] = normalized_picture

        return user
