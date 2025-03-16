from pydantic import BaseModel
from typing import Optional, Dict


class NewMessageRequest(BaseModel):
    cid: Optional[str]
    type: Optional[str]
    message: Optional[Dict]
