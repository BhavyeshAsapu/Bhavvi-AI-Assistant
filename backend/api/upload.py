"""
File upload API endpoint.

POST /upload — accepts multipart files, validates, persists,
and triggers background RAG indexing for PDFs.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status

from core.dependencies import get_current_user
from models.user import UserPublic
from services.file_service import save_upload
from services.rag_service import index_document

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF or image file",
    description=(
        "Accepts PDF, JPEG, PNG, or WebP files up to 50 MB. "
        "PDFs are indexed asynchronously — poll the document status endpoint "
        "to check when indexing is complete."
    ),
)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
    current_user: UserPublic = Depends(get_current_user),
):
    """Upload and process a file.

    Returns the document metadata immediately. For PDFs, RAG indexing
    runs in the background — check `status` field to know when it's ready.
    """
    doc = await save_upload(
        file=file,
        user_id=current_user.id,
        session_id=session_id,
    )

    # Trigger background RAG indexing for PDFs
    if doc.document_type == "pdf":
        background_tasks.add_task(
            index_document,
            doc_id=doc.id,
            storage_path=f"{current_user.id}/{doc.filename}",
            original_filename=doc.original_filename,
            user_id=current_user.id,
        )

    return {
        "success": True,
        "document": doc.model_dump(),
        "message": (
            "PDF uploaded successfully. Indexing in progress."
            if doc.document_type == "pdf"
            else "Image uploaded successfully."
        ),
    }
