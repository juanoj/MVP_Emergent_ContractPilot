"""ContractPilot backend - subscription & contract intelligence dashboard."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import re
import json
import uuid
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pypdf import PdfReader

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

app = FastAPI(title="ContractPilot API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("contractpilot")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


# ----------------------------- Models -----------------------------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Subscription(BaseModel):
    id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    user_id: str
    service_name: str
    provider: str
    category: str  # SaaS, AI, Internet, Communications, License
    price: float
    currency: str = "USD"
    billing_cycle: str = "monthly"  # monthly, yearly, quarterly
    renewal_date: Optional[str] = None  # ISO date
    start_date: Optional[str] = None
    auto_renew: bool = True
    notes: Optional[str] = None
    source: str = "manual"  # manual, contract, gmail, csv
    contract_id: Optional[str] = None
    market_price: Optional[float] = None
    market_price_updated_at: Optional[str] = None
    market_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubscriptionCreate(BaseModel):
    service_name: str
    provider: str
    category: str
    price: float
    currency: str = "USD"
    billing_cycle: str = "monthly"
    renewal_date: Optional[str] = None
    start_date: Optional[str] = None
    auto_renew: bool = True
    notes: Optional[str] = None


class Contract(BaseModel):
    id: str = Field(default_factory=lambda: f"cnt_{uuid.uuid4().hex[:12]}")
    user_id: str
    filename: str
    raw_text_preview: str
    extracted: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ----------------------------- Auth helpers -----------------------------
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    exp = session["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# ----------------------------- Auth routes -----------------------------
@api.post("/auth/session")
async def create_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": session_id},
        timeout=10,
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "session_token": token}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user.model_dump()


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ----------------------------- Subscriptions -----------------------------
@api.get("/subscriptions")
async def list_subs(user: User = Depends(get_current_user)):
    docs = await db.subscriptions.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    return docs


@api.post("/subscriptions")
async def create_sub(payload: SubscriptionCreate, user: User = Depends(get_current_user)):
    sub = Subscription(user_id=user.user_id, **payload.model_dump())
    doc = sub.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.subscriptions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/subscriptions/{sub_id}")
async def update_sub(sub_id: str, payload: dict, user: User = Depends(get_current_user)):
    payload.pop("user_id", None)
    payload.pop("id", None)
    result = await db.subscriptions.update_one(
        {"id": sub_id, "user_id": user.user_id}, {"$set": payload}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return doc


@api.delete("/subscriptions/{sub_id}")
async def delete_sub(sub_id: str, user: User = Depends(get_current_user)):
    result = await db.subscriptions.delete_one({"id": sub_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ----------------------------- Contracts (PDF + Claude) -----------------------------
def _extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for p in reader.pages[:20]:
            try:
                pages.append(p.extract_text() or "")
            except Exception:
                pages.append("")
        return "\n\n".join(pages).strip()
    except Exception as e:
        logger.exception("pdf parse failed")
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {e}")


def _strip_json_block(text: str) -> Optional[dict]:
    if not text:
        return None
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


async def _claude_extract_contract(text: str) -> dict:
    system = (
        "You are a contract analysis expert for a B2B subscription management tool. "
        "Given a contract or invoice text, extract subscription/service data. "
        "Respond ONLY with a valid JSON object with these keys: "
        "service_name (string), provider (string), category (one of: SaaS, AI, Internet, Communications, License, Other), "
        "price (number, monthly-equivalent in the original currency if possible), currency (ISO code e.g. USD, EUR), "
        "billing_cycle (monthly|yearly|quarterly), start_date (YYYY-MM-DD or null), renewal_date (YYYY-MM-DD or null), "
        "auto_renew (boolean), key_terms (array of short strings for renewal/termination clauses), "
        "notice_period_days (number or null), summary (2-3 sentence summary)."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"extract-{uuid.uuid4().hex[:8]}",
        system_message=system,
    ).with_model("anthropic", CLAUDE_MODEL)

    prompt = f"Contract text:\n\n{text[:15000]}\n\nReturn only JSON, no prose."
    resp = await chat.send_message(UserMessage(text=prompt))
    parsed = _strip_json_block(resp) or {}
    return parsed


async def _claude_market_price(service_name: str, provider: str, category: str) -> dict:
    system = (
        "You are a market research analyst for enterprise software pricing. "
        "Given a service, return the CURRENT typical business/pro tier list price. "
        "Respond ONLY as JSON with keys: market_price (number, monthly USD equivalent), "
        "confidence (low|medium|high), notes (one-line justification with common pricing tiers)."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"market-{uuid.uuid4().hex[:8]}",
        system_message=system,
    ).with_model("anthropic", CLAUDE_MODEL)
    prompt = (
        f"Service: {service_name}\nProvider: {provider}\nCategory: {category}\n"
        "Return the typical business/team plan monthly price per seat (or per account for internet/comms) in USD. "
        "Return ONLY the JSON."
    )
    resp = await chat.send_message(UserMessage(text=prompt))
    return _strip_json_block(resp) or {}


@api.post("/contracts/upload")
async def upload_contract(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF supported")
    content = await file.read()
    text = _extract_pdf_text(content)
    if not text:
        raise HTTPException(status_code=400, detail="Empty PDF text (scanned image?)")

    extracted = await _claude_extract_contract(text)

    contract_id = f"cnt_{uuid.uuid4().hex[:12]}"
    await db.contracts.insert_one({
        "id": contract_id,
        "user_id": user.user_id,
        "filename": file.filename,
        "raw_text_preview": text[:2000],
        "extracted": extracted,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Create linked subscription if extraction has enough info
    sub_doc = None
    if extracted.get("service_name") and extracted.get("price") is not None:
        try:
            price = float(extracted.get("price") or 0)
        except Exception:
            price = 0
        sub = Subscription(
            user_id=user.user_id,
            service_name=str(extracted.get("service_name", "Unknown")),
            provider=str(extracted.get("provider", extracted.get("service_name", "Unknown"))),
            category=str(extracted.get("category", "Other")),
            price=price,
            currency=str(extracted.get("currency", "USD")),
            billing_cycle=str(extracted.get("billing_cycle", "monthly")),
            renewal_date=extracted.get("renewal_date"),
            start_date=extracted.get("start_date"),
            auto_renew=bool(extracted.get("auto_renew", True)),
            notes=extracted.get("summary"),
            source="contract",
            contract_id=contract_id,
        )
        doc = sub.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.subscriptions.insert_one(doc)
        doc.pop("_id", None)
        sub_doc = doc

    return {"contract_id": contract_id, "extracted": extracted, "subscription": sub_doc}


@api.get("/contracts")
async def list_contracts(user: User = Depends(get_current_user)):
    docs = await db.contracts.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    return docs


@api.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, user: User = Depends(get_current_user)):
    doc = await db.contracts.find_one({"id": contract_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


# ----------------------------- Market price refresh -----------------------------
@api.post("/subscriptions/{sub_id}/refresh-market")
async def refresh_market(sub_id: str, user: User = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"id": sub_id, "user_id": user.user_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    market = await _claude_market_price(sub["service_name"], sub.get("provider", ""), sub.get("category", "SaaS"))
    price = market.get("market_price")
    try:
        price = float(price) if price is not None else None
    except Exception:
        price = None
    await db.subscriptions.update_one(
        {"id": sub_id},
        {"$set": {
            "market_price": price,
            "market_notes": market.get("notes"),
            "market_price_updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    doc = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return doc


# ----------------------------- CSV import (accounting) -----------------------------
@api.post("/imports/accounting-csv")
async def import_csv(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    import csv
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    created = 0
    for row in reader:
        name = row.get("service_name") or row.get("service") or row.get("vendor") or row.get("description")
        price_raw = row.get("price") or row.get("amount") or row.get("cost") or "0"
        try:
            price = float(str(price_raw).replace("$", "").replace(",", "").strip())
        except Exception:
            price = 0
        if not name:
            continue
        sub = Subscription(
            user_id=user.user_id,
            service_name=name,
            provider=row.get("provider") or name,
            category=row.get("category") or "SaaS",
            price=price,
            currency=row.get("currency") or "USD",
            billing_cycle=row.get("billing_cycle") or "monthly",
            renewal_date=row.get("renewal_date"),
            start_date=row.get("start_date"),
            source="csv",
        )
        doc = sub.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.subscriptions.insert_one(doc)
        doc.pop("_id", None)
        created += 1
    return {"created": created}


# ----------------------------- Dashboard stats -----------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: User = Depends(get_current_user)):
    subs = await db.subscriptions.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    monthly_spend = 0.0
    for s in subs:
        p = float(s.get("price") or 0)
        cycle = (s.get("billing_cycle") or "monthly").lower()
        if cycle == "yearly":
            p = p / 12.0
        elif cycle == "quarterly":
            p = p / 3.0
        monthly_spend += p

    # Upcoming renewals in next 60 days
    now = datetime.now(timezone.utc).date()
    upcoming = []
    for s in subs:
        rd = s.get("renewal_date")
        if not rd:
            continue
        try:
            d = datetime.fromisoformat(rd).date()
            days = (d - now).days
            if 0 <= days <= 60:
                upcoming.append({"id": s["id"], "service_name": s["service_name"], "renewal_date": rd, "days": days, "price": s.get("price")})
        except Exception:
            pass
    upcoming.sort(key=lambda x: x["days"])

    # Potential savings (market_price < current price)
    potential = 0.0
    savings_items = []
    for s in subs:
        mp = s.get("market_price")
        p = float(s.get("price") or 0)
        if mp is None:
            continue
        cycle = (s.get("billing_cycle") or "monthly").lower()
        monthly_p = p / 12.0 if cycle == "yearly" else (p / 3.0 if cycle == "quarterly" else p)
        if mp < monthly_p:
            diff = monthly_p - mp
            potential += diff
            savings_items.append({
                "id": s["id"], "service_name": s["service_name"],
                "current": round(monthly_p, 2), "market": round(mp, 2),
                "monthly_saving": round(diff, 2),
            })
    savings_items.sort(key=lambda x: -x["monthly_saving"])

    by_category: Dict[str, float] = {}
    for s in subs:
        p = float(s.get("price") or 0)
        cycle = (s.get("billing_cycle") or "monthly").lower()
        monthly_p = p / 12.0 if cycle == "yearly" else (p / 3.0 if cycle == "quarterly" else p)
        cat = s.get("category") or "Other"
        by_category[cat] = by_category.get(cat, 0) + monthly_p

    return {
        "total_subs": len(subs),
        "monthly_spend": round(monthly_spend, 2),
        "annual_spend": round(monthly_spend * 12, 2),
        "upcoming_renewals": upcoming,
        "potential_monthly_savings": round(potential, 2),
        "savings_items": savings_items,
        "by_category": [{"category": k, "amount": round(v, 2)} for k, v in by_category.items()],
    }


@api.get("/")
async def root():
    return {"service": "ContractPilot", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
