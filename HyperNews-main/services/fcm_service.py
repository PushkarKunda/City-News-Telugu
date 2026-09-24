# services/fcm_service.py
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

try:
    import firebase_admin
    from firebase_admin import credentials, initialize_app, messaging
except ImportError:
    firebase_admin = None
    credentials = None
    initialize_app = None
    messaging = None

PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env", override=True)

logger = logging.getLogger(__name__)


class FCMService:
    """Firebase Cloud Messaging service for push notifications."""

    def __init__(self):
        self.app = None
        self._initialize()

    def _initialize(self):
        """Initialize Firebase Admin SDK."""
        try:
            if credentials is None or initialize_app is None or firebase_admin is None:
                logger.warning("firebase-admin is not installed; FCM push notifications are disabled")
                return

            try:
                self.app = firebase_admin.get_app()
                logger.info("Firebase Cloud Messaging already initialized")
                return
            except ValueError:
                pass

            firebase_creds = os.getenv("FIREBASE_CREDENTIALS_JSON")
            if firebase_creds:
                cred_dict = json.loads(firebase_creds)
                cred = credentials.Certificate(cred_dict)
            else:
                cred_path = Path(os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json"))
                if not cred_path.is_absolute():
                    cred_path = PROJECT_ROOT / cred_path

                if not cred_path.exists():
                    logger.warning("Firebase credentials not found at %s", cred_path)
                    return

                with cred_path.open("r", encoding="utf-8") as cred_file:
                    cred_json = json.load(cred_file)

                if cred_json.get("type") != "service_account":
                    logger.warning(
                        "Firebase credentials file must be a service-account JSON from Firebase Admin SDK, not google-services.json"
                    )
                    return

                cred = credentials.Certificate(str(cred_path))

            self.app = initialize_app(cred)
            logger.info("Firebase Cloud Messaging initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {str(e)}")
            self.app = None

    def is_available(self) -> bool:
        """Check if FCM is available."""
        return self.app is not None

    @staticmethod
    def _clean_data(data: Optional[Dict[str, Any]]) -> Dict[str, str]:
        """FCM data payload values must be strings."""
        if not data:
            return {}
        return {str(key): "" if value is None else str(value) for key, value in data.items()}

    def send_to_device(
        self,
        fcm_token: str,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
    ) -> bool:
        """Send push notification to a single device."""
        if not self.is_available() or not fcm_token:
            return False

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title[:100],
                    body=body[:200],
                    image=image_url,
                ),
                data=self._clean_data(data),
                token=fcm_token,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="hypernews_channel",
                        click_action="FLUTTER_NOTIFICATION_CLICK",
                    ),
                ),
                apns=messaging.APNSConfig(
                    headers={"apns-priority": "10"},
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1,
                            mutable_content=True,
                        )
                    ),
                ),
            )

            response = messaging.send(message)
            logger.info(f"Push sent to device: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send push: {str(e)}")
            return False

    def send_to_multiple(
        self,
        fcm_tokens: List[str],
        title: str,
        body: str,
        data: Dict = None,
    ) -> Dict[str, int]:
        """Send push notification to multiple devices."""
        if not self.is_available() or not fcm_tokens:
            return {"success": 0, "failed": len(fcm_tokens)}

        unique_tokens = list({token for token in fcm_tokens if token})
        if not unique_tokens:
            return {"success": 0, "failed": len(fcm_tokens)}

        try:
            batch_size = 500
            success_count = 0
            failure_count = 0

            for i in range(0, len(unique_tokens), batch_size):
                batch = unique_tokens[i : i + batch_size]
                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=title[:100],
                        body=body[:200],
                    ),
                    data=self._clean_data(data),
                    tokens=batch,
                    android=messaging.AndroidConfig(priority="high"),
                    apns=messaging.APNSConfig(headers={"apns-priority": "10"}),
                )

                response = messaging.send_each_for_multicast(message)
                success_count += response.success_count
                failure_count += response.failure_count

            logger.info(f"Push sent to {success_count} devices, failed: {failure_count}")
            return {"success": success_count, "failed": failure_count}
        except Exception as e:
            logger.error(f"Failed to send multicast: {str(e)}")
            return {"success": 0, "failed": len(fcm_tokens)}

    def send_to_topic(self, topic: str, title: str, body: str, data: Dict = None) -> bool:
        """Send push notification to all subscribers of a topic."""
        if not self.is_available():
            return False

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title[:100],
                    body=body[:200],
                ),
                data=self._clean_data(data),
                topic=topic,
                android=messaging.AndroidConfig(priority="high"),
                apns=messaging.APNSConfig(headers={"apns-priority": "10"}),
            )

            response = messaging.send(message)
            logger.info(f"Push sent to topic '{topic}': {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send topic push: {str(e)}")
            return False

    def subscribe_to_topic(self, fcm_tokens: List[str], topic: str) -> Dict[str, int]:
        """Subscribe devices to a topic."""
        if not self.is_available() or not fcm_tokens:
            return {"success": 0, "failed": len(fcm_tokens)}

        unique_tokens = list({token for token in fcm_tokens if token})
        if not unique_tokens:
            return {"success": 0, "failed": len(fcm_tokens)}

        try:
            response = messaging.subscribe_to_topic(unique_tokens, topic)
            logger.info(f"Subscribed {response.success_count} devices to '{topic}'")
            return {"success": response.success_count, "failed": response.failure_count}
        except Exception as e:
            logger.error(f"Failed to subscribe to topic: {str(e)}")
            return {"success": 0, "failed": len(fcm_tokens)}

    def unsubscribe_from_topic(self, fcm_tokens: List[str], topic: str) -> Dict[str, int]:
        """Unsubscribe devices from a topic."""
        if not self.is_available() or not fcm_tokens:
            return {"success": 0, "failed": len(fcm_tokens)}

        unique_tokens = list({token for token in fcm_tokens if token})
        if not unique_tokens:
            return {"success": 0, "failed": len(fcm_tokens)}

        try:
            response = messaging.unsubscribe_from_topic(unique_tokens, topic)
            logger.info(f"Unsubscribed {response.success_count} devices from '{topic}'")
            return {"success": response.success_count, "failed": response.failure_count}
        except Exception as e:
            logger.error(f"Failed to unsubscribe: {str(e)}")
            return {"success": 0, "failed": len(fcm_tokens)}


fcm_service = FCMService()
