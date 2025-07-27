import redis.asyncio as redis
from app.domain.events.i_event_publisher import IEventPublisher
from core.pydantic.events.base import BaseEvent
from core.utils.logging import log_info, log_error

ADDON_EVENTS_CHANNEL = "addon_events"


class RedisEventPublisher(IEventPublisher):
    """
    Implements the event publisher using Redis Pub/Sub.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client

    async def publish(self, event: BaseEvent) -> None:
        try:
            message = event.model_dump_json()
            await self.redis_client.publish(ADDON_EVENTS_CHANNEL, message)
            log_info(
                f"Successfully published event '{event.event_name}'",
                context="event_publisher",
                data={"event_id": event.event_id, "channel": ADDON_EVENTS_CHANNEL},
            )
        except Exception as e:
            log_error(
                f"Failed to publish event '{event.event_name}' to Redis",
                context="event_publisher",
                data={"event_id": event.event_id, "error": str(e)},
            )
