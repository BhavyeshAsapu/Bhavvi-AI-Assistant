"""
Image processing service.

Prepares images for the Gemini Vision API by validating dimensions,
resizing if necessary, and encoding as base64. This avoids sending
unnecessarily large images and keeps latency low.
"""

import base64
import io
from pathlib import Path

from PIL import Image

from core.logging import get_logger

logger = get_logger(__name__)

_MAX_DIMENSION = 2048   # Gemini Vision handles up to 3072px, but 2048 is sweet spot
_JPEG_QUALITY = 90


def prepare_image_for_vision(file_path: Path) -> tuple[str, str]:
    """Load, optionally resize, and base64-encode an image.

    Args:
        file_path: Absolute path to the image file.

    Returns:
        Tuple of (base64_encoded_string, mime_type).
    """
    with Image.open(file_path) as img:
        # Convert RGBA / palette images to RGB for JPEG compatibility
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Resize if either dimension exceeds the max
        if max(img.size) > _MAX_DIMENSION:
            img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION), Image.LANCZOS)
            logger.debug(
                "image_resized",
                original_size=img.size,
                max_dimension=_MAX_DIMENSION,
            )

        # Encode to JPEG bytes
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
        buffer.seek(0)
        encoded = base64.b64encode(buffer.read()).decode("utf-8")

    return encoded, "image/jpeg"


def get_image_dimensions(file_path: Path) -> tuple[int, int]:
    """Return (width, height) of an image without fully loading it."""
    with Image.open(file_path) as img:
        return img.size
