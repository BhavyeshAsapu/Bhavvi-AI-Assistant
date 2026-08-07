"""
Application settings — loaded from environment variables via Pydantic Settings.

Usage:
    from config.settings import get_settings
    settings = get_settings()

All values come from the .env file in the backend directory.
Never hardcode secrets — add them to .env and declare a field here.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration object.

    Fields map 1-to-1 with environment variable names (case-insensitive).
    Defaults are safe values suitable for local development.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",          # silently drop unknown env vars
    )

    # ── Application ───────────────────────────────────────────────────────────
    app_name: str = "Bhavvi AI Assistant"
    app_version: str = "1.0.0"
    environment: str = "development"   # development | staging | production
    debug: bool = True
    log_level: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    # ── API ───────────────────────────────────────────────────────────────────
    api_prefix: str = "/api/v1"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    # ── Security / JWT ────────────────────────────────────────────────────────
    jwt_secret_key: str = "CHANGE_ME_generate_a_secure_random_secret_key"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours

    # ── Google Gemini ─────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model_flash: str = "gemini-2.5-flash"
    gemini_model_pro: str = "gemini-2.5-pro"
    gemini_embedding_model: str = "models/text-embedding-004"

    # ── MongoDB ───────────────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "bhavvi_ai"

    # ── ChromaDB ─────────────────────────────────────────────────────────────
    chroma_persist_directory: str = "./vectorstore/chroma_db"
    chroma_collection_name: str = "bhavvi_documents"

    @property
    def chroma_path(self) -> Path:
        return Path(self.chroma_persist_directory)

    # ── File Uploads ──────────────────────────────────────────────────────────
    upload_directory: str = "./uploads"
    max_upload_size_mb: int = 50
    # Stored as a comma-separated string in .env; parsed to list via property
    allowed_file_types_raw: str = Field(
        default="application/pdf,image/jpeg,image/png,image/webp,"
                "application/vnd.ms-powerpoint,"
                "application/vnd.openxmlformats-officedocument.presentationml.presentation,"
                "application/msword,"
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        alias="ALLOWED_FILE_TYPES",
    )

    @property
    def allowed_file_types(self) -> list[str]:
        return [t.strip() for t in self.allowed_file_types_raw.split(",") if t.strip()]

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_directory)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    # ── SMTP (Email Verification) ─────────────────────────────────────────────
    smtp_email: str = ""
    smtp_app_password: str = ""
    frontend_url: str = "http://localhost:5173"

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    rate_limit_requests_per_minute: int = 60
    rate_limit_chat_per_minute: int = 20


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings singleton.

    Using lru_cache ensures .env is read once at startup, not on every request.
    Call get_settings.cache_clear() in tests to reset between test cases.
    """
    return Settings()
