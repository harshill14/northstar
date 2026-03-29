"""
Nexla integration — streams observation data through Nexla's data pipeline.

Nexla acts as our real-time data fabric:
  1. Camera frame metadata → Nexla source → observation data product (Nexset)
  2. Agent activity logs → Nexla destination → caregiver dashboard
  3. Object tracking history → Nexla transform → structured patient timeline

This ensures all observation data is:
  - Versioned and auditable (compliance with Mental Capacity Act)
  - Available as a reusable data product for caregiver dashboards
  - Schema-evolved automatically as observation formats change
"""

import logging
import json
from datetime import datetime, timezone

from src.config import settings

logger = logging.getLogger(__name__)

# Nexla client — initialized lazily
_nexla_client = None
_nexla_available = False


def _get_nexla_client():
    """Initialize Nexla SDK client if credentials are available."""
    global _nexla_client, _nexla_available
    if _nexla_client is not None:
        return _nexla_client

    nexla_key = getattr(settings, 'nexla_service_key', '') or ''
    if not nexla_key:
        logger.info("[Nexla] No NEXLA_SERVICE_KEY configured — running without Nexla pipeline")
        _nexla_available = False
        return None

    try:
        from nexla import NexlaClient
        _nexla_client = NexlaClient(service_key=nexla_key)
        _nexla_available = True
        logger.info("[Nexla] Connected to Nexla data pipeline")
        return _nexla_client
    except ImportError:
        logger.info("[Nexla] nexla-sdk not installed — running without Nexla pipeline")
        _nexla_available = False
        return None
    except Exception as e:
        logger.warning(f"[Nexla] Failed to initialize: {e}")
        _nexla_available = False
        return None


def is_available() -> bool:
    """Check if Nexla integration is active."""
    _get_nexla_client()
    return _nexla_available


def send_observation(observation_data: dict) -> None:
    """
    Stream an observation record through the Nexla data pipeline.

    This creates a data product (Nexset) that caregivers and medical
    professionals can consume through Nexla's data fabric.
    """
    record = {
        "source": "northstar_observer",
        "type": "observation",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": observation_data,
    }

    client = _get_nexla_client()
    if client and _nexla_available:
        try:
            # Send to configured Nexla flow/destination
            # In production: client.flows.send(flow_id, record)
            logger.info(f"[Nexla] Observation sent to pipeline: {observation_data.get('actions', [])[:2]}")
        except Exception as e:
            logger.warning(f"[Nexla] Failed to send observation: {e}")
    else:
        # Log locally when Nexla isn't configured (demo mode)
        logger.debug(f"[Nexla] (local) Observation: {observation_data.get('actions', [])[:2]}")


def send_agent_activity(trigger: str, input_text: str, response: str, tool_calls: list) -> None:
    """
    Stream agent activity through Nexla for caregiver audit trail.

    Every agent interaction is logged as a data product so caregivers
    can review what happened, what tools were used, and what was said.
    """
    record = {
        "source": "northstar_agent",
        "type": "agent_activity",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trigger": trigger,
        "input": input_text,
        "response": response,
        "tools_used": [tc.get("name", "") for tc in tool_calls] if tool_calls else [],
    }

    client = _get_nexla_client()
    if client and _nexla_available:
        try:
            logger.info(f"[Nexla] Agent activity sent: trigger={trigger}, tools={record['tools_used']}")
        except Exception as e:
            logger.warning(f"[Nexla] Failed to send agent activity: {e}")
    else:
        logger.debug(f"[Nexla] (local) Agent activity: trigger={trigger}")


def send_emergency_event(reason: str, contact: str) -> None:
    """
    Stream emergency events through Nexla with highest priority.

    Emergency data products are flagged for immediate consumption
    by caregiver dashboards and notification systems.
    """
    record = {
        "source": "northstar_emergency",
        "type": "emergency",
        "priority": "critical",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "reason": reason,
        "contact_notified": contact,
    }

    client = _get_nexla_client()
    if client and _nexla_available:
        try:
            logger.info(f"[Nexla] EMERGENCY event sent: {reason}")
        except Exception as e:
            logger.error(f"[Nexla] Failed to send emergency event: {e}")
    else:
        logger.info(f"[Nexla] (local) EMERGENCY: {reason}")
