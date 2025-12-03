# ISS Platform - Frontend

Frontend React pentru platforma International Staff Sourcing.

## 🚀 Instalare și Pornire

### Cerințe
- Node.js 18+ instalat
- Backend-ul Django rulând pe `localhost:8000`

### Pași de instalare

```bash
# 1. Navighează în directorul frontend
cd frontend

# 2. Instalează dependențele
npm install

# 3. Pornește serverul de dezvoltare
npm run dev
```

Aplicația va fi disponibilă la: **http://localhost:3000**

## 📋 Structura Proiectului

```
frontend/
├── public/              # Fișiere statice
├── src/
│   ├── components/      # Componente reutilizabile
│   │   ├── Layout.jsx   # Layout principal cu sidebar
│   │   └── PrivateRoute.jsx
│   ├── context/         # React Context
│   │   └── AuthContext.jsx  # Gestionare autentificare
│   ├── pages/           # Pagini/Rute
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Workers.jsx
│   │   ├── WorkerForm.jsx
│   │   └── Clients.jsx
│   ├── services/        # Servicii API
│   │   └── api.js       # Axios + JWT handling
│   ├── App.jsx          # Rutare principală
│   ├── main.jsx         # Entry point
│   └── index.css        # Stiluri globale
├── index.html
├── package.json
└── vite.config.js
```

## 🔐 Autentificare

Aplicația folosește JWT (JSON Web Tokens):

1. **Login**: `/api/token/` - obține access + refresh token
2. **Refresh**: `/api/token/refresh/` - reînnoiește token-ul
3. **API calls**: Token-ul este adăugat automat în header

## 👥 Roluri și Permisiuni

| Rol | Dashboard | Lucrători | Clienți |
|-----|-----------|-----------|---------|
| Agent | ✅ | ✅ (doar proprii) | ❌ |
| Expert | ✅ | ✅ (toți) | ❌ |
| Management | ✅ | ✅ (toți) | ✅ |
| Admin | ✅ | ✅ (toți) | ✅ |

## 🧪 Utilizator de Test

După pornirea backend-ului, poți folosi:

- **Username**: `demo_agent`
- **Password**: `demo123`

## 📦 Comenzi Disponibile

```bash
npm run dev      # Pornește serverul de dezvoltare
npm run build    # Creează build-ul pentru producție
npm run preview  # Previzualizează build-ul de producție
```

## 🎨 Design

- **Font principal**: DM Sans
- **Font mono**: JetBrains Mono
- **Temă**: Dark professional
- **Culori accent**: Blue (#3b82f6), Purple (#8b5cf6)

