from __future__ import annotations

import hashlib
import json
from email.message import EmailMessage
import os
import re
import secrets
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request as UrlRequest, urlopen

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

from .dashboard_api import create_dashboard_router


# Load this folder's .env file. Copy .env.example to .env before running the API.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "collectflow")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "168"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()

CREDITOR_DASHBOARD_PATH = os.getenv("CREDITOR_DASHBOARD_PATH", "/dashboard/creditor")
AGENCY_DASHBOARD_PATH = os.getenv("AGENCY_DASHBOARD_PATH", "/dashboard/agency")
DEBTOR_PORTAL_PATH = os.getenv("DEBTOR_PORTAL_PATH", "/dashboard/debtor")
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME).strip()
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"
SMTP_STARTTLS = os.getenv("SMTP_STARTTLS", "true").lower() == "true"
FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "http://127.0.0.1:5173").rstrip("/")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "").strip() or f"{FRONTEND_APP_URL}/api/auth/google/callback"

if not JWT_SECRET_KEY or JWT_SECRET_KEY == "REPLACE_WITH_A_LONG_RANDOM_SECRET":
    raise RuntimeError(
        "JWT_SECRET_KEY is missing. Copy .env.example to .env and set a random secret."
    )

if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError("COOKIE_SAMESITE must be lax, strict, or none.")
if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    raise RuntimeError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true.")

mongo_client = MongoClient(
    MONGODB_URI,
    tz_aware=True,
    serverSelectionTimeoutMS=5000,
)
db = mongo_client[MONGODB_DATABASE]
password_hasher = PasswordHasher()

app = FastAPI(
    title="CollectFlow Authentication API",
    version="1.0.0",
    description="Authentication and workspace onboarding for CollectFlow.",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-CollectFlow-Admin-Account-Type",
        "X-CollectFlow-Admin-Organization",
        "X-CollectFlow-Admin-Debtor",
    ],
)


# ---------- Request models ----------


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    account_type: Literal["creditor", "agency", "debtor"]
    organization_name: Optional[str] = Field(default=None, max_length=140)
    invitation_code: Optional[str] = Field(default=None, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class DebtorInviteRequest(BaseModel):
    email: EmailStr
    debtor_name: Optional[str] = Field(default=None, max_length=120)


# ---------- Small helpers ----------


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalized_email(value: str) -> str:
    return value.strip().lower()


def make_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "collectflow-workspace"


def hash_invitation_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()


def send_debtor_invitation_email(
    *, recipient: str, debtor_name: str, creditor_name: str, code: str, expires_at: datetime
) -> None:
    if not SMTP_HOST or not SMTP_FROM_EMAIL or (SMTP_USERNAME and not SMTP_PASSWORD):
        raise RuntimeError("Outgoing email is not configured.")

    registration_url = f"{FRONTEND_APP_URL}/?account=debtor"
    message = EmailMessage()
    message["Subject"] = f"{creditor_name} invited you to CollectFlow"
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = recipient
    message.set_content(
        f"Hello {debtor_name},\n\n"
        f"{creditor_name} invited you to access your invoices in CollectFlow.\n\n"
        f"Invitation code: {code}\n"
        f"This code expires on {expires_at.astimezone(timezone.utc).strftime('%d %b %Y at %H:%M UTC')} and can be used once.\n\n"
        f"Create your debtor account using this same email address: {registration_url}\n\n"
        "If you were not expecting this invitation, you can ignore this email."
    )

    if SMTP_USE_SSL:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=15, context=ssl.create_default_context()) as server:
            if SMTP_USERNAME:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(message)
        return

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        server.ehlo()
        if SMTP_STARTTLS:
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
        if SMTP_USERNAME:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(message)


def safe_user(user: dict) -> dict:
    organization = db.organizations.find_one({"_id": user.get("organizationId")}, {"name": 1}) if user.get("organizationId") else None
    return {
        "id": str(user["_id"]),
        "full_name": user.get("fullName"),
        "email": user.get("email"),
        "account_type": user.get("accountType"),
        "role": user.get("role"),
        "organization_id": str(user["organizationId"]) if user.get("organizationId") else None,
        "organization_name": organization.get("name") if organization else None,
        "workspace_id": str(user["workspaceId"]) if user.get("workspaceId") else None,
        "debtor_id": str(user["debtorId"]) if user.get("debtorId") else None,
        "platform_admin": user.get("platformAdmin") is True,
    }


