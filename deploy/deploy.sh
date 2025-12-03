#!/bin/bash
# =============================================================================
# Script de deployment rapid (după push pe GitHub)
# Rulează pe server pentru a actualiza aplicația
# =============================================================================

set -e

echo "🚀 Deployment ISS Platform..."

cd /var/www/iss-platform

# 1. Pull ultimele modificări
echo "📥 Pull din GitHub..."
git pull origin main

# 2. Rebuild și restart backend
echo "🐳 Rebuild Docker containers..."
docker compose up -d --build

# Așteaptă să pornească
sleep 5

# 3. Rulează migrări (dacă există)
echo "🗃️ Rulare migrări..."
docker exec iss_backend python manage.py migrate --noinput

# 4. Rebuild frontend
echo "⚛️ Rebuild Frontend..."
cd /var/www/iss-platform/frontend
npm install
npm run build

# Copiază build-ul
cp -r dist/* /var/www/iss-platform/static/

# 5. Restart Nginx
echo "🔄 Restart Nginx..."
systemctl restart nginx

echo ""
echo "✅ Deployment complet!"
echo "🌐 Aplicația: http://159.89.29.249"

