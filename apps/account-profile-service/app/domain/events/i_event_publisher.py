from abc import ABC, abstractmethod
from core.pydantic.events.base import BaseEvent


class IEventPublisher(ABC):
    """
    Defines the interface for a service that can publish domain events.
    """

    @abstractmethod
    async def publish(self, event: BaseEvent) -> None:
        """
        Publishes an event to the message bus.
        """
        pass
