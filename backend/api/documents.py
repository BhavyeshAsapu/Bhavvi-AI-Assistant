"""
Documents API — list and inspect uploaded documents.
"""

from fastapi import APIRouter, Depends

from core.dependencies import get_current_user
from models.user import UserPublic
from services.file_service import get_document, get_user_documents

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", summary="List all documents for the current user")
async def list_documents(current_user: UserPublic = Depends(get_current_user)):
    docs = await get_user_documents(current_user.id)
    return {"documents": [d.model_dump() for d in docs]}


@router.get("/{doc_id}", summary="Get document metadata and indexing status")
async def get_document_status(
    doc_id: str, current_user: UserPublic = Depends(get_current_user)
):
    doc = await get_document(doc_id, current_user.id)
    return doc.model_dump(by_alias=False)
