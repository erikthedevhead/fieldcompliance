#!/usr/bin/env bash
# FieldCompliance — one-time droplet setup
# Run on a fresh Ubuntu 24.04 droplet as root
#
# Installs: Node 22, Postgres 16, PM2, nginx, certbot, ufw
# Creates: deploy user `fc`, database `fieldcompliance`, DB role `fc`
# Configures: firewall (SSH + HTTP + HTTPS only)

set -euo pipefail

echo "======================================"
echo "FieldCompliance droplet setup"
echo "======================================"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root."
  exit 1
fi

# ----- system prep -----
echo "→ Updating system packages…"
apt-get update -qq
apt-get upgrade -y -qq

echo "→ Installing base packages…"
apt-get install -y -qq \
  build-essential \
  curl \
  git \
  ufw \
  nginx \
  postgresql \
  postgresql-contrib \
  certbot \
  python3-certbot-nginx

# ----- node 22 via nvm-style install -----
echo "→ Installing Node.js 22…"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs
node --version
npm --version

echo "→ Installing PM2…"
npm install -g pm2 --silent

# ----- firewall -----
echo "→ Configuring firewall…"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ----- deploy user -----
echo "→ Creating deploy user 'fc'…"
if id fc >/dev/null 2>&1; then
  echo "  user already exists — skipping"
else
  useradd -m -s /bin/bash fc
  # Copy root's authorized_keys so you can SSH in as fc directly
  mkdir -p /home/fc/.ssh
  cp /root/.ssh/authorized_keys /home/fc/.ssh/ 2>/dev/null || true
  chown -R fc:fc /home/fc/.ssh
  chmod 700 /home/fc/.ssh
  chmod 600 /home/fc/.ssh/authorized_keys 2>/dev/null || true
fi

# ----- postgres -----
echo "→ Configuring PostgreSQL…"
systemctl enable postgresql
systemctl start postgresql

# Generate a strong password for the fc DB user
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-32)

# Create the fc role and fieldcompliance database, idempotently
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fc') THEN
    CREATE ROLE fc WITH LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE fc WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE fieldcompliance OWNER fc'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldcompliance')
\gexec

GRANT ALL PRIVILEGES ON DATABASE fieldcompliance TO fc;
EOF

# ----- summary -----
echo ""
echo "======================================"
echo "Setup complete."
echo "======================================"
echo ""
echo "Node:     $(node --version)"
echo "npm:      $(npm --version)"
echo "PM2:      $(pm2 --version)"
echo "Postgres: $(sudo -u postgres psql --version | awk '{print $3}')"
echo "nginx:    $(nginx -v 2>&1 | awk -F'/' '{print $2}')"
echo ""
echo "======================================"
echo "SAVE THIS DATABASE PASSWORD:"
echo "======================================"
echo ""
echo "  DATABASE_URL=\"postgresql://fc:${DB_PASSWORD}@localhost:5432/fieldcompliance\""
echo ""
echo "======================================"
echo ""
echo "Next: switch to the fc user and clone the repo."
echo "  su - fc"
echo "  git clone https://github.com/erikthedevhead/fieldcompliance.git"
echo ""
