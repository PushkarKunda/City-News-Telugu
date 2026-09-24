# services/otp_service.py
import os
import logging
import requests
from typing import Tuple, Optional
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from dotenv import load_dotenv
from services.email_templates import get_otp_email_template, get_sms_otp_template

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=True)

logger = logging.getLogger(__name__)


class OTPService:
    """Handles OTP delivery via Brevo API (Email + SMS)"""
    
    def __init__(self):
        self.brevo_api_key = os.getenv("BREVO_API_KEY")
        self.sender_email = os.getenv("BREVO_SENDER_EMAIL", "noreply@yourapp.com")
        self.sender_name = os.getenv("BREVO_SENDER_NAME", "Your News App")
        self.sms_sender = os.getenv("BREVO_SMS_SENDER", "NEWSAPP")
        self.environment = os.getenv("ENVIRONMENT", "development")
        
        # For development fallback
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        
        self._validate_config()
    
    def _validate_config(self):
        """Validate configuration on startup"""
        if self.environment == "production":
            if not self.brevo_api_key:
                logger.warning("⚠️ BREVO_API_KEY not set! Email sending will fail.")
            if not self.sender_email:
                logger.warning("⚠️ BREVO_SENDER_EMAIL not set!")
    
    def send_otp_via_email_brevo(self, email: str, otp: str, name: str = "User") -> Tuple[bool, str]:
        """Send OTP using Brevo API (Production)"""
        if not self.brevo_api_key:
            logger.error("Brevo API key missing")
            return False, "Email service not configured"
        
        try:
            template = get_otp_email_template(otp, name)
            
            url = "https://api.brevo.com/v3/smtp/email"
            
            headers = {
                "api-key": self.brevo_api_key,
                "Content-Type": "application/json",
                "accept": "application/json"
            }
            
            data = {
                "sender": {
                    "name": self.sender_name,
                    "email": self.sender_email
                },
                "to": [
                    {
                        "email": email,
                        "name": name
                    }
                ],
                "subject": template["subject"],
                "htmlContent": template["html"],
                "textContent": template["text"]
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ OTP email sent via Brevo to {email}")
                return True, "OTP sent successfully"
            else:
                logger.error(f"Brevo API error: {response.status_code} - {response.text}")
                return False, "Failed to send OTP email"
                
        except requests.exceptions.Timeout:
            logger.error("Brevo API timeout")
            return False, "Email service timeout"
        except Exception as e:
            logger.error(f"Brevo email error: {str(e)}")
            return False, "Failed to send OTP email"
    
    def send_otp_via_email_smtp(self, email: str, otp: str, name: str = "User") -> Tuple[bool, str]:
        """Send OTP using SMTP (Development/Fallback)"""
        if not all([self.smtp_host, self.smtp_user, self.smtp_password]):
            logger.warning("SMTP not configured")
            return False, "Email service not configured"
        
        try:
            template = get_otp_email_template(otp, name)
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = template["subject"]
            msg['From'] = self.sender_email
            msg['To'] = email
            
            # Attach both plain text and HTML
            msg.attach(MIMEText(template["text"], 'plain'))
            msg.attach(MIMEText(template["html"], 'html'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"✅ OTP email sent via SMTP to {email}")
            return True, "OTP sent successfully"
            
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            return False, "Failed to send OTP email"
    
    def send_otp_via_sms_brevo(self, phone: str, otp: str) -> Tuple[bool, str]:
        """Send OTP using Brevo SMS API"""
        if not self.brevo_api_key:
            logger.warning("Brevo API key missing for SMS")
            return False, "SMS service not configured"
        
        try:
            # Clean phone number
            import re
            clean_phone = re.sub(r'\D', '', phone)
            
            # Format with country code (default India +91)
            if len(clean_phone) == 10:
                clean_phone = f"91{clean_phone}"
            
            url = "https://api.brevo.com/v3/transactionalSMS/send"
            
            headers = {
                "api-key": self.brevo_api_key,
                "Content-Type": "application/json",
                "accept": "application/json"
            }
            
            message = get_sms_otp_template(otp)
            
            data = {
                "sender": self.sms_sender[:11],  # Max 11 characters
                "recipient": clean_phone,
                "content": message[:160],  # Max 160 characters for SMS
                "type": "transactional"
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ OTP SMS sent via Brevo to {phone}")
                return True, "OTP sent successfully"
            else:
                logger.error(f"Brevo SMS API error ({response.status_code}): {response.text}")
                try:
                    error_code = response.json().get("code")
                except ValueError:
                    error_code = None

                if response.status_code == 401 or error_code == "unauthorized":
                    return False, "Brevo rejected the SMS API key. Check BREVO_API_KEY is a valid Brevo API v3 key for this Brevo account."

                return False, "Failed to send OTP SMS"
                
        except Exception as e:
            logger.error(f"SMS error: {str(e)}")
            return False, "Failed to send OTP SMS"
    
    def send_otp_via_sms_console(self, phone: str, otp: str) -> Tuple[bool, str]:
        """Development mode - print to console"""
        print("\n" + "="*60)
        print(f"📱 OTP FOR PHONE: {phone}")
        print(f"🔑 OTP CODE: {otp}")
        print(f"⏰ Valid for: 5 minutes")
        print("="*60 + "\n")
        return True, "OTP generated (development mode)"
    
    def send_otp(self, contact_type: str, contact: str, otp: str, name: str = None) -> Tuple[bool, str]:
        """
        Main method to send OTP via appropriate channel
        Returns: (success, message)
        """
        if self.environment == "development":
            # Development: Print to console
            print(f"\n🔐 {contact_type.upper()} OTP for {contact}: {otp}\n")
            return True, "OTP generated (development mode)"
        
        # Production: Use Brevo
        if contact_type == "email":
            # Try Brevo first, fallback to SMTP
            success, message = self.send_otp_via_email_brevo(contact, otp, name or "User")
            if not success and self.smtp_host:
                return self.send_otp_via_email_smtp(contact, otp, name or "User")
            return success, message
        
        else:  # mobile
            return self.send_otp_via_sms_brevo(contact, otp)


# Singleton instance
otp_service = OTPService()


def get_otp_service() -> OTPService:
    """Dependency injection for OTP service"""
    return otp_service
