from app.core.database import SessionLocal
from app.core.models import User

# Global dictionary to hold user memories: {user_id: memory_text}
user_memories = {}


def load_user_memories():
    """Load all user memories from the DB into the in‑memory dictionary."""
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for u in users:
            # If no memory exists, default to an empty string.
            user_memories[u.username] = u.memory if u.memory else ""
        print(f"[DEBUG] Loaded memories for {len(user_memories)} users.")
    finally:
        db.close()


def save_user_memories():
    """Persist the in‑memory user memories back to the DB."""
    db = SessionLocal()
    try:
        for user_id, memory in user_memories.items():
            user_obj = db.query(User).filter(User.username == user_id).first()
            if user_obj:
                user_obj.memory = memory
        db.commit()
        print("[DEBUG] User memories saved to DB.")
    finally:
        db.close()
