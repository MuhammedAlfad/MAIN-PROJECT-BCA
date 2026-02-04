from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from app.config import settings
from typing import Optional

class MongoDatabase:
    client: Optional[MongoClient] = None
    db = None

    @classmethod
    def connect_db(cls):
        cls.client = MongoClient(settings.MONGODB_URL, serverSelectionTimeoutMS=30000)
        try:
            cls.client.admin.command('ping')
            cls.db = cls.client[settings.DATABASE_NAME]
            print("[OK] Connected to MongoDB")
            return cls.db
        except ServerSelectionTimeoutError:
            print("[ERROR] Failed to connect to MongoDB")
            print(f"   URL: {settings.MONGODB_URL}")
            raise
        except Exception as e:
            print(f"[ERROR] MongoDB Error: {str(e)}")
            raise

    @classmethod
    def close_db(cls):
        if cls.client:
            cls.client.close()
            print("MongoDB connection closed")

    @classmethod
    def get_db(cls):
        if cls.db is None:
            cls.connect_db()
        return cls.db

db = MongoDatabase()
