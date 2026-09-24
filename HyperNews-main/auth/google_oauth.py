import logging
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import os

logger = logging.getLogger(__name__)

config_data = {
    "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID"),
    "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET"),
}

if not config_data["GOOGLE_CLIENT_ID"] or not config_data["GOOGLE_CLIENT_SECRET"]:
    logger.warning("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set. Google login disabled.")
    oauth = None
else:
    starlette_config = Config(environ=config_data)
    oauth = OAuth(starlette_config)
    oauth.register(
        name="google",
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={
            "scope": "openid email profile",
            "prompt": "select_account",
        },
    )
