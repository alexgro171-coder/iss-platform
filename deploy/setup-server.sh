#!/bin/bash
# =============================================================================
# Script de configurare server pentru ISS Platform
# Rulează pe Ubuntu 24.04 LTS (DigitalOcean Droplet)
# =============================================================================

set -e  # Oprește la prima eroare

echo "=========================================="
echo "  ISS Platform - Setup Server"
echo "=========================================="

# Culori pentru output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# =============================================================================
# 1. Actualizare sistem
# =============================================================================
print_step "Actualizare sistem..."
apt update && apt upgrade -y

# =============================================================================
# 2. Instalare dependențe
# =============================================================================
print_step "Instalare dependențe de bază..."
apt install -y curl git nginx certbot python3-certbot-nginx ufw

# =============================================================================
# 3. Instalare Docker
# =============================================================================
print_step "Instalare Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    
    # Instalare Docker Compose
    apt install -y docker-compose-plugin
else
    print_warning "Docker deja instalat"
fi

# =============================================================================
# 4. Instalare Node.js 20 LTS
# =============================================================================
print_step "Instalare Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    print_warning "Node.js deja instalat: $(node --version)"
fi

# =============================================================================
# 5. Creare director pentru aplicație
# =============================================================================
print_step "Creare director aplicație..."
mkdir -p /var/www/iss-platform
cd /var/www/iss-platform

# =============================================================================
# 6. Clonare repository (dacă nu există)
# =============================================================================
print_step "Clonare repository GitHub..."
if [ ! -d ".git" ]; then
    git clone https://github.com/alexgro171-coder/iss-platform.git .
else
    print_warning "Repository deja clonat, facem pull..."
    git pull origin main
fi

# =============================================================================
# 7. Creare fișier .env pentru backend
# =============================================================================
print_step "Creare fișier .env..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
# Database
DB_NAME=iss_db
DB_USER=iss_admin
DB_PASSWORD=iss_secure_password_2024
DB_HOST=db
DB_PORT=5432

# Django
DEBUG=False
SECRET_KEY=your-super-secret-key-change-this-in-production
ALLOWED_HOSTS=159.89.29.249,localhost,127.0.0.1
EOF
    print_warning "IMPORTANT: Editează /var/www/iss-platform/.env și schimbă SECRET_KEY!"
else
    print_warning "Fișierul .env există deja"
fi

# =============================================================================
# 8. Build și pornire containere Docker
# =============================================================================
print_step "Build și pornire Docker containers..."
docker compose up -d --build

# Așteaptă să pornească
sleep 10

# =============================================================================
# 9. Rulare migrări Django
# =============================================================================
print_step "Rulare migrări Django..."
docker exec iss_backend python manage.py migrate

# =============================================================================
# 10. Creare superuser (opțional)
# =============================================================================
print_step "Creare superuser Django..."
docker exec -it iss_backend python manage.py shell -c "
from django.contrib.auth.models import User
from iss.models import UserProfile, UserRole
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser('admin', 'admin@iss.com', 'admin123')
    UserProfile.objects.create(user=user, role=UserRole.ADMIN)
    print('Superuser admin creat!')
else:
    print('Superuser admin există deja')
"

# =============================================================================
# 11. Build Frontend
# =============================================================================
print_step "Build Frontend React..."
cd /var/www/iss-platform/frontend
npm install
npm run build

# Copiază build-ul în directorul Nginx
mkdir -p /var/www/iss-platform/static
cp -r dist/* /var/www/iss-platform/static/

# =============================================================================
# 12. Configurare Nginx
# =============================================================================
print_step "Configurare Nginx..."
cat > /etc/nginx/sites-available/iss-platform << 'EOF'
server {
    listen 80;
    server_name 159.89.29.249;

    # Frontend - fișiere statice React
    root /var/www/iss-platform/static;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Frontend routes - React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend - Django
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files pentru Django Admin
    location /static/ {
        alias /var/www/iss-platform/backend/static/;
    }
}
EOF

# Activare site
ln -sf /etc/nginx/sites-available/iss-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test și restart Nginx
nginx -t
systemctl restart nginx

# =============================================================================
# 13. Configurare Firewall
# =============================================================================
print_step "Configurare Firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# =============================================================================
# DONE!
# =============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN}  ✅ Setup complet!${NC}"
echo "=========================================="
echo ""
echo "🌐 Aplicația este disponibilă la:"
echo "   http://159.89.29.249"
echo ""
echo "👤 Credențiale admin:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 IMPORTANT:"
echo "   1. Schimbă parola admin-ului!"
echo "   2. Editează .env și schimbă SECRET_KEY"
echo "   3. Pentru HTTPS, rulează:"
echo "      certbot --nginx -d yourdomain.com"
echo ""

