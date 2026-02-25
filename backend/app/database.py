from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from app.config import settings
from typing import Optional

class MongoDatabase:
    client: Optional[MongoClient] = None
    db = None

    @classmethod
    def connect_db(cls):
        try:
            cls.client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=5000)
            cls.client.admin.command('ping')
            cls.db = cls.client[settings.DATABASE_NAME]
            print("[OK] Connected to MongoDB")
            return cls.db
        except (ServerSelectionTimeoutError, Exception) as e:
            print("[WARNING] MongoDB not available - running in mock mode")
            print(f"   URL: {settings.MONGODB_URL}")
            print(f"   Error: {str(e)}")
            # Don't raise error, allow app to run without DB
            return None

    @classmethod
    def close_db(cls):
        if cls.client:
            cls.client.close()
            print("MongoDB connection closed")

    @classmethod
    def get_db(cls):
        if cls.db is None:
            cls.connect_db()
        return cls.db  # Will be None if DB not available

db = MongoDatabase()
