# Campus Connect Learning Platform

A full-stack web application for Campus Connect students and faculty to share study materials, collaborate via real-time chat, and form study groups.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, React Router v6, Socket.IO client |
| Backend    | Node.js, Express.js                             |
| Database   | POSTRESQL 17 (via NEON DB)                           |
| Real-time  | Socket.IO (WebSockets)                          |
| File Storage | Cloudinary                                    |
| Auth       | JWT (jsonwebtoken) + bcryptjs                   |
| Styling    | Pure CSS (custom design system, no UI library)  |

---

## Project Structure

```
adamas/
├── backend/
│   ├── config/
│   │   ├── db.js              # MySQL pool + auto-init tables
│   │   └── cloudinary.js      # Cloudinary + Multer config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── fileController.js
│   │   ├── groupController.js
│   │   ├── adminController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   └── auth.js            # JWT protect, adminOnly, facultyOrAdmin
│   ├── routes/
│   │   ├── auth.js
│   │   ├── files.js
│   │   ├── groups.js
│   │   ├── admin.js
│   │   └── messages.js
│   ├── server.js              # Express + Socket.IO entry point
│   ├── seed.js                # Demo data seeder
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── favicon.svg
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx    # Global auth state
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── FilesPage.jsx
    │   │   ├── ChatPage.jsx
    │   │   ├── GroupsPage.jsx
    │   │   ├── AdminPage.jsx
    │   │   └── ProfilePage.jsx
    │   ├── components/
    │   │   └── Layout.jsx         # Sidebar + header shell
    │   ├── utils/
    │   │   ├── api.js             # Axios instance with JWT interceptor
    │   │   └── socket.js          # Socket.IO connect/disconnect helpers
    │   ├── App.jsx                # Routes + protected route wrapper
    │   ├── main.jsx
    │   └── index.css              # Full design system (CSS variables)
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Cloudinary account (free tier works)

---

### 1. MySQL Database

```sql
CREATE DATABASE adamas_university CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Tables are **auto-created** when the backend starts. No manual migration needed.

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=adamas_university

JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLIENT_URL=http://localhost:5173
```

**Seed demo data (optional):**
```bash
node seed.js
```

**Start the server:**
```bash
npm run dev        # development (nodemon)
npm start          # production
```

Backend runs at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

The Vite dev server proxies `/api` and `/socket.io` to `localhost:5000` automatically.

---

## Demo Credentials

| Role    | Email                    | Password    |
|---------|--------------------------|-------------|
| Admin   | admin@adamas.ac.in       | admin123    |
| Student | rahul@adamas.ac.in       | student123  |
| Student | priya@adamas.ac.in       | student123  |

---

## Features

### Students & Faculty
- **Register/Login** — JWT-based auth with role selection
- **Dashboard** — Announcements, recent files, quick links, admin stats
- **Files & Notes** — Upload PDFs/docs to Cloudinary, filter by dept/year/type, download
- **Campus Chat** — Real-time global chat with Socket.IO, typing indicators, online users
- **Study Groups** — Create public/private groups, join/leave, per-group chat rooms
- **Profile** — Edit name, department, year

### Admin Panel
- **Overview** — Platform-wide stats (users, files, messages, downloads)
- **File Approvals** — Approve or reject student-uploaded files before they go live
- **User Management** — Search users, change roles, suspend/activate, delete, create new users
- **Announcements** — Post campus-wide announcements with low/medium/high priority

### Real-time (Socket.IO)
- Global campus chat room (`#campus-global`)
- Per-group chat rooms (auto-joined on connect)
- Live online user presence list
- Typing indicators per room
- Messages persisted to MySQL

---

## API Reference

| Method | Endpoint                     | Auth       | Description                  |
|--------|------------------------------|------------|------------------------------|
| POST   | /api/auth/register           | Public     | Register new user            |
| POST   | /api/auth/login              | Public     | Login, returns JWT           |
| GET    | /api/auth/me                 | Protected  | Get current user             |
| PUT    | /api/auth/profile            | Protected  | Update profile               |
| GET    | /api/files                   | Protected  | List approved files          |
| POST   | /api/files/upload            | Protected  | Upload file to Cloudinary    |
| GET    | /api/files/pending           | Admin      | List pending files           |
| PUT    | /api/files/:id/approve       | Admin      | Approve a file               |
| DELETE | /api/files/:id               | Owner/Admin| Delete a file                |
| POST   | /api/files/:id/download      | Protected  | Increment download, get URL  |
| GET    | /api/groups                  | Protected  | List all accessible groups   |
| POST   | /api/groups                  | Protected  | Create study group           |
| POST   | /api/groups/:id/join         | Protected  | Join a group                 |
| DELETE | /api/groups/:id/leave        | Protected  | Leave a group                |
| GET    | /api/groups/:id/members      | Protected  | Get group members            |
| GET    | /api/messages/global         | Protected  | Global chat history          |
| GET    | /api/messages/group/:groupId | Protected  | Group chat history           |
| GET    | /api/admin/stats             | Admin      | Platform statistics          |
| GET    | /api/admin/users             | Admin      | All users                    |
| POST   | /api/admin/users             | Admin      | Create user                  |
| PUT    | /api/admin/users/:id         | Admin      | Update user role/status      |
| DELETE | /api/admin/users/:id         | Admin      | Delete user                  |
| POST   | /api/admin/announcements     | Admin      | Post announcement            |
| DELETE | /api/admin/announcements/:id | Admin      | Delete announcement          |

---

## Production Deployment Notes

1. Set `NODE_ENV=production` in backend `.env`
2. Build frontend: `cd frontend && npm run build` — serves `/dist` as static files
3. Optionally serve frontend from Express in production:
   ```js
   app.use(express.static(path.join(__dirname, '../frontend/dist')))
   app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')))
   ```
4. Use PM2 or a similar process manager for the backend
5. Set up HTTPS (required for secure WebSocket `wss://`)
6. Update `CLIENT_URL` in `.env` to your production domain

---

## Design System

The entire UI uses a custom CSS design system with CSS variables defined in `index.css`:
- **Colors**: Navy (`#0B1F3A`), Gold (`#C9A84C`), Cream (`#F8F6F1`)
- **Typography**: Playfair Display (headings) + DM Sans (body) + DM Mono (code)
- **Components**: Cards, badges, tables, modals, upload zones, chat bubbles — all custom

---

*Built for Campus Connect Mini Project — Full Stack Web Development*