def route_for_user(user: dict) -> str:
    account_type = user.get("accountType")
    user_id = user["_id"]

    if account_type == "creditor":
        active_membership = db.memberships.find_one(
            {"userId": user_id, "status": "active"}
        )
        if not active_membership and user.get("organizationId"):
            return CREDITOR_DASHBOARD_PATH
        if not active_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your business workspace is not active. Contact your organisation administrator.",
            )
        return CREDITOR_DASHBOARD_PATH

    if account_type == "agency":
        active_membership = db.memberships.find_one(
            {"userId": user_id, "status": "active"}
        )
        if not active_membership and user.get("organizationId"):
            return AGENCY_DASHBOARD_PATH
        if not active_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your agency workspace is not active. Contact your organisation administrator.",
            )
        return AGENCY_DASHBOARD_PATH

    if account_type == "debtor" and user.get("debtorId"):
        return DEBTOR_PORTAL_PATH

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No authorised CollectFlow workspace is linked to this account.",
    )


def set_session_cookie(response: Response, user: dict) -> None:
    now = utc_now()
    token = jwt.encode(
        {
            "sub": str(user["_id"]),
            "iat": now,
            "exp": now + timedelta(hours=SESSION_TTL_HOURS),
            "iss": "collectflow-api",
        },
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )
    response.set_cookie(
        key="collectflow_session",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=SESSION_TTL_HOURS * 60 * 60,
        path="/",
    )


def google_auth_error(code: str) -> RedirectResponse:
    return RedirectResponse(
        url=f"{FRONTEND_APP_URL}/login?auth_error={code}",
        status_code=status.HTTP_302_FOUND,
    )


def get_current_user(request: Request) -> dict:
    token = request.cookies.get("collectflow_session")
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer="collectflow-api",
        )
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise ValueError("Invalid session subject")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")

    user = db.users.find_one({"_id": ObjectId(user_id), "status": "active"})
    if not user:
        raise HTTPException(status_code=401, detail="This account is not active.")
    return user


def create_organisation_workspace(user_id: ObjectId, account_type: str, name: str) -> tuple[ObjectId, ObjectId, ObjectId]:
    """Create an organisation, its first workspace and its owner membership."""
    now = utc_now()
    organisation_id = ObjectId()
    workspace_id = ObjectId()
    membership_id = ObjectId()

    base_slug = make_slug(name)
    organization_slug = f"{base_slug}-{secrets.token_hex(3)}"
    workspace_slug = f"{organization_slug}-main"

    try:
        db.organizations.insert_one(
            {
                "_id": organisation_id,
                "name": name.strip(),
                "slug": organization_slug,
                "organizationType": account_type,
                "ownerUserId": user_id,
                "status": "active",
                "createdAt": now,
                "updatedAt": now,
            }
        )
        db.workspaces.insert_one(
            {
                "_id": workspace_id,
                "organizationId": organisation_id,
                "workspaceKey": "main",
                "name": "Main Workspace",
                "slug": workspace_slug,
                "workspaceType": account_type,
                "status": "active",
                "createdAt": now,
                "updatedAt": now,
            }
        )
        db.memberships.insert_one(
            {
                "_id": membership_id,
                "organizationId": organisation_id,
                "workspaceId": workspace_id,
                "userId": user_id,
                "role": "owner",
                "status": "active",
                "permissions": ["workspace:manage", "members:manage", "cases:manage"],
                "createdAt": now,
                "updatedAt": now,
            }
        )
        db.users.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "organizationId": organisation_id,
                    "workspaceId": workspace_id,
                    "role": "owner",
                    "updatedAt": now,
                }
            },
        )
        return organisation_id, workspace_id, membership_id
    except Exception:
        # A standalone local MongoDB may not support multi-document transactions.
        db.memberships.delete_one({"_id": membership_id})
        db.workspaces.delete_one({"_id": workspace_id})
        db.organizations.delete_one({"_id": organisation_id})
        raise


# ---------- Health and authentication ----------


@app.on_event("startup")
def check_database_connection() -> None:
    try:
        mongo_client.admin.command("ping")
        # Idempotent indexes for the debtor-invitation collection added for portal onboarding.
        db.debtor_invitations.create_index("codeHash", unique=True, name="uq_debtor_invite_code_hash")
        db.debtor_invitations.create_index("expiresAt", expireAfterSeconds=0, name="ttl_debtor_invite_expiry")
        db.debtor_invitations.create_index(
            [("creditorOrgId", 1), ("emailNormalized", 1), ("status", 1)],
            name="ix_debtor_invite_creditor_email_status",
        )
        print(f"Connected to MongoDB database: {MONGODB_DATABASE}")
    except PyMongoError as exc:
        raise RuntimeError(
            "Could not connect to MongoDB. Check that MongoDB is running and MONGODB_URI is correct."
        ) from exc


