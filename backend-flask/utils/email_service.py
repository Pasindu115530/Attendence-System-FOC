import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_account_creation_email(to_email, name, username, password):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    subject = "Your Student Account has been Created!"
    
    # HTML formatted message
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #2C3A4E; line-height: 1.6;">
        <h2 style="color: #35A7C4;">Hello {name},</h2>
        <p>Your student account has been successfully created by the Administrator of the **Faculty of Computing, University of Sri Jayewardenepura**.</p>
        <p>You can now log in to the Attendance System using the following credentials:</p>
        <div style="background-color: #ECF0F3; border-radius: 12px; padding: 15px; margin: 15px 0; border: 1px solid #D1D9E6; display: inline-block;">
          <p style="margin: 4px 0;"><strong>Username / Index No:</strong> <span style="font-family: monospace; color: #35A7C4; font-size: 16px;">{username}</span></p>
          <p style="margin: 4px 0;"><strong>Password / NIC:</strong> <span style="font-family: monospace; color: #35A7C4; font-size: 16px;">{password}</span></p>
        </div>
        <p>Please change your password immediately after logging in for security purposes.</p>
        <p>Best regards,<br/><strong>Administrator</strong><br/>Faculty of Computing</p>
      </body>
    </html>
    """

    # Plain text version for fallback
    text_content = f"""
    Hello {name},

    Your student account has been successfully created by the Administrator.

    Username / Index No: {username}
    Password / NIC: {password}

    Please change your password immediately after logging in for security purposes.

    Best regards,
    Administrator
    Faculty of Computing
    """

    if not smtp_user or not smtp_password:
        print("[EMAIL NOTIFICATION WARNING] SMTP credentials not set in environment (.env).")
        print(f"To: {to_email}")
        print(f"Subject: {subject}")
        print(f"Body:\n{text_content}")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"[EMAIL SUCCESS] Sent registration details to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email: {e}")
        return False
