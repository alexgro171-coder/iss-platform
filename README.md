# ISS Platform - International Staff Sourcing

Platformă pentru gestionarea lucrătorilor și clienților.

## 🖥️ Stack Tehnologic

- **Backend**: Django 4.2 + Django REST Framework + JWT Auth
- **Frontend**: React 18 + Vite
- **Database**: PostgreSQL 15
- **Container**: Docker & Docker Compose

---

## 🚀 Setup Rapid pentru Dezvoltare

### Cerințe

1. **Docker Desktop** - https://www.docker.com/products/docker-desktop/
2. **Node.js 18+** - https://nodejs.org/

### Pași de Instalare

```bash
# 1. Clonează repository-ul (dacă nu l-ai făcut deja)
git clone <repo-url>
cd iss-platform

# 2. Creează fișierul .env (dacă nu există)
cp .env.example .env
# SAU creează manual cu conținutul de mai jos

# 3. Pornește serviciile Docker (PostgreSQL + Backend)
docker compose up -d

# 4. Instalează dependențele frontend și pornește
cd frontend
npm install
npm run dev
```

### Conținut `.env`

```env
DB_NAME=iss_db
DB_USER=iss_admin
DB_PASSWORD=iss_password
DB_HOST=db
DB_PORT=5432
DEBUG=True
```

---

## 📍 URL-uri de Dezvoltare

| Serviciu | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |
| pgAdmin | http://localhost:5050 |

### Credențiale pgAdmin
- Email: `groseanu@gmail.com`
- Password: `admin123`

---

## 🔧 Comenzi Utile

### Docker

```bash
# Pornește toate serviciile în background
docker compose up -d

# Vezi log-uri
docker compose logs -f

# Oprește serviciile
docker compose down

# Reconstruiește imaginile (după modificări în Dockerfile/requirements)
docker compose build

# Execută comenzi Django
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell
```

### Frontend

```bash
cd frontend
npm run dev      # Server de dezvoltare
npm run build    # Build producție
npm run preview  # Previzualizare build
```

---

## 👥 Roluri și Permisiuni

| Rol | Dashboard | Lucrători | Clienți |
|-----|-----------|-----------|---------|
| Agent | ✅ | ✅ (doar proprii) | ❌ |
| Expert | ✅ | ✅ (toți) | ❌ |
| Management | ✅ | ✅ (toți) | ✅ |
| Admin | ✅ | ✅ (toți) | ✅ |

---

## 📁 Structura Proiectului

```
iss-platform/
├── backend/
│   ├── core/           # Django project settings
│   ├── iss/            # App principal (models, views, etc.)
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ # Layout, PrivateRoute
│   │   ├── context/    # AuthContext
│   │   ├── pages/      # Login, Dashboard, Workers, Clients
│   │   └── services/   # API calls
│   ├── package.json
│   └── vite.config.js
├── deploy/             # Scripturi de deployment
├── docker-compose.yml
└── .env               # Variabile de mediu (nu în git!)
```

---

## 🧪 Testare

Utilizator de test (după crearea bazei de date):
- Username: `demo_agent`
- Password: `demo123`

Pentru a crea un superuser:
```bash
docker compose exec backend python manage.py createsuperuser
```



