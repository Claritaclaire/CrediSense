from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = Field(default="sqlite:///./credit_simulateur.db", validation_alias="DATABASE_URL")
    secret_key: str = Field(default="credisense-dev-secret-key-32charsminimum!", validation_alias="SECRET_KEY")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    anthropic_api_key: str = Field(default="", validation_alias="ANTHROPIC_API_KEY")
    anthropic_model: str = "claude-haiku-4-5-20251001"
    anthropic_timeout_seconds: float = 25.0
    dify_api_key: str = ""
    dify_api_url: str = "https://api.dify.ai/v1"

    # SMTP configuration for email notifications
    smtp_host: str = Field(default="", validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str = Field(default="", validation_alias="SMTP_USERNAME")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="", validation_alias="EMAIL_FROM")
    smtp_tls: bool = Field(default=True, validation_alias="SMTP_USE_TLS")
    demandes_email_destinataire: str = Field(
        default="",
        validation_alias="DEMANDES_EMAIL_DESTINATAIRE",
    )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
