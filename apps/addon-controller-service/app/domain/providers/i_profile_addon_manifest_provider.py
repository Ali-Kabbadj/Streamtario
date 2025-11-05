from abc import ABC, abstractmethod
from typing import List


class IProfileAddonManifestProvider(ABC):
    @abstractmethod
    async def get_manifest_urls(self, profile_id: str) -> List[str]:
        pass
