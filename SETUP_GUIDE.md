# Daily Tracker — Local Setup Guide (Zero MongoDB Knowledge Friendly!)

This guide walks you through running Daily Tracker on your **own laptop** in **VS Code**, step by step. Take it slow — each step is explained.

---

## 1. What you need installed (one-time setup)

Install these in this order:

1. **Node.js (v18 or newer)** → https://nodejs.org/  
2. **Yarn** → After Node, open a terminal and run: `npm install -g yarn`
3. **Python 3.10+** → https://www.python.org/downloads/  (tick "Add to PATH" on Windows)
4. **MongoDB Community Edition** (Option A — runs on your laptop):  
   https://www.mongodb.com/try/download/community  
   **OR**  
   **MongoDB Atlas** (Option B — cloud free tier, what you already have set up): https://cloud.mongodb.com
5. **MongoDB Compass** (the visual UI you saw in the screenshot) → https://www.mongodb.com/products/compass
6. **VS Code** → https://code.visualstudio.com/

---

## 2. Download the project to your laptop

In Emergent: click the GitHub / Download button to get all the files. Extract the zip somewhere like `C:\Projects\daily-tracker` or `~/Projects/daily-tracker`. Open that folder in VS Code:
```
File → Open Folder → daily-tracker
```

You should see the structure:
```
daily-tracker/
├── backend/         ← FastAPI (Python)
├── frontend/        ← React
├── SETUP_GUIDE.md   ← this file
└── ...
```

---

## 3. Set up MongoDB

### Option A — Local MongoDB (recommended for development)

After installing MongoDB Community on Windows, the service usually starts automatically and listens on `localhost:27017`. Open **MongoDB Compass** and click **Connect** with the default URI:
```
mongodb://localhost:27017
```
You don't need to create a database manually — our backend creates it automatically the first time it runs.

### Option B — MongoDB Atlas (cloud — what you already have)

1. Go to your Atlas project → click **Connect** on your `DailyTracker` cluster.
2. Choose **Drivers** → Python → copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@dailytracker.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. **Important**: In Atlas → **Network Access**, add your current IP (or `0.0.0.0/0` for testing only).
4. **Database Access** → make sure your user has a password set.

---

## 4. Configure the backend

Open `backend/.env` in VS Code. You'll see:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="daily_tracker"
CORS_ORIGINS="*"
JWT_SECRET="..."
ADMIN_EMAIL="admin@dailytracker.com"
ADMIN_PASSWORD="admin123"
```

- **If you use local MongoDB**: leave `MONGO_URL` as-is.
- **If you use Atlas**: replace `MONGO_URL` with the connection string from step 3 (Option B). Don't forget to URL-encode special characters in your password.
- Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` if you want a different default admin login.
- Keep `DB_NAME="daily_tracker"` — the database will be created automatically.

---

## 5. Run the backend (FastAPI)

Open a terminal in VS Code (`Ctrl+~`), then:

```bash
cd backend
python -m venv venv

# Activate the virtual environment:
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

When you see:
```
INFO:     Uvicorn running on http://127.0.0.1:8001
INFO:     Seeded admin user: admin@dailytracker.com
INFO:     Seeded sample staff
INFO:     Seeded sample holidays
```
✅ Backend is running.  
Open http://localhost:8001/api/health in your browser — you should see `{"status":"ok","db":"daily_tracker"}`.

---

## 6. Run the frontend (React)

**Open a new terminal** (keep the backend one running) and:

```bash
cd frontend
```

Edit `frontend/.env` and **set the backend URL to your local backend**:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

Then install + run:
```bash
yarn install
yarn start
```

This opens http://localhost:3000 automatically. 🎉

> **Port 3000 already in use?** Either run with a different port one-time:  
> `PORT=3001 yarn start` (Mac/Linux/Git Bash) or `$env:PORT=3001; yarn start` (PowerShell)  
>  
> **Or — recommended:** create a new file `frontend/.env.local` with just:  
> ```  
> PORT=3001  
> ```  
> Now `yarn start` always uses port 3001. `.env.local` is gitignored and won't affect the cloud preview.

---

## 7. Login

- **Default admin:** `admin@dailytracker.com` / `admin123` (no Staff ID needed for admin)
- **For staff/agents:** Admin must first add the Staff ID in the Staffs module. Then click **Create account** on the welcome page, enter the Staff ID to verify, and complete signup.
- Try staff demo: log in as admin → Staffs already has `A001`-`A004` seeded. Log out, then click **Create account** and use Staff ID `A002` (or `A003`/`A004`) to sign up as that staff member.

---

## 8. Verify the database in MongoDB Compass

1. Connect Compass to `mongodb://localhost:27017` (or your Atlas URL).
2. You should now see a database called **`daily_tracker`** with these collections:
   - `users` — registered users + admin
   - `staff` — staff/agent records
   - `holidays` — holiday records
   - `attendance` — attendance records per agent per day
