#!/bin/bash
# -----------------------------------------------------------------------------
# deploy.sh — One-shot setup script for DigitalOcean Ubuntu Droplet
# Run this ONCE on a fresh Ubuntu 22.04 Droplet as root:
#   chmod +x deploy.sh && sudo ./deploy.sh
# -----------------------------------------------------------------------------

set -e  # Exit on any error

APP_USER="appuser"
APP_DIR="/home/$APP_USER/attendance-system"
REPO_URL="https://github.com/YOUR_USERNAME/Attendence-System-FOC.git"  # ? change this
BACKEND_DIR="$APP_DIR/backend-flask"

echo "==> [1/8] Updating system packages..."
apt-get update && apt-get upgrade -y

echo "==> [2/8] Installing dependencies..."
apt-get install -y \
    python3.11 python3.11-venv python3-pip \
    nginx certbot python3-certbot-nginx \
    libpq-dev gcc git curl

echo "==> [3/8] Creating app user..."
id -u $APP_USER &>/dev/null || useradd -m -s /bin/bash $APP_USER

echo "==> [4/8] Cloning repository..."
sudo -u $APP_USER git clone $REPO_URL $APP_DIR 2>/dev/null || \
    sudo -u $APP_USER git -C $APP_DIR pull

echo "==> [5/8] Setting up Python virtual environment..."
sudo -u $APP_USER python3.11 -m venv $BACKEND_DIR/.venv
sudo -u $APP_USER $BACKEND_DIR/.venv/bin/pip install --upgrade pip
sudo -u $APP_USER $BACKEND_DIR/.venv/bin/pip install -r $BACKEND_DIR/requirements.txt

echo "==> [6/8] Setting up .env file..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env
    echo ""
    echo "  ??  IMPORTANT: Edit $BACKEND_DIR/.env and fill in your values!"
    echo "     nano $BACKEND_DIR/.env"
    echo ""
fi

echo "==> [7/8] Setting up systemd service..."
cat > /etc/systemd/system/attendance.service << EOF
[Unit]
Description=Attendance System Flask Backend
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
ExecStart=$BACKEND_DIR/.venv/bin/gunicorn "app:create_app()" \\
    --bind 127.0.0.1:8000 \\
    --workers 2 \\
    --timeout 120 \\
    --access-logfile /var/log/attendance/access.log \\
    --error-logfile /var/log/attendance/error.log
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/log/attendance
chown $APP_USER:$APP_USER /var/log/attendance

systemctl daemon-reload
systemctl enable attendance
systemctl start attendance

echo "==> [8/8] Setting up Nginx..."
cp $BACKEND_DIR/nginx.conf /etc/nginx/sites-available/attendance
ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/attendance
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo ""
echo "? Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Edit your .env:  nano $BACKEND_DIR/.env"
echo "  2. Restart service: sudo systemctl restart attendance"
echo "  3. Check status:    sudo systemctl status attendance"
echo "  4. View logs:       sudo journalctl -u attendance -f"
echo "  5. Setup SSL:       sudo certbot --nginx -d your-domain.com"
echo ""
