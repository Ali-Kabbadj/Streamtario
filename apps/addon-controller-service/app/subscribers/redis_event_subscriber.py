import asyncio
import json
from typing import Dict, Any
import redis.asyncio as redis
from pydantic import ValidationError
from core.pydantic.events.base import (
    AddonInstalledEvent,
    AddonUninstalledEvent,
    BaseEvent,
)
from app.use_cases.event_handlers.handle_addon_installed import (
    HandleAddonInstalledEventUseCase,
)
from app.use_cases.event_handlers.handle_addon_uninstalled import (
    HandleAddonUninstalledEventUseCase,
)
from core.utils.logging import log_init, log_error, log_warn

ADDON_EVENTS_CHANNEL = "addon_events"


class RedisEventSubscriber:
    def __init__(
        self,
        redis_client: redis.Redis,
        handle_addon_installed_use_case: HandleAddonInstalledEventUseCase,
        handle_addon_uninstalled_use_case: HandleAddonUninstalledEventUseCase,
    ):
        self.redis_client = redis_client
        self.handler_map = {
            "addon.installed": (handle_addon_installed_use_case, AddonInstalledEvent),
            "addon.uninstalled": (
                handle_addon_uninstalled_use_case,
                AddonUninstalledEvent,
            ),
        }

    async def _dispatch(self, raw_message: str):
        event_data: Dict[str, Any] | None = None
        try:
            event_data = json.loads(raw_message)

            if not isinstance(event_data, dict):
                log_warn(
                    "Decoded event data is not a dictionary",
                    data={"raw_message": raw_message},
                )
                return

            event_name = event_data.get("event_name")

            if not event_name:
                log_warn("Received event without an event_name", data=event_data)
                return

            handler_info = self.handler_map.get(event_name)
            if not handler_info:
                return

            handler, model = handler_info

            event: BaseEvent = model.model_validate(event_data)
            await handler.execute(event)

        except json.JSONDecodeError:
            log_error(
                "Failed to decode JSON from event message",
                data={"raw_message": raw_message},
            )
        except ValidationError as e:
            log_error(
                "Event validation failed",
                data={"errors": e.errors(), "raw_message": raw_message},
            )
        except Exception as e:
            log_error(
                "Unexpected error in event dispatcher",
                data={"error": str(e), "event_data": event_data},
            )

    async def listen(self):
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(ADDON_EVENTS_CHANNEL)
        log_init(
            f"Subscribed to Redis channel '{ADDON_EVENTS_CHANNEL}'. Listening for events...",
            context="subscriber",
        )

        while True:
            try:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=None
                )
                if message and message.get("type") == "message":
                    await self._dispatch(message["data"])
            except Exception as e:
                log_error(
                    f"Redis Pub/Sub listener crashed: {e}. Reconnecting in 5 seconds...",
                    context="subscriber",
                )
                await asyncio.sleep(5)
