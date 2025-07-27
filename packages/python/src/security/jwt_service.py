from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from pydantic import ValidationError
from .schemas import TokenPayload
from domain_exceptions.exceptions import ApiException


class IJwtService(ABC):
    @abstractmethod
    def create_access_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        pass

    @abstractmethod
    def create_refresh_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        pass

    @abstractmethod
    def decode_token(self, token: str) -> TokenPayload:
        pass


class JwtService(IJwtService):
    # --- THIS IS THE FIX ---
    # Add explicit type hints to the constructor.
    def __init__(
        self,
        secret_key: str,
        algorithm: str,
        access_token_expire_minutes: int,
        refresh_token_expire_days: int,
    ):
        self.secret_key = secret_key
        self.algorithm = algorithm
        # Pydantic (used in the container) will now see these hints and automatically
        # convert the string values from settings into integers.
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days

    def create_access_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # This line will now work correctly because the value is an integer.
            expire = datetime.now(timezone.utc) + timedelta(
                minutes=self.access_token_expire_minutes
            )
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(
        self, data: dict, expires_delta: Optional[timedelta] = None
    ) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            # This will also be fixed for the same reason.
            expire = datetime.now(timezone.utc) + timedelta(
                days=self.refresh_token_expire_days
            )
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def decode_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return TokenPayload(**payload)
        except JWTError as e:
            raise ApiException(
                status_code=401,
                message=f"Could not validate credentials: {e}",
                ui_message="Your session is invalid or has expired. Please log in again.",
                details={"error_type": "JWTError"},
            )
        except ValidationError:
            raise ApiException(
                status_code=401,
                message="Invalid token payload.",
                ui_message="Your session is invalid or has expired. Please log in again.",
                details={"error_type": "TokenPayloadError"},
            )