3. Click any collection → you'll see the documents (rows) inside.

---

## 9. Project structure (where to edit what)

```
backend/
├── server.py              ← All API routes, auth, models, MongoDB queries
├── .env                   ← Environment variables (DO NOT commit to GitHub!)
└── requirements.txt       ← Python dependencies

frontend/
├── src/
│   ├── App.js             ← Routes (which page shows at which URL)
│   ├── index.css          ← Global theme colors, fonts
│   ├── tailwind.config.js ← Tailwind theme extensions
│   ├── lib/api.js         ← Axios setup (sends JWT token with every request)
│   ├── contexts/AuthContext.jsx ← Login state, user info
│   ├── components/
│   │   ├── DashboardLayout.jsx ← Sidebar + header layout
│   │   ├── DashboardLayout.css
│   │   └── ProtectedRoute.jsx
│   └── pages/
│       ├── Welcome.jsx + .css  ← Landing page
│       ├── Login.jsx
│       ├── Signup.jsx
│       ├── Auth.css            ← Shared login/signup styles
│       ├── Calendar.jsx + .css ← Calendar with attendance marking
│       ├── Staffs.jsx + .css   ← Staff management
│       └── Holidays.jsx + .css ← Holiday management
└── package.json
```

Each module has its **own `.jsx` + `.css`** file so you can edit one feature without touching others.

---

## 10. Common Mongo / DB tasks

### See all users in Compass
1. Click `daily_tracker` → `users` collection.
2. You'll see admin + any registered users. Passwords are bcrypt-hashed (safe).

### Reset everything
Right-click the `daily_tracker` database in Compass → **Drop Database**. Restart the backend — it'll re-seed admin + sample data.

### Add data manually
In Compass: collection → **Add Data** → Insert Document. JSON format like:
```json
{
  "agent_id": "A099",
  "display_name": "Test",
  "fullname": "Test Person",
  "position": "Agent",
  "shift": "Day",
  "contact_number": "+60100000000",
  "status": "active",
  "id": "your-uuid-here",
  "created_at": "2026-02-01T00:00:00+00:00"
}
```

---

## 11. API endpoints reference

All endpoints are prefixed with `/api`:

| Method | Path                              | Auth      | Description                |
|--------|-----------------------------------|-----------|----------------------------|
| POST   | `/api/auth/check-staff-id`        | public    | Verify a Staff ID is valid (step 1 of signup) |
| POST   | `/api/auth/register`              | public    | Complete account creation using verified Staff ID |
| POST   | `/api/auth/login`                 | public    | Login → returns JWT token  |
| GET    | `/api/auth/me`                    | logged in | Get current user           |
| POST   | `/api/auth/logout`                | logged in | Logout                     |
| GET    | `/api/staff?status=active`  | logged in | List staff (filter)        |
| POST   | `/api/staff`                | admin     | Create staff               |
| PUT    | `/api/staff/{id}`           | admin     | Update staff               |
| DELETE | `/api/staff/{id}`           | admin     | Delete staff               |
| GET    | `/api/holidays?year=2026`   | logged in | List holidays              |
| POST   | `/api/holidays`             | admin     | Create holiday             |
| PUT    | `/api/holidays/{id}`        | admin     | Update holiday             |
| DELETE | `/api/holidays/{id}`        | admin     | Delete holiday             |
| GET    | `/api/attendance?month=2026-02&agent_id=A001` | logged in | List attendance |
| POST   | `/api/attendance`           | logged in | Mark/update attendance     |

Test in browser: http://localhost:8001/docs (FastAPI auto-generates Swagger docs)

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| `ModuleNotFoundError` when running backend | Make sure venv is activated, then `pip install -r requirements.txt` |
| `Connection refused` to Mongo | Make sure MongoDB service is running (Windows: Services → "MongoDB Server" → Start) |
| Atlas: `IP not allowed` | Atlas → Network Access → Add Current IP |
| Frontend can't reach backend | Check `REACT_APP_BACKEND_URL` in `frontend/.env` matches backend port (8001) |
| CORS errors | Backend already allows all origins for dev. For prod, set `CORS_ORIGINS` to your frontend URL |
| Token expired / "Not authenticated" | Logout + login again. Tokens expire in 7 days |
| Forgot admin password | Edit `ADMIN_PASSWORD` in `backend/.env` → restart backend → it auto-updates the hash |

---

## 13. Next steps for your FYP

This prototype covers **Phase 1**: Auth + Calendar + Staffs + Holidays.  
Modules to add next (already wired into sidebar):

- **Leaves** — apply/approve leave requests
- **Reports** — HR-ready exports + dashboard analytics
- **History / Audit Log** — immutable action trail
- **AI Module** — anomaly detection (scikit-learn Isolation Forest) + LLM summary (Gemini/OpenAI)
- **Multi-Factor Auth** — for admin accounts
- **Notifications** — leave approvals, weekend shift alerts

Good luck with your FYP! 🎓
