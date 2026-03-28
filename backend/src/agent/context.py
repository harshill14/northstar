import asyncio
from collections import deque

from src.models import Observation


class SharedContext:
    def __init__(self, max_observations: int = 100):
        self._observations: deque[Observation] = deque(maxlen=max_observations)
        self._last_seen: dict[str, dict] = {}
        self._lock = asyncio.Lock()

    @property
    def recent_observations(self) -> list[Observation]:
        return list(self._observations)

    @property
    def last_seen(self) -> dict[str, dict]:
        return dict(self._last_seen)

    def add_observation(self, observation: Observation) -> None:
        self._observations.append(observation)
        for obj in observation.objects:
            self._last_seen[obj.name] = {
                "location": obj.location,
                "timestamp": observation.timestamp,
            }

    async def add_observation_async(self, observation: Observation) -> None:
        async with self._lock:
            self.add_observation(observation)

    def get_summary(self, max_observations: int = 5) -> str:
        """Build a concise context summary. Kept short to avoid exceeding token limits."""
        lines = []
        if self._last_seen:
            lines.append("## Last Seen Items")
            # Only include last 20 items to keep it short
            items = list(self._last_seen.items())[-20:]
            for name, info in items:
                lines.append(f"- {name}: {info['location']} (at {info['timestamp']})")
        if self._observations:
            lines.append("\n## Recent Observations")
            for obs in list(self._observations)[-max_observations:]:
                # Only include first 3 actions and concerns per observation
                for action in obs.actions[:3]:
                    lines.append(f"- [{obs.timestamp}] {action}")
                for concern in obs.safety_concerns[:3]:
                    lines.append(f"- [{obs.timestamp}] SAFETY: {concern}")
        summary = "\n".join(lines) if lines else "No observations yet."
        # Hard cap at 2000 characters to stay within token limits
        if len(summary) > 2000:
            summary = summary[:2000] + "\n... (truncated)"
        return summary
