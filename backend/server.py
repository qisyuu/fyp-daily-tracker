from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import logging
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator

# ----- Logging -----
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ----- MongoDB -----
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ----- JWT helpers -----
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


# ----- Pydantic Models -----
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: Literal["admin", "user", "guest"]
    agent_id: Optional[str] = None
    created_at: str

class CheckStaffIdRequest(BaseModel):
    agent_id: str = Field(min_length=1, max_length=40)

class CheckStaffIdResponse(BaseModel):
    valid: bool
    agent_id: str
    display_name: Optional[str] = None
    fullname: Optional[str] = None
    position: Optional[str] = None
    reason: Optional[str] = None  # populated when valid=False

class RegisterRequest(BaseModel):
    agent_id: str = Field(min_length=1, max_length=40)
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?~`]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    user: UserPublic
    token: str

# Staff
class StaffBase(BaseModel):
    agent_id: str = Field(min_length=1, max_length=40)
    display_name: str = Field(min_length=1, max_length=80)
    fullname: str = Field(min_length=1, max_length=120)
    position: str = Field(default="Agent", max_length=80)
    shift: str = Field(default="Day", max_length=40)
    contact_number: str = Field(default="", max_length=40)
    status: Literal["active", "resigned"] = "active"

class StaffCreate(StaffBase):
    pass

class StaffUpdate(BaseModel):
    agent_id: Optional[str] = None
    display_name: Optional[str] = None
    fullname: Optional[str] = None
    position: Optional[str] = None
    shift: Optional[str] = None
    contact_number: Optional[str] = None
    status: Optional[Literal["active", "resigned"]] = None

class Staff(StaffBase):
    id: str
    created_at: str

# Holiday
class HolidayBase(BaseModel):
    date: str  # ISO date YYYY-MM-DD
    region: str = Field(default="National", max_length=80)
    occasion: str = Field(min_length=1, max_length=120)
    details: str = Field(default="", max_length=500)

class HolidayCreate(HolidayBase):
    pass

class HolidayUpdate(BaseModel):
    date: Optional[str] = None
    region: Optional[str] = None
    occasion: Optional[str] = None
    details: Optional[str] = None

class Holiday(HolidayBase):
    id: str
    created_at: str

# Attendance
class AttendanceEntry(BaseModel):
    agent_id: str
    date: str  # YYYY-MM-DD
    status: Literal["present", "absent", "leave", "standby", "off"] = "present"
    shift: Optional[str] = None
    note: Optional[str] = None

class AttendanceRecord(AttendanceEntry):
    id: str
    created_at: str


# ----- App + Router -----
app = FastAPI(title="Daily Tracker API")
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
staff_router = APIRouter(prefix="/api/staff", tags=["staff"])
holiday_router = APIRouter(prefix="/api/holidays", tags=["holidays"])
attendance_router = APIRouter(prefix="/api/attendance", tags=["attendance"])
dashboard_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
reports_router = APIRouter(prefix="/api/reports", tags=["reports"])


# ----- Auth Dependencies -----
async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ----- Health -----
@api_router.get("/")
async def root():
    return {"message": "Daily Tracker API is running"}

@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "db": os.environ['DB_NAME']}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB unavailable: {e}")


# ----- Auth Endpoints -----
@auth_router.post("/check-staff-id", response_model=CheckStaffIdResponse)
async def check_staff_id(payload: CheckStaffIdRequest):
    """Step 1 of signup: verify a Staff ID is valid (exists, active, not yet linked)."""
    agent_id = payload.agent_id.strip()
    staff = await db.staff.find_one({"agent_id": agent_id})
    if not staff:
        return CheckStaffIdResponse(valid=False, agent_id=agent_id, reason="Staff ID not found. Please contact your admin.")
    if staff.get("status") != "active":
        return CheckStaffIdResponse(valid=False, agent_id=agent_id, reason="This Staff ID is not active.")
    existing_user = await db.users.find_one({"agent_id": agent_id})
    if existing_user:
        return CheckStaffIdResponse(valid=False, agent_id=agent_id, reason="An account already exists for this Staff ID.")
    return CheckStaffIdResponse(
        valid=True, agent_id=agent_id,
        display_name=staff.get("display_name"),
        fullname=staff.get("fullname"),
        position=staff.get("position"),
    )


@auth_router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest):
    """Step 2 of signup: complete registration using a verified Staff ID."""
    agent_id = payload.agent_id.strip()
    email = payload.email.lower().strip()

    # Re-validate the staff ID server-side (don't trust client)
    staff = await db.staff.find_one({"agent_id": agent_id})
    if not staff:
        raise HTTPException(status_code=400, detail="Staff ID not found. Please contact your admin.")
    if staff.get("status") != "active":
        raise HTTPException(status_code=400, detail="This Staff ID is not active.")
    if await db.users.find_one({"agent_id": agent_id}):
        raise HTTPException(status_code=400, detail="An account already exists for this Staff ID.")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": staff.get("fullname") or staff.get("display_name") or agent_id,
        "role": "user",
        "agent_id": agent_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["id"], user_doc["email"], user_doc["role"])
    user_public = UserPublic(
        id=user_doc["id"], email=user_doc["email"], name=user_doc["name"],
        role=user_doc["role"], agent_id=agent_id, created_at=user_doc["created_at"]
    )
    return AuthResponse(user=user_public, token=token)


@auth_router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    user_public = UserPublic(
        id=user["id"], email=user["email"], name=user["name"],
        role=user["role"], agent_id=user.get("agent_id"),
        created_at=user["created_at"]
    )
    return AuthResponse(user=user_public, token=token)


@auth_router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)


@auth_router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    return {"message": "Logged out"}


# ----- Staff Endpoints -----
def staff_from_doc(doc: dict) -> Staff:
    doc.pop("_id", None)
    return Staff(**doc)

@staff_router.get("", response_model=List[Staff])
async def list_staff(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status in ("active", "resigned"):
        query["status"] = status
    docs = await db.staff.find(query).sort("agent_id", 1).to_list(1000)
    return [staff_from_doc(d) for d in docs]


@staff_router.post("", response_model=Staff)
async def create_staff(payload: StaffCreate, admin: dict = Depends(require_admin)):
    existing = await db.staff.find_one({"agent_id": payload.agent_id})
    if existing:
        raise HTTPException(status_code=400, detail="Agent ID already exists")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.staff.insert_one(doc)
    return staff_from_doc(doc)


@staff_router.put("/{staff_id}", response_model=Staff)
async def update_staff(staff_id: str, payload: StaffUpdate, admin: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.staff.find_one_and_update(
        {"id": staff_id}, {"$set": update}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff_from_doc(result)


@staff_router.delete("/{staff_id}")
async def delete_staff(staff_id: str, admin: dict = Depends(require_admin)):
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Deleted"}


# ----- Holiday Endpoints -----
def holiday_from_doc(doc: dict) -> Holiday:
    doc.pop("_id", None)
    return Holiday(**doc)

@holiday_router.get("", response_model=List[Holiday])
async def list_holidays(year: Optional[int] = None, user: dict = Depends(get_current_user)):
    query = {}
    if year:
        query["date"] = {"$regex": f"^{year}-"}
    docs = await db.holidays.find(query).sort("date", 1).to_list(2000)
    return [holiday_from_doc(d) for d in docs]


@holiday_router.post("", response_model=Holiday)
async def create_holiday(payload: HolidayCreate, admin: dict = Depends(require_admin)):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.holidays.insert_one(doc)
    return holiday_from_doc(doc)


@holiday_router.put("/{holiday_id}", response_model=Holiday)
async def update_holiday(holiday_id: str, payload: HolidayUpdate, admin: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.holidays.find_one_and_update(
        {"id": holiday_id}, {"$set": update}, return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return holiday_from_doc(result)


@holiday_router.delete("/{holiday_id}")
async def delete_holiday(holiday_id: str, admin: dict = Depends(require_admin)):
    result = await db.holidays.delete_one({"id": holiday_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Holiday not found")
    return {"message": "Deleted"}


# ----- Attendance Endpoints -----
def attendance_from_doc(doc: dict) -> AttendanceRecord:
    doc.pop("_id", None)
    return AttendanceRecord(**doc)

@attendance_router.get("", response_model=List[AttendanceRecord])
async def list_attendance(
    month: Optional[str] = None,  # format YYYY-MM
    agent_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if month:
        query["date"] = {"$regex": f"^{month}-"}
    if agent_id:
        query["agent_id"] = agent_id
    docs = await db.attendance.find(query).sort("date", 1).to_list(5000)
    return [attendance_from_doc(d) for d in docs]


@attendance_router.post("", response_model=AttendanceRecord)
async def upsert_attendance(payload: AttendanceEntry, user: dict = Depends(get_current_user)):
    existing = await db.attendance.find_one({"agent_id": payload.agent_id, "date": payload.date})
    doc = payload.model_dump()
    if existing:
        doc["id"] = existing["id"]
        doc["created_at"] = existing.get("created_at", datetime.now(timezone.utc).isoformat())
        await db.attendance.update_one({"id": existing["id"]}, {"$set": doc})
    else:
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.attendance.insert_one(doc)
    return attendance_from_doc(doc)


@attendance_router.delete("/{record_id}")
async def delete_attendance(record_id: str, admin: dict = Depends(require_admin)):
    result = await db.attendance.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Deleted"}


# ----- Dashboard Endpoints -----
@dashboard_router.get("/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    today_iso = datetime.now(timezone.utc).date().isoformat()
    today = datetime.now(timezone.utc).date()
    next_30 = (today + timedelta(days=30)).isoformat()

    total_staff = await db.staff.count_documents({"status": "active"})
    present_today = await db.attendance.count_documents({"date": today_iso, "status": "present"})
    absent_today = await db.attendance.count_documents({"date": today_iso, "status": "absent"})
    leave_today = await db.attendance.count_documents({"date": today_iso, "status": "leave"})
    upcoming_holidays = await db.holidays.count_documents({
        "date": {"$gte": today_iso, "$lte": next_30}
    })

    # Today's holiday (if any)
    today_holiday_doc = await db.holidays.find_one({"date": today_iso})
    today_holiday = today_holiday_doc.get("occasion") if today_holiday_doc else None

    # Recent attendance entries (last 5)
    recent_cursor = db.attendance.find({}).sort("created_at", -1).limit(5)
    recent = []
    async for r in recent_cursor:
        r.pop("_id", None)
        # enrich with display_name
        st = await db.staff.find_one({"agent_id": r["agent_id"]}, {"display_name": 1, "_id": 0})
        r["display_name"] = (st or {}).get("display_name", r["agent_id"])
        recent.append(r)

    return {
        "total_staff": total_staff,
        "present_today": present_today,
        "absent_today": absent_today,
        "leave_today": leave_today,
        "pending_leaves": 0,  # placeholder until leave module is built
        "upcoming_holidays": upcoming_holidays,
        "today_date": today_iso,
        "today_holiday": today_holiday,
        "recent_attendance": recent,
    }


# ----- Reports Endpoints -----
@reports_router.get("/monthly")
async def monthly_report(year: int, month: int, user: dict = Depends(get_current_user)):
    """Aggregate attendance per active staff for the given year+month."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")
    month_str = f"{year:04d}-{month:02d}"

    # Working days in month
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)
    total_working_days = last_day.day

    # Get holiday dates for the month
    holiday_dates = set()
    async for h in db.holidays.find({"date": {"$regex": f"^{month_str}-"}}):
        holiday_dates.add(h["date"])

    # All active staff
    staff_docs = await db.staff.find({"status": "active"}).sort("agent_id", 1).to_list(1000)

    rows = []
    for s in staff_docs:
        agent_id = s["agent_id"]
        recs = await db.attendance.find({
            "agent_id": agent_id,
            "date": {"$regex": f"^{month_str}-"}
        }).to_list(500)

        normal = 0  # present on weekdays (non-holiday)
        sat = 0     # present on Saturday
        sun = 0     # present on Sunday
        ph_ot = 0   # present on public holiday
        mc = 0      # leave (sick / medical)
        leaves = 0  # total leave count
        absent = 0
        for r in recs:
            d = datetime.strptime(r["date"], "%Y-%m-%d").date()
            weekday = d.weekday()  # Mon=0 .. Sun=6
            is_holiday = r["date"] in holiday_dates
            status = r["status"]
            if status == "present":
                if is_holiday:
                    ph_ot += 1
                elif weekday == 5:
                    sat += 1
                elif weekday == 6:
                    sun += 1
                else:
                    normal += 1
            elif status == "leave":
                mc += 1
                leaves += 1
            elif status == "absent":
                absent += 1

        rows.append({
            "month": month_str,
            "agent_id": agent_id,
            "display_name": s.get("display_name", ""),
            "fullname": s.get("fullname", ""),
            "position": s.get("position", ""),
            "shift": s.get("shift", ""),
            "normal": normal,
            "sat": sat,
            "sun": sun,
            "ph_ot": ph_ot,
            "mc": mc,
            "leaves": leaves,
            "absent": absent,
        })

    return {
        "month": month_str,
        "total_working_days": total_working_days,
        "rows": rows,
    }


# ----- Mount Routers + CORS -----
app.include_router(api_router)
app.include_router(auth_router)
app.include_router(staff_router)
app.include_router(holiday_router)
app.include_router(attendance_router)
app.include_router(dashboard_router)
app.include_router(reports_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----- Startup: indexes, seed admin, seed demo data -----
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("agent_id", unique=True, sparse=True)
    await db.staff.create_index("agent_id", unique=True)
    await db.staff.create_index("id", unique=True)
    await db.holidays.create_index("id", unique=True)
    await db.attendance.create_index([("agent_id", 1), ("date", 1)], unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@dailytracker.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "System Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated from .env")

    # Seed sample staff if collection is empty
    if await db.staff.count_documents({}) == 0:
        samples = [
            {"agent_id": "A001", "display_name": "Aiman", "fullname": "Aiman bin Ahmad", "position": "Team Leader", "shift": "Day", "contact_number": "+60123456789", "status": "active"},
            {"agent_id": "A002", "display_name": "Bella", "fullname": "Bella Tan Mei Ling", "position": "Agent", "shift": "Day", "contact_number": "+60198765432", "status": "active"},
            {"agent_id": "A003", "display_name": "Chong", "fullname": "Chong Wei Liang", "position": "Agent", "shift": "Night", "contact_number": "+60134567890", "status": "active"},
            {"agent_id": "A004", "display_name": "Dina", "fullname": "Dina Putri", "position": "Agent", "shift": "Day", "contact_number": "+60112233445", "status": "active"},
            {"agent_id": "R001", "display_name": "Faiz", "fullname": "Faiz Rahman", "position": "Agent", "shift": "Day", "contact_number": "+60177889900", "status": "resigned"},
        ]
        for s in samples:
            s["id"] = str(uuid.uuid4())
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.staff.insert_many(samples)
        logger.info("Seeded sample staff")

    # Seed sample holidays (Malaysia)
    if await db.holidays.count_documents({}) == 0:
        year = datetime.now(timezone.utc).year
        samples = [
            {"date": f"{year}-01-01", "region": "National", "occasion": "New Year's Day", "details": "Public holiday"},
            {"date": f"{year}-02-01", "region": "Federal Territory", "occasion": "Federal Territory Day", "details": "Federal Territories only"},
            {"date": f"{year}-05-01", "region": "National", "occasion": "Labour Day", "details": "Public holiday"},
            {"date": f"{year}-08-31", "region": "National", "occasion": "Merdeka Day", "details": "Independence Day"},
            {"date": f"{year}-09-16", "region": "National", "occasion": "Malaysia Day", "details": "Public holiday"},
            {"date": f"{year}-12-25", "region": "National", "occasion": "Christmas Day", "details": "Public holiday"},
        ]
        for h in samples:
            h["id"] = str(uuid.uuid4())
            h["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.holidays.insert_many(samples)
        logger.info("Seeded sample holidays")

    # Seed sample attendance for today (for dashboard demo)
    today_iso = datetime.now(timezone.utc).date().isoformat()
    if await db.attendance.count_documents({"date": today_iso}) == 0:
        samples = [
            {"agent_id": "A001", "date": today_iso, "status": "present", "shift": "Day"},
            {"agent_id": "A002", "date": today_iso, "status": "present", "shift": "Day"},
            {"agent_id": "A003", "date": today_iso, "status": "absent", "shift": "Night"},
            {"agent_id": "A004", "date": today_iso, "status": "leave", "shift": "Day"},
        ]
        for s in samples:
            s["id"] = str(uuid.uuid4())
            s["created_at"] = datetime.now(timezone.utc).isoformat()
        try:
            await db.attendance.insert_many(samples)
            logger.info("Seeded sample attendance for today")
        except Exception as e:
            logger.warning(f"Skipped attendance seed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