@app.on_event("shutdown")
def close_database_connection() -> None:
    mongo_client.close()


@app.get("/api/health")
def health_check() -> dict:
    mongo_client.admin.command("ping")
    return {"ok": True, "service": "collectflow-auth", "database": MONGODB_DATABASE}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response) -> dict:
    email = normalized_email(str(payload.email))
    full_name = payload.full_name.strip()
    if len(full_name) < 2:
        raise HTTPException(status_code=422, detail="Enter your full name.")

    if db.users.find_one({"$or": [{"email": email}, {"emailNormalized": email}]}):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")

    now = utc_now()
    user_id = ObjectId()
    user_doc = {
        "_id": user_id,
        "fullName": full_name,
        "email": email,
        "emailNormalized": email,
        "passwordHash": password_hasher.hash(payload.password),
        "accountType": payload.account_type,
        "role": "debtor" if payload.account_type == "debtor" else "owner",
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
        "lastLoginAt": now,
    }

    created_org_id = None
    created_workspace_id = None
    created_membership_id = None
    accepted_invitation_id = None
    linked_debtor_id = None

    try:
        if payload.account_type in {"creditor", "agency"}:
            organization_name = (payload.organization_name or "").strip()
            if not organization_name:
                raise HTTPException(status_code=422, detail="Enter your business or agency name.")
            db.users.insert_one(user_doc)
            created_org_id, created_workspace_id, created_membership_id = create_organisation_workspace(
                user_id, payload.account_type, organization_name
            )

        else:
            invitation_code = (payload.invitation_code or "").strip()
            if not invitation_code:
                raise HTTPException(status_code=422, detail="A debtor invitation code is required.")
            invitation = db.debtor_invitations.find_one(
                {
                    "codeHash": hash_invitation_code(invitation_code),
                    "emailNormalized": email,
                    "status": "pending",
                    "expiresAt": {"$gt": now},
                }
            )
            if not invitation:
                raise HTTPException(
                    status_code=400,
                    detail="This invitation is invalid, expired, already used, or belongs to a different email address.",
                )
            linked_debtor_id = invitation.get("debtorId")
            if not linked_debtor_id:
                raise HTTPException(status_code=400, detail="The invitation is not linked to a debtor record.")

            user_doc.update(
                {
                    "debtorId": linked_debtor_id,
                    "organizationId": invitation.get("creditorOrgId"),
                }
            )
            db.users.insert_one(user_doc)
            invite_update = db.debtor_invitations.update_one(
                {"_id": invitation["_id"], "status": "pending"},
                {"$set": {"status": "accepted", "acceptedAt": now, "acceptedByUserId": user_id}},
            )
            if invite_update.modified_count != 1:
                raise HTTPException(status_code=409, detail="This invitation has already been used.")
            accepted_invitation_id = invitation["_id"]
            db.debtors.update_one(
                {"_id": linked_debtor_id},
                {"$set": {"portalUserId": user_id, "portalStatus": "active", "updatedAt": now}},
            )

    except DuplicateKeyError:
        # Roll back any records created by this request; local standalone MongoDB does not need replica-set transactions.
        if created_membership_id:
            db.memberships.delete_one({"_id": created_membership_id})
        if created_workspace_id:
            db.workspaces.delete_one({"_id": created_workspace_id})
        if created_org_id:
            db.organizations.delete_one({"_id": created_org_id})
        db.users.delete_one({"_id": user_id})
        if accepted_invitation_id:
            db.debtor_invitations.update_one(
                {"_id": accepted_invitation_id},
                {"$set": {"status": "pending"}, "$unset": {"acceptedAt": "", "acceptedByUserId": ""}},
            )
        raise HTTPException(status_code=409, detail="This email or organisation identifier is already in use.")
    except Exception:
        if created_membership_id:
            db.memberships.delete_one({"_id": created_membership_id})
        if created_workspace_id:
            db.workspaces.delete_one({"_id": created_workspace_id})
        if created_org_id:
            db.organizations.delete_one({"_id": created_org_id})
        db.users.delete_one({"_id": user_id})
        if accepted_invitation_id:
            db.debtor_invitations.update_one(
                {"_id": accepted_invitation_id},
                {"$set": {"status": "pending"}, "$unset": {"acceptedAt": "", "acceptedByUserId": ""}},
            )
        raise

    user = db.users.find_one({"_id": user_id})
    redirect_path = route_for_user(user)
    set_session_cookie(response, user)
    return {
        "ok": True,
        "message": "Your CollectFlow account has been created.",
        "user": safe_user(user),
        "redirect_path": redirect_path,
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest, response: Response) -> dict:
    email = normalized_email(str(payload.email))
    user = db.users.find_one({"$or": [{"email": email}, {"emailNormalized": email}]})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    try:
        password_hasher.verify(user.get("passwordHash", ""), payload.password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    redirect_path = route_for_user(user)
    now = utc_now()
    db.users.update_one({"_id": user["_id"]}, {"$set": {"lastLoginAt": now}})
    set_session_cookie(response, user)
    return {
        "ok": True,
        "message": "Signed in successfully.",
        "user": safe_user(user),
        "redirect_path": redirect_path,
    }


@app.get("/api/auth/google/start")
def google_sign_in_start() -> Response:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return google_auth_error("google_not_configured")

    state = secrets.token_urlsafe(32)
    query = urlencode(
        {
            "client_id": GOOGLE_CLIENT_ID,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "prompt": "select_account",
        }
    )
    response = RedirectResponse(
        url=f"https://accounts.google.com/o/oauth2/v2/auth?{query}",
        status_code=status.HTTP_302_FOUND,
    )
    response.set_cookie(
        key="collectflow_google_oauth_state",
        value=state,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=300,
        path="/api/auth/google",
    )
    return response


@app.get("/api/auth/google/callback")
def google_sign_in_callback(request: Request) -> Response:
    def error_redirect(code: str) -> RedirectResponse:
        response = google_auth_error(code)
        response.delete_cookie(
            key="collectflow_google_oauth_state",
            path="/api/auth/google",
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="lax",
        )
        return response

    state = request.query_params.get("state", "")
    stored_state = request.cookies.get("collectflow_google_oauth_state", "")
    if not state or not stored_state or not secrets.compare_digest(state, stored_state):
        return error_redirect("google_signin_failed")
    if request.query_params.get("error") or not request.query_params.get("code"):
        return error_redirect("google_signin_failed")
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return error_redirect("google_not_configured")

    token_request = UrlRequest(
        "https://oauth2.googleapis.com/token",
        data=urlencode(
            {
                "code": request.query_params["code"],
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            }
        ).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(token_request, timeout=15) as token_response:
            token_payload = json.loads(token_response.read())
        access_token = token_payload.get("access_token")
        if not access_token:
            return error_redirect("google_signin_failed")

        profile_request = UrlRequest(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            method="GET",
        )
        with urlopen(profile_request, timeout=15) as profile_response:
            profile = json.loads(profile_response.read())
    except (HTTPError, URLError, OSError, ValueError, KeyError, json.JSONDecodeError):
        return error_redirect("google_signin_failed")

    email = normalized_email(str(profile.get("email", "")))
    google_subject = str(profile.get("sub", ""))
    if not email or not google_subject:
        return error_redirect("google_signin_failed")
    if profile.get("email_verified") is not True:
        return error_redirect("google_email_unverified")

    user = db.users.find_one({"$or": [{"emailNormalized": email}, {"email": email}]})
    if not user or user.get("status") != "active":
        return error_redirect("google_account_not_found")
    linked_google_subject = user.get("googleSubject")
    if linked_google_subject and linked_google_subject != google_subject:
        return error_redirect("google_signin_failed")

    now = utc_now()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"googleSubject": google_subject, "lastLoginAt": now, "updatedAt": now}},
    )
    user["googleSubject"] = google_subject
    destination = f"{FRONTEND_APP_URL}{route_for_user(user)}"
    response = RedirectResponse(url=destination, status_code=status.HTTP_302_FOUND)
    response.delete_cookie(
        key="collectflow_google_oauth_state",
        path="/api/auth/google",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )
    set_session_cookie(response, user)
    return response


