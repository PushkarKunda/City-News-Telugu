# services/email_templates.py

def get_otp_email_template(otp: str, name: str = "User", expires_in: int = 5) -> dict:
    """Generate OTP email HTML and text content"""
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .container {{
            max-width: 550px;
            margin: 20px auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }}
        .header p {{
            margin: 10px 0 0;
            opacity: 0.9;
        }}
        .content {{
            padding: 30px;
        }}
        .otp-code {{
            background: #F3F4F6;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }}
        .otp-code span {{
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #4F46E5;
            font-family: 'Courier New', monospace;
        }}
        .info-box {{
            background: #EFF6FF;
            border-left: 4px solid #4F46E5;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
        }}
        .footer {{
            background: #F9FAFB;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #6B7280;
            border-top: 1px solid #E5E7EB;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 HyperNews</h1>
            <p>Secure Login Verification</p>
        </div>
        <div class="content">
            <h2>Hello {name}!</h2>
            <p>We received a request to log in to your account. Use the verification code below to complete your login.</p>
            
            <div class="otp-code">
                <span>{otp}</span>
            </div>
            
            <div class="info-box">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0 0 20px; padding: 0;">
                    <li>This code is valid for <strong>{expires_in} minutes</strong></li>
                    <li>For security, never share this code with anyone</li>
                    <li>If you didn't request this, please ignore this email</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>© 2024 HyperNews. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
    """
    
    text_content = f"""
🔐 Your OTP Code: {otp}

Hello {name},

We received a request to log in to your account. Use the verification code below to complete your login.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Your OTP Code: {otp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Important:
• This code is valid for {expires_in} minutes
• Never share this code with anyone
• If you didn't request this, please ignore this email

---
HyperNews Team
"""
    
    return {
        "html": html_content,
        "text": text_content,
        "subject": f"🔐 Your OTP Code - {otp}"
    }


def get_sms_otp_template(otp: str) -> str:
    """SMS OTP template"""
    return f"🔐 HyperNews OTP: {otp}. Valid for 5 minutes. DO NOT share with anyone."


def get_welcome_email_template(name: str) -> dict:
    """Welcome email template for new users"""
    
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 30px; }}
        .button {{ background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to HyperNews!</h1>
        </div>
        <div class="content">
            <h2>Hello {name},</h2>
            <p>Thank you for joining our community! We're excited to have you on board.</p>
            <p>Here's what you can do:</p>
            <ul>
                <li>📰 Read personalized news feed</li>
                <li>🔥 Get breaking news alerts</li>
                <li>💬 Engage with comments and reactions</li>
                <li>🎁 Earn rewards and vouchers</li>
            </ul>
        </div>
    </div>
</body>
</html>
    """
    
    return {
        "html": html_content,
        "text": f"Welcome {name}! Thank you for joining HyperNews.",
        "subject": "🎉 Welcome to HyperNews!"
    }