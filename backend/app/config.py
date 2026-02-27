from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ROOT_ENV_FILE = _BACKEND_DIR.parent / ".env"
_BACKEND_ENV_FILE = _BACKEND_DIR / ".env"
_AUTH_ENV_FILE = _BACKEND_DIR.parent / ".env.auth.local"


class Settings(BaseSettings):
    """Application settings loaded from root/backend/auth env files."""

    model_config = SettingsConfigDict(
        env_file=(str(_ROOT_ENV_FILE), str(_BACKEND_ENV_FILE), str(_AUTH_ENV_FILE)),
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://app_user:app_password@localhost:5432/app_db"
    SECRET_KEY: str = "change-me"
    DEBUG: bool = True
    APP_ENV: str = "local"
    SEED_DEMO_DATA: bool = False
    AUTH_MODE: str = "hosted_dev"
    AUTH_REQUIRED: bool = False
    AUTH_ISSUER: str = ""
    AUTH_AUDIENCE: str = ""
    AUTH_JWKS_URL: str = ""
    AUTH_HS256_SHARED_SECRET: str = ""
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:8000"

    @property
    def cors_allowed_origins(self) -> list[str]:
        """Return allowed CORS origins as a normalized list."""

        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    def validate_runtime_config(self) -> None:
        """Validate minimal runtime constraints for local vs non-local modes."""

        valid_modes = {"hosted_dev", "local_offline"}
        if self.AUTH_MODE not in valid_modes:
            raise ValueError(
                f"AUTH_MODE must be one of {sorted(valid_modes)}; got '{self.AUTH_MODE}'"
            )

        is_non_local_environment = self.APP_ENV != "local"
        if is_non_local_environment and self.DEBUG:
            raise ValueError("DEBUG must be false outside local environment")

        if is_non_local_environment and not self.AUTH_REQUIRED:
            raise ValueError("AUTH_REQUIRED must be true outside local environment")

        if is_non_local_environment and not self.cors_allowed_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS must be set outside local environment")

        if not self.AUTH_REQUIRED:
            return

        required_auth_fields = {
            "AUTH_ISSUER": self.AUTH_ISSUER,
            "AUTH_AUDIENCE": self.AUTH_AUDIENCE,
            "AUTH_JWKS_URL": self.AUTH_JWKS_URL,
        }
        missing_fields = [key for key, value in required_auth_fields.items() if not value.strip()]
        if missing_fields:
            missing_text = ", ".join(missing_fields)
            raise ValueError(f"Missing required auth configuration: {missing_text}")


settings = Settings()
