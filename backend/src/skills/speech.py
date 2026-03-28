"""Speech/TTS skill — convert text to speech audio for the user.

Returns base64-encoded audio that the server can push over WebSocket.
"""
from __future__ import annotations

import base64
import logging

from langchain_core.tools import tool

from src.config import settings

logger = logging.getLogger(__name__)


def _tts_openai(text: str) -> bytes:
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.audio.speech.create(
        model="tts-1",
        voice="nova",
        input=text,
        response_format="mp3",
    )
    return response.content


def _tts_elevenlabs(text: str) -> bytes:
    import httpx
    response = httpx.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}",
        headers={"xi-api-key": settings.elevenlabs_api_key, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.75, "similarity_boost": 0.75},
        },
        timeout=30.0,
    )
    response.raise_for_status()
    return response.content


@tool
def speech_tool(text: str) -> str:
    """Convert text to speech audio. Use this to speak to the user.

    Returns confirmation with base64-encoded audio that the server pushes
    to the iOS app over WebSocket.
    """
    audio_b64 = ""

    try:
        if settings.tts_provider == "elevenlabs" and settings.elevenlabs_api_key:
            audio_bytes = _tts_elevenlabs(text)
        elif settings.openai_api_key:
            audio_bytes = _tts_openai(text)
        else:
            logger.warning("No TTS API key configured — returning text only")
            return f"[TTS unavailable] {text}"

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        return f"[TTS error] {text}"

    return f"SPEECH:{audio_b64}:{text}"
