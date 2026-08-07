"""
Vision Agent — multimodal image understanding using Gemini Vision.

Handles images by sending them inline to Gemini Pro's vision capability.
Supports: photos, charts, diagrams, screenshots, handwritten notes, OCR.
"""

import google.generativeai as genai

from agents.state import AgentState
from config.settings import get_settings
from core.logging import get_logger

logger = get_logger(__name__)

_VISION_SYSTEM_PROMPT = """You are Bhavvi AI's Vision Specialist.

Analyze the provided image(s) thoroughly and respond to the user's question.

Your analysis should cover (as relevant):
- Main subjects and objects in the image
- Text content (OCR) if present
- Data, charts, or diagrams if present — extract values and trends
- Diagrams or flowcharts — explain the flow and relationships
- Code or UI screenshots — describe functionality
- Handwritten content — transcribe accurately

Be specific and detailed. Use Markdown formatting.
If the user asked a specific question about the image, answer it directly."""


async def vision_agent_node(state: AgentState) -> AgentState:
    """LangGraph node: analyze attached images using Gemini Vision."""
    if "vision" not in state.get("agents_to_run", []):
        return state

    attached_images = state.get("attached_images", [])
    if not attached_images:
        logger.warning("vision_agent_no_images")
        return {**state, "vision_response": None}

    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(model_name=settings.gemini_model_pro)

    # Build the content parts: text + inline images
    parts: list = [_VISION_SYSTEM_PROMPT, f"\n\nUser question: {state.get('user_message', '')}"]

    for img_data in attached_images:
        parts.append(
            {
                "inline_data": {
                    "mime_type": img_data.get("mime_type", "image/jpeg"),
                    "data": img_data["base64"],
                }
            }
        )

    logger.info("vision_agent_invoke", num_images=len(attached_images))

    response = await model.generate_content_async(parts)
    return {**state, "vision_response": response.text}