@app.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(
        key="collectflow_session",
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    return {"ok": True, "message": "You have been signed out."}


@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)) -> dict:
    return {"ok": True, "user": safe_user(user), "redirect_path": route_for_user(user)}


app.include_router(create_dashboard_router(db, get_current_user))


# ---------- Creditor-issued debtor portal invitations ----------


@app.get("/api/auth/debtor-invitations")
def list_debtor_invitations(current_user: dict = Depends(get_current_user)) -> dict:
    if (
        current_user.get("accountType") != "creditor"
        or current_user.get("role") not in {"owner", "admin"}
        or not current_user.get("organizationId")
    ):
        raise HTTPException(status_code=403, detail="Only a creditor owner or admin can view debtor invitations.")

    invitations = list(
        db.debtor_invitations.find({"creditorOrgId": current_user["organizationId"]})
        .sort("createdAt", -1)
        .limit(100)
    )
    debtors = {
        str(item["_id"]): item
        for item in db.debtors.find({"_id": {"$in": [invite.get("debtorId") for invite in invitations if invite.get("debtorId")]}})
    }
    return {
        "items": [
            {
                "id": str(invite["_id"]),
                "email": invite.get("emailNormalized", ""),
                "debtor_name": debtors.get(str(invite.get("debtorId")), {}).get("name", ""),
                "status": invite.get("status", "pending"),
                "delivery_status": invite.get("deliveryStatus", "unknown"),
                "created_at": invite.get("createdAt").isoformat() if invite.get("createdAt") else None,
                "expires_at": invite.get("expiresAt").isoformat() if invite.get("expiresAt") else None,
            }
            for invite in invitations
        ]
    }


