import os
from pydantic import AnyUrl, Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any

class Settings(BaseSettings):
    PROJECT_NAME: str = "TransitPulse Agency Platform"
    API_V1_STR: str = "/api/v1"
    
    # Agency configuration
    DEFAULT_AGENCY_ID: str = Field(
        default="golden_gate_transit",
        env="DEFAULT_AGENCY_ID"
    )
    
    # Agency branding and configuration
    AGENCY_CONFIGS: Dict[str, Dict[str, Any]] = {
        "golden_gate_transit": {
            "name": "Golden Gate Transit",
            "display_name": "Golden Gate Transit",
            "short_name": "GGT",
            "website": "https://www.goldengate.org/",
            "color_primary": "#0052A3",
            "color_secondary": "#FFD700",
            "logo_url": "/logos/ggt-logo.png",
            "gtfs_static_url": "https://gtfs.goldengate.org/gtfs/google_transit.zip",
            "gtfs_rt_vehicles_url": "https://api.goldengate.org/public/gtfs-rt/vehicles",
            "enabled": True
        }
        # Additional agencies can be added here
    }
    
    # Database configuration
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://transitpulse_user:transitpulse_pass@localhost:5432/transitpulse_db",
        env="DATABASE_URL"
    )
    
    # Redis configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        env="REDIS_URL"
    )
    
    # API settings
    DEBUG: bool = Field(
        default=False,
        env="DEBUG"
    )
    
    # CORS settings
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:9000"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Ignore extra fields in environment variables

# Create settings instance
settings = Settings()

# Print database URL for debugging (with sensitive info redacted)
if settings.DATABASE_URL:
    db_url = settings.DATABASE_URL
    # Simple redaction of password in URL
    if '@' in db_url and '://' in db_url:
        protocol_part = db_url.split('://')[0] + '://'
        rest = db_url.split('://')[1]
        if '@' in rest:
            auth_part = rest.split('@')[0]
            if ':' in auth_part:
                user = auth_part.split(':')[0]
                safe_url = f"{protocol_part}{user}:***@{'@'.join(rest.split('@')[1:])}"
            else:
                safe_url = f"{protocol_part}***@{'@'.join(rest.split('@')[1:])}"
        else:
            safe_url = db_url
    else:
        safe_url = "[invalid URL]"
    
    print(f"Database URL: {safe_url}")
else:
    print("WARNING: DATABASE_URL is not set. Database connections will fail.")

# Print other settings if in debug mode
if settings.DEBUG:
    print(f"Debug mode: {settings.DEBUG}")
    print(f"Project name: {settings.PROJECT_NAME}")
    print(f"API base path: {settings.API_V1_STR}")
