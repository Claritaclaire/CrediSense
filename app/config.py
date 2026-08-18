from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    anthropic_api_key: str
    anthropic_model: str = "claude-haiku-4-5-20251001"
    anthropic_timeout_seconds: float = 25.0

    # SMTP configuration for email notifications
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_tls: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