@app.post("/api/auth/debtor-invitations", status_code=status.HTTP_201_CREATED)
def create_debtor_invitation(
    payload: DebtorInviteRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    if (
        current_user.get("accountType") != "creditor"
        or current_user.get("role") not in {"owner", "admin"}
        or not current_user.get("organizationId")
    ):
        raise HTTPException(
            status_code=403,
            detail="Only a creditor owner or admin can invite a debtor in this MVP.",
        )

    email = normalized_email(str(payload.email))
    creditor_org_id = current_user["organizationId"]
    if db.users.find_one({"$or": [{"email": email}, {"emailNormalized": email}]}):
        raise HTTPException(
            status_code=409,
            detail="This email already has a CollectFlow account. Use a different email or sign in to that account.",
        )
    debtor = db.debtors.find_one(
        {
            "creditorOrgId": creditor_org_id,
            "$or": [{"emailNormalized": email}, {"email": email}],
        }
    )

    now = utc_now()
    if not debtor:
        debtor_id = ObjectId()
        db.debtors.insert_one(
            {
                "_id": debtor_id,
                "creditorOrgId": creditor_org_id,
                "name": (payload.debtor_name or email.split("@")[0]).strip(),
                "email": email,
                "emailNormalized": email,
                "portalStatus": "invited",
                "createdAt": now,
                "updatedAt": now,
            }
        )
    else:
        debtor_id = debtor["_id"]
        if debtor.get("portalUserId") or str(debtor.get("portalStatus", "")).lower() == "active":
            raise HTTPException(status_code=409, detail="This debtor already has an active portal account.")

    plain_code = secrets.token_urlsafe(24)
    expires_at = now + timedelta(days=7)
    db.debtor_invitations.update_many(
        {"creditorOrgId": creditor_org_id, "emailNormalized": email, "status": "pending"},
        {"$set": {"status": "superseded", "updatedAt": now}},
    )
    invitation_result = db.debtor_invitations.insert_one(
        {
            "creditorOrgId": creditor_org_id,
            "debtorId": debtor_id,
            "emailNormalized": email,
            "codeHash": hash_invitation_code(plain_code),
            "status": "pending",
            "deliveryStatus": "pending",
            "createdByUserId": current_user["_id"],
            "createdAt": now,
            "expiresAt": expires_at,
        }
    )
    creditor = db.organizations.find_one({"_id": creditor_org_id}, {"name": 1}) or {}
    debtor_name = (payload.debtor_name or "").strip()
    if not debtor_name:
        debtor_name = str(debtor.get("name") if debtor else email.split("@")[0])
    email_sent = False
    try:
        send_debtor_invitation_email(
            recipient=email,
            debtor_name=debtor_name,
            creditor_name=str(creditor.get("name") or "Your creditor"),
            code=plain_code,
            expires_at=expires_at,
        )
        email_sent = True
        delivery_status = "sent"
        response_message = f"Invitation email sent to {email}. They must register with this same email address."
    except (OSError, smtplib.SMTPException, RuntimeError):
        delivery_status = "failed" if SMTP_HOST and SMTP_FROM_EMAIL else "manual"
        response_message = (
            "The invitation was created, but email delivery failed. Copy the code below and share it securely."
            if delivery_status == "failed"
            else "The invitation was created, but outgoing email is not configured. Copy the code below and share it securely."
        )
    db.debtor_invitations.update_one(
        {"_id": invitation_result.inserted_id},
        {"$set": {"deliveryStatus": delivery_status, "sentAt": utc_now() if email_sent else None}},
    )
    return {
        "ok": True,
        "message": response_message,
        "delivery_status": delivery_status,
        "invitation_code": None if email_sent else plain_code,
        "expires_at": expires_at.isoformat(),
    }
