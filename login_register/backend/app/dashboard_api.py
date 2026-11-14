from __future__ import annotations

from calendar import month_name
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re
from typing import Any, Literal
from urllib.parse import quote

from bson import Decimal128, ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from gridfs import GridFSBucket
from gridfs.errors import NoFile
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError, PyMongoError
from starlette.responses import StreamingResponse


MAX_DASHBOARD_RECORDS = 5000
MANAGER_ROLES = {"owner", "admin", "manager", "agency manager", "agency admin", "creditor admin", "creditor finance", "finance"}
ACTIVE_ALLOCATION_STATES = {"", "active", "allocated", "posted", "verified", "complete", "completed"}


class InvoiceCreateRequest(BaseModel):
    debtor_id: str = Field(min_length=1, max_length=80)
    invoice_number: str = Field(min_length=1, max_length=80)
    issue_date: date
    due_date: date
    currency: str = Field(default="INR", min_length=3, max_length=3, pattern=r"^[A-Za-z]{3}$")
    original_amount: Decimal = Field(gt=Decimal("0"), max_digits=18, decimal_places=2)


class TaskActionRequest(BaseModel):
    action: Literal["complete", "defer"]


class DebtorPaymentPlanRequest(BaseModel):
    invoice_id: str = Field(min_length=1, max_length=80)
    installment_count: int = Field(ge=2, le=24)
    first_payment_date: date
    note: str = Field(default="", max_length=500)


class DebtorDisputeRequest(BaseModel):
    invoice_id: str = Field(min_length=1, max_length=80)
    reason: str = Field(min_length=2, max_length=120)
    details: str = Field(min_length=10, max_length=3000)


class DebtorMessageRequest(BaseModel):
    invoice_id: str = Field(default="", max_length=80)
    subject: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=2, max_length=3000)


def _first(document: dict | None, *keys: str, default: Any = None) -> Any:
    if not document:
        return default
    for key in keys:
        if key in document and document[key] is not None:
            return document[key]
    return default


def _object_id(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return value
    if value is not None and ObjectId.is_valid(str(value)):
        return ObjectId(str(value))
    return value


def _id_values(value: Any) -> list[Any]:
    if value is None:
        return []
    converted = _object_id(value)
    values = [converted]
    text = str(value)
    if text != converted:
        values.append(text)
    elif isinstance(converted, ObjectId):
        values.append(text)
    return values


def _id_list(values: list[Any]) -> list[Any]:
    result: list[Any] = []
    seen: set[str] = set()
    for value in values:
        for item in _id_values(value):
            marker = f"{type(item).__name__}:{item}"
            if item is not None and marker not in seen:
                seen.add(marker)
                result.append(item)
    return result


def _same_id(left: Any, right: Any) -> bool:
    return left is not None and right is not None and str(left) == str(right)


def _field_filter(keys: tuple[str, ...], values: list[Any]) -> dict:
    refs = _id_list(values)
    if not refs:
        return {"_id": {"$in": []}}
    return {"$or": [{key: {"$in": refs}} for key in keys]}


def _combine(*filters: dict) -> dict:
    parts = [item for item in filters if item]
    return parts[0] if len(parts) == 1 else {"$and": parts}


def _find(db: Any, collection_name: str, query: dict, *, sort: tuple[str, int] | None = None, limit: int = MAX_DASHBOARD_RECORDS) -> list[dict]:
    try:
        collection = db[collection_name]
        cursor = collection.find(query)
        if sort:
            cursor = cursor.sort(sort[0], sort[1])
        return list(cursor.limit(limit))
    except PyMongoError as exc:
        raise HTTPException(status_code=503, detail="Dashboard data is temporarily unavailable.") from exc


def _collection_exists(db: Any, name: str) -> bool:
    try:
        return name in db.list_collection_names()
    except PyMongoError:
        return False


def _as_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
    if isinstance(value, date):
        return datetime.combine(value, time.min, tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
        except ValueError:
            return None
    return None


def _iso(value: Any) -> str | None:
    parsed = _as_datetime(value)
    return parsed.isoformat() if parsed else None


def _decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal128):
        return value.to_decimal()
    if isinstance(value, Decimal):
        return value
    if value is None or isinstance(value, bool):
        return Decimal("0")
    try:
        return Decimal(str(value).replace(",", "").replace("₹", "").strip())
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _money(value: Decimal | int | float) -> str:
    return f"{_decimal(value):.2f}"


def _currency(document: dict | None) -> str:
    return str(_first(document, "currency", default="INR")).upper()


def _money_by_currency(rows: list[dict], amount_key: str) -> dict[str, str]:
    totals: dict[str, Decimal] = {}
    for row in rows:
        currency = str(row.get("currency") or "INR").upper()
        totals[currency] = totals.get(currency, Decimal("0")) + _decimal(row.get(amount_key))
    return {currency: _money(amount) for currency, amount in sorted(totals.items())}


def _month_money(financials: dict, month: str) -> dict[str, str]:
    values = financials["recovered_by_month"].get(month, {})
    return {currency: _money(amount) for currency, amount in sorted(values.items())}


def _normal(value: Any) -> str:
    return str(value or "").strip().lower().replace("_", " ").replace("-", " ")


def _org_filter(org_id: Any, names: tuple[str, ...]) -> dict:
    return _field_filter(names, [org_id])


def _org_filter_many(org_ids: list[Any], names: tuple[str, ...]) -> dict:
    return _field_filter(names, org_ids)


def _active_period(document: dict, now: datetime) -> bool:
    state = _normal(_first(document, "status", "engagementStatus", "engagement_status"))
    if state != "active" or _first(document, "revokedAt", "revoked_at"):
        return False
    starts = _as_datetime(_first(document, "startAt", "validFrom", "startDate", "start_at", "valid_from"))
    raw_end = _first(document, "endAt", "validUntil", "endDate", "end_at", "valid_until")
    ends = _as_datetime(raw_end)
    if ends and ends.time() == time.min:
        ends += timedelta(days=1)
    return not (starts and starts > now) and not (ends and ends <= now)


def _row_status(invoice: dict, balance: Decimal, now: datetime) -> str:
    raw = _normal(_first(invoice, "invoiceStatus", "status", "invoice_status"))
    if raw in {"draft", "cancelled", "canceled", "void", "written off"}:
        return {"canceled": "Cancelled", "void": "Cancelled", "written off": "Written off"}.get(raw, raw.title())
    if balance <= 0:
        return "Settled"
    due = _as_datetime(_first(invoice, "dueDate", "due_date"))
    if due and due.date() < now.date():
        return "Overdue"
    return "Awaiting payment"


def _month_bounds(months: int, now: datetime) -> list[tuple[str, datetime, datetime]]:
    current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    result = []
    for offset in reversed(range(months)):
        year = current.year
        month = current.month - offset
        while month <= 0:
            year -= 1
            month += 12
        start = current.replace(year=year, month=month)
        if month == 12:
            end = start.replace(year=year + 1, month=1)
        else:
            end = start.replace(month=month + 1)
        result.append((start.strftime("%Y-%m"), start, end))
    return result


def create_dashboard_router(db: Any, get_current_user: Any) -> APIRouter:
    router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

    def _record_admin_access(user: dict, request: Request, account_type: str, org_id: Any, debtor_id: Any = None) -> None:
        try:
            db.audit_events.insert_one({
                "organizationId": org_id,
                "actorUserId": user["_id"],
                "action": "platform_admin.dashboard_read",
                "resourceType": "dashboard",
                "resourceId": debtor_id or org_id,
                "metadata": {"accountType": account_type, "path": request.url.path},
                "createdAt": datetime.now(timezone.utc),
            })
        except PyMongoError as exc:
            raise HTTPException(status_code=503, detail="Admin access could not be audited; try again shortly.") from exc

    def _debtor_context(
        request: Request,
        user: dict,
        debtor_id: Any,
        expected_org_id: Any = None,
        *,
        platform_admin: bool = False,
    ) -> dict:
        filters = [_field_filter(("_id",), [debtor_id]), {"portalStatus": {"$in": ["active", "ACTIVE"]}}]
        if expected_org_id:
            filters.append(_org_filter(expected_org_id, ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")))
        if platform_admin:
            filters.append({"portalUserId": {"$exists": True, "$ne": None}})
        else:
            filters.append(_field_filter(("portalUserId", "portal_user_id"), [user["_id"]]))
        debtor = db.debtors.find_one(_combine(*filters))
        creditor_id = _first(debtor, "creditorOrgId", "creditorOrganizationId", "creditor_org_id") if debtor else None
        if not debtor or not creditor_id:
            raise HTTPException(status_code=403, detail="The linked debtor portal is not active.")
        account_org_id = _first(user, "organizationId", "organization_id")
        if not platform_admin and account_org_id and not _same_id(account_org_id, creditor_id):
            raise HTTPException(status_code=403, detail="This debtor portal is not linked to your creditor account.")
        context = {
            "user": user,
            "org_id": creditor_id,
            "account_type": "debtor",
            "role": "platform admin" if platform_admin else "debtor",
            "can_manage": platform_admin,
            "platform_admin": platform_admin,
            "engagements": [],
            "portfolios": [],
            "creditor_ids": [creditor_id],
            "debtor_id": debtor["_id"],
            "debtor": debtor,
            "cases": [],
        }
        case_query = _combine(
            _field_filter(("debtorId", "debtor_id"), [debtor["_id"]]),
            _org_filter(creditor_id, ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
        )
        cases = []
        for collection_name in ("debt_cases", "recovery_cases"):
            cases.extend(_find(db, collection_name, case_query))
        context["cases"] = _dedupe(cases)
        if platform_admin:
            _record_admin_access(user, request, "debtor", creditor_id, debtor["_id"])
        return context

    def get_context(request: Request, user: dict = Depends(get_current_user)) -> dict:
        account_type = _normal(_first(user, "accountType", "account_type"))
        org_id = _first(user, "organizationId", "organization_id")
        platform_admin = user.get("platformAdmin") is True
        admin_scope = False
        admin_account_type = request.headers.get("x-collectflow-admin-account-type")
        if platform_admin and admin_account_type:
            account_type = _normal(admin_account_type)
            if account_type not in {"creditor", "agency", "debtor"}:
                raise HTTPException(status_code=403, detail="Choose a valid workspace from the platform admin console.")
            org_ref = request.headers.get("x-collectflow-admin-organization")
            if not org_ref or not ObjectId.is_valid(org_ref):
                raise HTTPException(status_code=400, detail="A valid workspace is required for admin access.")
            org_id = ObjectId(org_ref)
            organization = db.organizations.find_one({"_id": org_id, "status": {"$in": ["active", "ACTIVE"]}})
            expected_type = "creditor" if account_type == "debtor" else account_type
            if not organization or _normal(_first(organization, "organizationType", "organization_type")) != expected_type:
                raise HTTPException(status_code=404, detail="The selected workspace was not found.")
            admin_scope = True
            if account_type == "debtor":
                debtor_ref = request.headers.get("x-collectflow-admin-debtor")
                if not debtor_ref or not ObjectId.is_valid(debtor_ref):
                    raise HTTPException(status_code=400, detail="Choose a debtor account first.")
                return _debtor_context(request, user, ObjectId(debtor_ref), org_id, platform_admin=True)

        if account_type == "debtor":
            debtor_id = _first(user, "debtorId", "debtor_id")
            if not debtor_id:
                raise HTTPException(status_code=403, detail="This debtor account is not linked to a debtor record.")
            return _debtor_context(request, user, debtor_id, org_id)

        if account_type not in {"creditor", "agency"} or not org_id:
            raise HTTPException(status_code=403, detail="A creditor or agency workspace is required.")

        if admin_scope:
            role = "platform admin"
        else:
            membership_filter = _combine(
                _field_filter(("userId", "user_id"), [user["_id"]]),
                _org_filter(org_id, ("organizationId", "organization_id")),
                {"status": {"$in": ["active", "ACTIVE"]}},
            )
            workspace_id = _first(user, "workspaceId", "workspace_id")
            if workspace_id:
                membership_filter = _combine(membership_filter, _field_filter(("workspaceId", "workspace_id"), [workspace_id]))
            membership = db.memberships.find_one(membership_filter)
            if not membership:
                raise HTTPException(status_code=403, detail="No active workspace membership was found.")
            role = _normal(_first(membership, "role", "roleKey", "role_key", default=_first(user, "role", default="member")))
        context = {
            "user": user,
            "org_id": org_id,
            "account_type": account_type,
            "role": role,
            "can_manage": admin_scope or role in MANAGER_ROLES,
            "platform_admin": admin_scope,
            "engagements": [],
            "portfolios": [],
            "creditor_ids": [org_id] if account_type == "creditor" else [],
            "cases": [],
        }
        if admin_scope:
            _record_admin_access(user, request, account_type, org_id)

        if account_type == "creditor":
            cases = []
            for collection_name in ("debt_cases", "recovery_cases"):
                cases.extend(_find(db, collection_name, _org_filter(org_id, ("creditorOrgId", "creditorOrganizationId", "creditor_org_id"))))
            context["cases"] = _dedupe(cases)
            context["portfolios"] = _find(db, "portfolios", _org_filter(org_id, ("creditorOrgId", "creditor_org_id")))
            return context

        now = datetime.now(timezone.utc)
        engagement_candidates = _find(
            db,
            "client_engagements",
            _org_filter(org_id, ("agencyOrgId", "agencyOrganizationId", "agency_org_id")),
        )
        engagements = [
            item for item in engagement_candidates
            if _active_period(item, now)
            and _first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
        ]
        engagement_ids = [item.get("_id") for item in engagements if item.get("_id")]
        context["engagements"] = engagements
        context["creditor_ids"] = _unique([_first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id") for item in engagements])
        if not engagement_ids:
            return context

        portfolio_grants = []
        if _collection_exists(db, "engagement_portfolio_grants"):
            portfolio_grants = _find(db, "engagement_portfolio_grants", _field_filter(("engagementId", "engagement_id"), engagement_ids))
        granted_portfolio_ids = []
        for grant in portfolio_grants:
            if _active_period({**grant, "status": _first(grant, "status", default="active")}, now):
                granted_portfolio_ids.extend(_id_values(_first(grant, "portfolioId", "portfolio_id")))

        portfolios = _find(
            db,
            "portfolios",
            {"$or": [
                _field_filter(("agencyOrgId", "agency_org_id"), [org_id]),
                _field_filter(("clientEngagementId", "engagementId", "client_engagement_id", "engagement_id"), engagement_ids),
                _field_filter(("_id",), granted_portfolio_ids),
            ]},
        )
        allowed_portfolio_ids: list[Any] = []
        for portfolio in portfolios:
            engagement_id = _first(portfolio, "clientEngagementId", "engagementId", "client_engagement_id", "engagement_id")
            linked = any(_same_id(engagement_id, item) for item in engagement_ids)
            if linked:
                allowed_portfolio_ids.append(portfolio.get("_id"))

        allowed_portfolio_ids.extend(granted_portfolio_ids)

        allowed_portfolio_ids.extend(
            value for item in engagements
            for value in _id_values(_first(item, "portfolioId", "portfolio_id"))
        )
        allowed_portfolio_ids.extend(
            value for item in engagements
            for value in (_first(item, "portfolioIds", "portfolio_ids", default=[]) or [])
        )
        allowed_portfolio_ids = _unique(allowed_portfolio_ids)
        context["portfolios"] = [item for item in portfolios if any(_same_id(item.get("_id"), allowed) for allowed in allowed_portfolio_ids)]

        case_scope_terms = []
        case_scope_terms.extend([
            _field_filter(("clientEngagementId", "engagementId", "client_engagement_id", "engagement_id"), engagement_ids),
        ])
        if allowed_portfolio_ids:
            case_scope_terms.append(_field_filter(("portfolioId", "portfolio_id"), allowed_portfolio_ids))

        explicit_case_ids = [
            value for item in engagements
            for case_id in (_first(item, "caseIds", "permittedCaseIds", "case_ids", default=[]) or [])
            for value in _id_values(case_id)
        ]
        if _collection_exists(db, "case_access_grants"):
            access_grants = _find(db, "case_access_grants", _org_filter(org_id, ("granteeOrgId", "granteeOrganizationId", "grantee_org_id")))
            for grant in access_grants:
                if _first(grant, "revokedAt", "revoked_at"):
                    continue
                if not _active_period({**grant, "status": _first(grant, "status", default="active")}, now):
                    continue
                grant_engagement_id = _first(grant, "engagementId", "engagement_id")
                grant_creditor_id = _first(grant, "creditorOrgId", "creditor_org_id")
                if grant_engagement_id and not any(_same_id(grant_engagement_id, item) for item in engagement_ids):
                    continue
                if grant_creditor_id and not any(_same_id(grant_creditor_id, item) for item in context["creditor_ids"]):
                    continue
                if _normal(_first(grant, "resourceType", "resource_type")) in {"case", "debt case", "recovery case"}:
                    explicit_case_ids.extend(_id_values(_first(grant, "resourceId", "resource_id")))
        if explicit_case_ids:
            case_scope_terms.append(_field_filter(("_id",), explicit_case_ids))

        candidates: list[dict] = []
        if case_scope_terms:
            candidate_query = {"$or": case_scope_terms}
            for collection_name in ("debt_cases", "recovery_cases"):
                candidates.extend(_find(db, collection_name, candidate_query))

        permitted_creditors = context["creditor_ids"]
        authorized = []
        for case in _dedupe(candidates):
            creditor_id = _first(case, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
            if not creditor_id or not any(_same_id(creditor_id, allowed) for allowed in permitted_creditors):
                continue
            case_agency_id = _first(case, "agencyOrgId", "agencyOrganizationId", "agency_org_id")
            if case_agency_id and not _same_id(case_agency_id, org_id):
                continue
            engagement_id = _first(case, "clientEngagementId", "engagementId", "client_engagement_id", "engagement_id")
            portfolio_id = _first(case, "portfolioId", "portfolio_id")
            explicitly_granted = any(_same_id(case.get("_id"), case_id) for case_id in explicit_case_ids)
            linked = any(_same_id(engagement_id, item) for item in engagement_ids) or any(_same_id(portfolio_id, item) for item in allowed_portfolio_ids)
            if linked or explicitly_granted:
                authorized.append(case)

        if not context["can_manage"]:
            assignment_ids = []
            if _collection_exists(db, "agency_case_assignments"):
                assignments = _find(
                    db,
                    "agency_case_assignments",
                    _combine(
                        _org_filter(org_id, ("agencyOrgId", "agency_org_id")),
                        _field_filter(("assignedCollectorUserId", "assignedCollectorId", "assigneeUserId", "assigned_collector_user_id"), [user["_id"]]),
                    ),
                )
                assignment_ids.extend(
                    _first(item, "caseId", "recoveryCaseId", "case_id")
                    for item in assignments
                    if _normal(_first(item, "assignmentStatus", "status", default="active")) in {"active", "assigned"}
                )
            authorized = [
                case for case in authorized
                if _same_id(_first(case, "assignedCollectorId", "assignedTo", "assigneeUserId", "assigned_collector_id"), user["_id"])
                or any(_same_id(case.get("_id"), assignment_id) for assignment_id in assignment_ids)
            ]

        context["cases"] = authorized
        context["portfolios"] = [
            portfolio for portfolio in context["portfolios"]
            if any(_same_id(portfolio.get("_id"), allowed) for allowed in allowed_portfolio_ids)
        ]
        return context

    def _dedupe(documents: list[dict]) -> list[dict]:
        result = []
        seen: set[str] = set()
        for document in documents:
            key = str(document.get("_id", id(document)))
            if key not in seen:
                seen.add(key)
                result.append(document)
        return result

    def _unique(values: list[Any]) -> list[Any]:
        result = []
        seen: set[str] = set()
        for value in values:
            if value is None:
                continue
            key = str(value)
            if key not in seen:
                seen.add(key)
                result.append(value)
        return result

    def _case_ids(context: dict) -> list[Any]:
        return _unique([case.get("_id") for case in context["cases"] if case.get("_id")])

    def _invoice_ids_for_cases(context: dict) -> list[Any]:
        return _unique(value for linked in _case_invoice_map(context).values() for value in linked)

    def _case_invoice_map(context: dict) -> dict[str, list[Any]]:
        case_ids = _case_ids(context)
        linked = {str(case_id): [] for case_id in case_ids}
        for case in context["cases"]:
            case_id = str(case.get("_id"))
            linked.setdefault(case_id, [])
            linked[case_id].extend(_id_values(_first(case, "invoiceId", "invoice_id")))
            linked[case_id].extend(_first(case, "invoiceIds", "invoice_ids", default=[]) or [])
        if case_ids and _collection_exists(db, "case_invoices"):
            for relation in _find(db, "case_invoices", _field_filter(("caseId", "case_id", "recoveryCaseId"), case_ids)):
                case_id = str(_first(relation, "caseId", "case_id", "recoveryCaseId", default=""))
                linked.setdefault(case_id, []).extend(_id_values(_first(relation, "invoiceId", "invoice_id")))
        return {case_id: _unique(values) for case_id, values in linked.items()}

    def _invoice_documents(context: dict, limit: int = MAX_DASHBOARD_RECORDS) -> list[dict]:
        if context["account_type"] == "creditor":
            query = _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id"))
        elif context["account_type"] == "debtor":
            query = _combine(
                _field_filter(("debtorId", "debtor_id"), [context["debtor_id"]]),
                _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
            )
        else:
            invoice_ids = _invoice_ids_for_cases(context)
            if not invoice_ids:
                return []
            query = _field_filter(("_id",), invoice_ids)
        documents = _find(db, "invoices", query, sort=("dueDate", 1), limit=limit)
        if context["account_type"] == "agency" and context["creditor_ids"]:
            documents = [
                item for item in documents
                if _first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
                and any(_same_id(_first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id"), creditor) for creditor in context["creditor_ids"])
            ]
        return documents

    def _payment_documents(context: dict, invoice_ids: list[Any]) -> list[dict]:
        if context["account_type"] == "creditor":
            query = _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id"))
        else:
            case_ids = _case_ids(context)
            if not case_ids and not invoice_ids:
                return []
            query = {"$or": [
                _field_filter(("caseId", "recoveryCaseId", "case_id"), case_ids),
                _field_filter(("invoiceId", "invoice_id"), invoice_ids),
            ]}
        payments = _find(db, "payments", query)
        if context["account_type"] in {"agency", "debtor"}:
            payments = [
                item for item in payments
                if _first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
                and any(_same_id(_first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id"), creditor) for creditor in context["creditor_ids"])
            ]
        return payments

    def _financials(context: dict, invoices: list[dict]) -> dict:
        invoice_ids = [item.get("_id") for item in invoices if item.get("_id")]
        if not invoice_ids:
            return {"balances": {}, "recovered_by_month": {}}
        payments = _payment_documents(context, invoice_ids)
        verified = {
            str(payment.get("_id")): payment
            for payment in payments
            if _normal(_first(payment, "verificationStatus", "verification_status")) == "verified"
        }
        allocations = _find(
            db,
            "payment_allocations",
            _combine(
                _field_filter(("invoiceId", "invoice_id"), invoice_ids),
                _field_filter(("paymentId", "payment_id"), [payment.get("_id") for payment in verified.values()]),
            ),
        ) if verified else []
        adjustments = _find(db, "invoice_adjustments", _field_filter(("invoiceId", "invoice_id"), invoice_ids)) if _collection_exists(db, "invoice_adjustments") else []

        paid_by_invoice: dict[str, Decimal] = {}
        recovered_by_month: dict[str, dict[str, Decimal]] = {}
        invoices_by_id = {str(invoice.get("_id")): invoice for invoice in invoices}
        for allocation in allocations:
            allocation_status = _normal(_first(allocation, "allocationStatus", "status", "allocation_status", default=""))
            if allocation_status not in ACTIVE_ALLOCATION_STATES or _first(allocation, "reversedByAllocationId", "reversed_by_allocation_id"):
                continue
            payment = verified.get(str(_first(allocation, "paymentId", "payment_id")))
            if not payment:
                continue
            invoice_key = str(_first(allocation, "invoiceId", "invoice_id"))
            invoice = invoices_by_id.get(invoice_key)
            if not invoice:
                continue
            amount = _decimal(_first(allocation, "allocatedAmount", "amount", "allocated_amount"))
            paid_by_invoice[invoice_key] = paid_by_invoice.get(invoice_key, Decimal("0")) + amount
            paid_at = _as_datetime(_first(payment, "paymentDate", "paidAt", "createdAt", "payment_date")) or _as_datetime(_first(allocation, "allocatedAt", "createdAt", "allocated_at"))
            if paid_at:
                month_key = paid_at.strftime("%Y-%m")
                currency = str(_first(allocation, "currency", "allocationCurrency", "allocation_currency", default=_currency(invoice))).upper()
                month_totals = recovered_by_month.setdefault(month_key, {})
                month_totals[currency] = month_totals.get(currency, Decimal("0")) + amount

        credits_by_invoice: dict[str, Decimal] = {}
        debits_by_invoice: dict[str, Decimal] = {}
        for adjustment in adjustments:
            if _normal(_first(adjustment, "status", default="approved")) in {"rejected", "void", "cancelled", "canceled"}:
                continue
            invoice_key = str(_first(adjustment, "invoiceId", "invoice_id"))
            amount = _decimal(_first(adjustment, "amount"))
            kind = _normal(_first(adjustment, "adjustmentType", "type", "adjustment_type"))
            if any(word in kind for word in ("credit", "write off", "discount")):
                credits_by_invoice[invoice_key] = credits_by_invoice.get(invoice_key, Decimal("0")) + amount
            else:
                debits_by_invoice[invoice_key] = debits_by_invoice.get(invoice_key, Decimal("0")) + amount

        balances = {}
        for invoice in invoices:
            key = str(invoice.get("_id"))
            original = _decimal(_first(invoice, "originalAmount", "amount", "totalAmount", "original_amount"))
            balance = original + debits_by_invoice.get(key, Decimal("0")) - credits_by_invoice.get(key, Decimal("0")) - paid_by_invoice.get(key, Decimal("0"))
            balances[key] = max(balance, Decimal("0"))
        return {"balances": balances, "recovered_by_month": recovered_by_month}

    def _debtor_names(ids: list[Any], context: dict) -> dict[str, dict]:
        refs = _id_list(ids)
        if not refs or not context["creditor_ids"]:
            return {}
        query = _combine(
            _field_filter(("_id",), refs),
            _org_filter_many(context["creditor_ids"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
        )
        return {str(item.get("_id")): item for item in _find(db, "debtors", query)}

    def _invoice_rows(context: dict, invoices: list[dict], financials: dict, now: datetime) -> list[dict]:
        debtor_ids = [_first(item, "debtorId", "debtor_id") for item in invoices]
        debtors = _debtor_names(debtor_ids, context)
        rows = []
        for invoice in invoices:
            debtor_id = _first(invoice, "debtorId", "debtor_id")
            debtor = debtors.get(str(debtor_id), {})
            balance = financials["balances"].get(str(invoice.get("_id")), Decimal("0"))
            rows.append({
                "id": str(invoice.get("_id", "")),
                "invoice_number": str(_first(invoice, "invoiceNumber", "number", "invoice_number", default="")),
                "debtor_id": str(debtor_id or ""),
                "client": str(_first(debtor, "tradeName", "legalName", "name", "trade_name", "legal_name", default="Unknown debtor")),
                "issue_date": _iso(_first(invoice, "issueDate", "issuedAt", "issue_date")),
                "due_date": _iso(_first(invoice, "dueDate", "due_date")),
                "amount": _money(_first(invoice, "originalAmount", "amount", "totalAmount", "original_amount")),
                "outstanding_amount": _money(balance),
                "currency": _currency(invoice),
                "status": _row_status(invoice, balance, now),
            })
        return rows

    def _payment_rows(context: dict, invoices: list[dict], limit: int = 250) -> list[dict]:
        invoice_by_id = {str(invoice.get("_id")): invoice for invoice in invoices if invoice.get("_id")}
        invoice_ids = [invoice.get("_id") for invoice in invoices if invoice.get("_id")]
        if not invoice_ids:
            return []
        payments = _payment_documents(context, invoice_ids)
        verified = {
            str(payment.get("_id")): payment
            for payment in payments
            if _normal(_first(payment, "verificationStatus", "verification_status")) == "verified"
        }
        if not verified:
            return []
        allocations = _find(
            db,
            "payment_allocations",
            _combine(
                _field_filter(("invoiceId", "invoice_id"), invoice_ids),
                _field_filter(("paymentId", "payment_id"), [payment.get("_id") for payment in verified.values()]),
            ),
            sort=("allocatedAt", -1),
            limit=MAX_DASHBOARD_RECORDS,
        )
        rows = []
        for allocation in allocations:
            allocation_status = _normal(_first(allocation, "allocationStatus", "status", "allocation_status", default=""))
            if allocation_status not in ACTIVE_ALLOCATION_STATES or _first(allocation, "reversedByAllocationId", "reversed_by_allocation_id"):
                continue
            payment = verified.get(str(_first(allocation, "paymentId", "payment_id")))
            invoice = invoice_by_id.get(str(_first(allocation, "invoiceId", "invoice_id")))
            if not payment or not invoice:
                continue
            paid_at = _as_datetime(_first(payment, "paymentDate", "paidAt", "createdAt", "payment_date")) or _as_datetime(_first(allocation, "allocatedAt", "createdAt", "allocated_at"))
            rows.append({
                "id": str(allocation.get("_id", payment.get("_id", ""))),
                "date": paid_at.isoformat() if paid_at else None,
                "amount": _money(_first(allocation, "allocatedAmount", "amount", "allocated_amount")),
                "currency": str(_first(allocation, "currency", "allocationCurrency", "allocation_currency", default=_currency(invoice))).upper(),
                "invoice_number": str(_first(invoice, "invoiceNumber", "number", "invoice_number", default="")),
                "reference": str(_first(payment, "transactionReference", "paymentReference", "reference", "transaction_reference", default="")),
                "method": str(_first(payment, "paymentMethod", "method", "payment_method", default="")),
                "status": "Verified",
            })
        rows.sort(key=lambda item: item["date"] or "", reverse=True)
        return rows[:limit]

    def _case_rows(context: dict, invoices: list[dict], financials: dict) -> list[dict]:
        case_invoice_map = _case_invoice_map(context)
        invoices_by_id = {str(item.get("_id")): item for item in invoices}
        debtors = _debtor_names([_first(case, "debtorId", "debtor_id") for case in context["cases"]], context)
        creditor_names = {
            str(item.get("_id")): str(_first(item, "name", "legalName", "tradeName", default="Client"))
            for item in _find(db, "organizations", _field_filter(("_id",), context["creditor_ids"]))
        }
        portfolios = {str(item.get("_id")): item for item in context["portfolios"]}
        rows = []
        for case in context["cases"]:
            debtor_id = _first(case, "debtorId", "debtor_id")
            creditor_id = _first(case, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
            portfolio_id = _first(case, "portfolioId", "portfolio_id")
            linked_ids = case_invoice_map.get(str(case.get("_id")), [])
            balance_by_currency: dict[str, Decimal] = {}
            for invoice_id in linked_ids:
                invoice = invoices_by_id.get(str(invoice_id))
                if invoice:
                    currency = _currency(invoice)
                    balance_by_currency[currency] = balance_by_currency.get(currency, Decimal("0")) + financials["balances"].get(str(invoice_id), Decimal("0"))
            debtor = debtors.get(str(debtor_id), {})
            rows.append({
                "id": str(case.get("_id", "")),
                "case_reference": str(_first(case, "caseReference", "caseNumber", "reference", "case_reference", default="")),
                "client_id": str(creditor_id or ""),
                "client": creditor_names.get(str(creditor_id), "Client"),
                "debtor": str(_first(debtor, "tradeName", "legalName", "name", "trade_name", "legal_name", default="Unknown debtor")),
                "debtor_id": str(debtor_id or ""),
                "portfolio": str(_first(portfolios.get(str(portfolio_id), {}), "name", default="")),
                "status": str(_first(case, "lifecycleStatus", "status", "workflowStage", "lifecycle_status", default="Open")),
                "priority": str(_first(case, "priority", default="Normal")),
                "outstanding_amount": {currency: _money(amount) for currency, amount in sorted(balance_by_currency.items())},
                "opened_at": _iso(_first(case, "openedAt", "createdAt", "opened_at")),
                "assigned_collector": str(_first(case, "assignedCollectorName", "collectorName", default="")),
            })
        rows.sort(key=lambda item: item["opened_at"] or "", reverse=True)
        return rows

    def _task_query(context: dict) -> dict:
        case_ids = _case_ids(context)
        if not case_ids:
            return {"_id": {"$in": []}}
        return _field_filter(("caseId", "recoveryCaseId", "case_id"), case_ids)

    def _task_rows(context: dict, limit: int = 100) -> list[dict]:
        if context["account_type"] == "debtor":
            return []
        tasks = _find(db, "tasks", _task_query(context), sort=("dueAt", 1), limit=limit)
        if not context["can_manage"]:
            tasks = [
                task for task in tasks
                if _same_id(_first(task, "assignedTo", "assigneeUserId", "assignedToUserId", "assignee_user_id"), context["user"]["_id"])
            ]
        cases = {str(case.get("_id")): case for case in context["cases"]}
        rows = []
        for task in tasks:
            case_id = _first(task, "caseId", "recoveryCaseId", "case_id")
            case = cases.get(str(case_id), {})
            rows.append({
                "id": str(task.get("_id", "")),
                "title": str(_first(task, "title", "taskType", "task_type", default="Follow up")),
                "due_at": _iso(_first(task, "dueAt", "dueDate", "due_at", "due_date")),
                "status": _normal(_first(task, "status", default="open")),
                "priority": str(_first(task, "priority", default="normal")),
                "case_id": str(case_id or ""),
                "case_reference": str(_first(case, "caseReference", "caseNumber", "reference", "case_reference", default="")),
                "debtor_id": str(_first(case, "debtorId", "debtor_id", default="")),
            })
        return rows

    def _document_rows(context: dict, limit: int) -> list[dict]:
        if context["account_type"] == "creditor":
            query = _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id"))
        elif context["account_type"] == "debtor":
            invoice_ids = [invoice.get("_id") for invoice in _invoice_documents(context) if invoice.get("_id")]
            query = {"$or": [
                _field_filter(("caseId", "recoveryCaseId", "case_id"), _case_ids(context)),
                _field_filter(("invoiceId", "invoice_id"), invoice_ids),
            ]}
        else:
            case_ids = _case_ids(context)
            if not case_ids:
                return []
            query = _field_filter(("caseId", "recoveryCaseId", "case_id"), case_ids)
        docs = _find(db, "evidence_documents", query, sort=("uploadedAt", -1), limit=limit)
        if context["account_type"] in {"agency", "debtor"}:
            docs = [
                item for item in docs
                if _first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
                and any(_same_id(_first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id"), creditor) for creditor in context["creditor_ids"])
            ]
        cases = {str(case.get("_id")): case for case in context["cases"]}
        invoices = {str(invoice.get("_id")): invoice for invoice in _invoice_documents(context)}
        rows = []
        for document in docs:
            case_id = _first(document, "caseId", "case_id")
            case = cases.get(str(case_id), {})
            invoice_id = _first(document, "invoiceId", "invoice_id")
            invoice = invoices.get(str(invoice_id), {})
            rows.append({
                "id": str(document.get("_id", "")),
                "file_name": str(_first(document, "fileName", "name", "file_name", default="Untitled file")),
                "document_type": str(_first(document, "documentType", "type", "document_type", default="Document")),
                "case_id": str(case_id or ""),
                "case_reference": str(_first(case, "caseReference", "caseNumber", "reference", "case_reference", default="")),
                "invoice_id": str(invoice_id or ""),
                "invoice_number": str(_first(invoice, "invoiceNumber", "number", "invoice_number", default="")),
                "uploaded_at": _iso(_first(document, "uploadedAt", "createdAt", "uploaded_at")),
                "scan_status": str(_first(document, "scanStatus", "scan_status", default="Pending")),
                "download_available": bool(_first(document, "storageId", "storage_id")),
            })
        return rows

    def _active_dispute_count(context: dict) -> int:
        case_ids = _case_ids(context)
        if not case_ids:
            return 0
        disputes = _find(db, "disputes", _field_filter(("caseId", "case_id"), case_ids))
        return sum(1 for item in disputes if _normal(_first(item, "status", default="open")) not in {"resolved", "closed", "rejected", "cancelled", "canceled"})

    def _overview(context: dict) -> dict:
        now = datetime.now(timezone.utc)
        invoices = _invoice_documents(context)
        financials = _financials(context, invoices)
        invoice_rows = _invoice_rows(context, invoices, financials, now)
        case_rows = _case_rows(context, invoices, financials)
        case_invoice_map = _case_invoice_map(context)
        task_rows = _task_rows(context, 200)
        active_cases = [
            row for row in case_rows
            if _normal(row["status"]) not in {"resolved", "closed", "cancelled", "canceled", "written off"}
        ]
        active_invoice_rows = [row for row in invoice_rows if row["status"] not in {"Draft", "Cancelled", "Written off", "Settled"}]
        overdue_rows = [row for row in active_invoice_rows if row["status"] == "Overdue"]
        recovered_this_month = _month_money(financials, now.strftime("%Y-%m"))
        today = now.date()
        due_tasks = [
            task for task in task_rows
            if task["status"] not in {"completed", "complete", "done", "cancelled"}
            and _as_datetime(task["due_at"])
            and _as_datetime(task["due_at"]).date() <= today
        ]
        series = []
        for key, _, _ in _month_bounds(6, now):
            year, month = key.split("-")
            series.append({"month": key, "label": f"{month_name[int(month)][:3]} {year[-2:]}", "amount": _month_money(financials, key)})
        collector_ids = _unique([_first(case, "assignedCollectorId", "assignedTo", "assigned_collector_id") for case in context["cases"]])
        active_clients = _unique([_first(item, "creditorOrgId", "creditorOrganizationId", "creditor_org_id") for item in context["engagements"]])
        return {
            "account_type": context["account_type"],
            "metrics": {
                "receivables": _money_by_currency(active_invoice_rows, "outstanding_amount"),
                "overdue_amount": _money_by_currency(overdue_rows, "outstanding_amount"),
                "recovered_this_month": recovered_this_month,
                "active_cases": len(active_cases),
                "overdue_invoices": len(overdue_rows),
                "open_invoices": len(active_invoice_rows),
                "open_disputes": _active_dispute_count(context),
                "tasks_due": len(due_tasks),
                "active_clients": len(active_clients),
                "active_portfolios": len(context["portfolios"]),
                "collectors": len(collector_ids),
            },
            "recovery_series": series,
            "recent_cases": case_rows[:8],
            "priority_tasks": due_tasks[:6],
            "permissions": {
                "create_invoice": context["account_type"] == "creditor" and context["role"] in {"owner", "admin", "creditor finance", "finance"},
                "manage_tasks": context["can_manage"],
            },
        }

    @router.get("/summary")
    def dashboard_summary(context: dict = Depends(get_context)) -> dict:
        return _overview(context)

    @router.get("/cases")
    def list_cases(
        query: str = Query(default="", max_length=120),
        limit: int = Query(default=100, ge=1, le=250),
        context: dict = Depends(get_context),
    ) -> dict:
        invoices = _invoice_documents(context)
        financials = _financials(context, invoices)
        rows = _case_rows(context, invoices, financials)
        if query.strip():
            term = query.strip().lower()
            rows = [row for row in rows if term in f"{row['case_reference']} {row['debtor']} {row['status']}".lower()]
        return {"items": rows[:limit], "total": len(rows)}

    @router.get("/invoices")
    def list_invoices(
        query: str = Query(default="", max_length=120),
        invoice_status: str = Query(default="", alias="status", max_length=40),
        limit: int = Query(default=100, ge=1, le=250),
        context: dict = Depends(get_context),
    ) -> dict:
        now = datetime.now(timezone.utc)
        documents = _invoice_documents(context)
        financials = _financials(context, documents)
        rows = _invoice_rows(context, documents, financials, now)
        if query.strip():
            term = query.strip().lower()
            rows = [row for row in rows if term in f"{row['invoice_number']} {row['client']}".lower()]
        if invoice_status:
            rows = [row for row in rows if row["status"].lower() == invoice_status.lower()]
        return {"items": rows[:limit], "total": len(rows), "can_create": context["account_type"] == "creditor" and context["role"] in {"owner", "admin", "creditor finance", "finance"}}

    @router.get("/payments")
    def list_payments(
        limit: int = Query(default=100, ge=1, le=250),
        context: dict = Depends(get_context),
    ) -> dict:
        invoices = _invoice_documents(context)
        rows = _payment_rows(context, invoices, limit)
        return {"items": rows, "total": len(rows)}

    @router.get("/debtors")
    def list_debtors(context: dict = Depends(get_context)) -> dict:
        if context["account_type"] == "agency":
            debtor_ids = _unique([_first(case, "debtorId", "debtor_id") for case in context["cases"]])
            debtors = _debtor_names(debtor_ids, context)
            invoices = _invoice_documents(context)
            financials = _financials(context, invoices)
            invoice_rows = _invoice_rows(context, invoices, financials, datetime.now(timezone.utc))
            cases_by_debtor: dict[str, list[dict]] = {}
            for case in context["cases"]:
                cases_by_debtor.setdefault(str(_first(case, "debtorId", "debtor_id", default="")), []).append(case)
            invoices_by_debtor: dict[str, list[dict]] = {}
            for row in invoice_rows:
                invoices_by_debtor.setdefault(row["debtor_id"], []).append(row)
            client_names = {
                str(item.get("_id")): str(_first(item, "name", "legalName", "tradeName", default="Client"))
                for item in _find(db, "organizations", _field_filter(("_id",), context["creditor_ids"]))
            }
            items = []
            for debtor_id in debtor_ids:
                debtor = debtors.get(str(debtor_id))
                if not debtor:
                    continue
                related_cases = cases_by_debtor.get(str(debtor_id), [])
                related_invoices = invoices_by_debtor.get(str(debtor_id), [])
                balances: dict[str, Decimal] = {}
                for row in related_invoices:
                    if row["status"] not in {"Settled", "Cancelled", "Written off", "Draft"}:
                        balances[row["currency"]] = balances.get(row["currency"], Decimal("0")) + _decimal(row["outstanding_amount"])
                creditor_id = _first(debtor, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
                items.append({
                    "id": str(debtor_id),
                    "name": str(_first(debtor, "tradeName", "legalName", "name", "trade_name", "legal_name", default="Unnamed debtor")),
                    "email": str(_first(debtor, "email", default="")),
                    "client": client_names.get(str(creditor_id), "Client"),
                    "case_count": len(related_cases),
                    "outstanding_amount": {currency: _money(amount) for currency, amount in sorted(balances.items())},
                })
            items.sort(key=lambda item: item["name"].lower())
            return {"items": items, "total": len(items)}
        if context["account_type"] != "creditor":
            return {"items": []}
        debtors = _find(db, "debtors", _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")), sort=("name", 1), limit=1000)
        return {"items": [{"id": str(item.get("_id", "")), "name": str(_first(item, "tradeName", "legalName", "name", "trade_name", "legal_name", default="Unnamed debtor")), "email": str(_first(item, "email", default=""))} for item in debtors]}

    @router.get("/agency/clients")
    def list_agency_clients(context: dict = Depends(get_context)) -> dict:
        if context["account_type"] != "agency":
            raise HTTPException(status_code=403, detail="Client portfolios are available to an agency workspace.")
        creditor_ids = context["creditor_ids"]
        organizations = {
            str(item.get("_id")): item
            for item in _find(db, "organizations", _field_filter(("_id",), creditor_ids))
        }
        invoices = _invoice_documents(context)
        financials = _financials(context, invoices)
        invoice_rows = _invoice_rows(context, invoices, financials, datetime.now(timezone.utc))
        invoice_by_id = {str(item.get("_id")): item for item in invoices}
        row_by_invoice = {row["id"]: row for row in invoice_rows}
        case_rows = _case_rows(context, invoices, financials)
        case_invoice_map = _case_invoice_map(context)
        cases_by_client: dict[str, list[dict]] = {}
        for case in context["cases"]:
            creditor_id = str(_first(case, "creditorOrgId", "creditorOrganizationId", "creditor_org_id", default=""))
            cases_by_client.setdefault(creditor_id, []).append(case)
        portfolios_by_engagement: dict[str, list[dict]] = {}
        for portfolio in context["portfolios"]:
            engagement_id = str(_first(portfolio, "clientEngagementId", "engagementId", "client_engagement_id", "engagement_id", default=""))
            portfolios_by_engagement.setdefault(engagement_id, []).append(portfolio)
        items = []
        for engagement in context["engagements"]:
            creditor_id = _first(engagement, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
            if not creditor_id:
                continue
            client = organizations.get(str(creditor_id), {})
            engagement_id = str(engagement.get("_id", ""))
            related_cases = cases_by_client.get(str(creditor_id), [])
            related_case_rows = [row for row in case_rows if row["client_id"] == str(creditor_id)]
            active_cases = sum(1 for case in related_cases if _normal(_first(case, "lifecycleStatus", "status", "workflowStage", default="open")) not in {"resolved", "closed", "cancelled", "canceled", "written off"})
            balances: dict[str, Decimal] = {}
            invoice_ids = _unique(
                invoice_id
                for case in related_cases
                for invoice_id in case_invoice_map.get(str(case.get("_id")), [])
            )
            for invoice_id in invoice_ids:
                invoice = invoice_by_id.get(str(invoice_id))
                row = row_by_invoice.get(str(invoice_id))
                if not invoice or not row or row["status"] in {"Settled", "Cancelled", "Written off", "Draft"}:
                    continue
                currency = row["currency"]
                balances[currency] = balances.get(currency, Decimal("0")) + _decimal(row["outstanding_amount"])
            linked_portfolios = portfolios_by_engagement.get(engagement_id, [])
            if not linked_portfolios:
                linked_ids = _id_values(_first(engagement, "portfolioIds", "portfolio_ids", default=[]))
                linked_ids.extend(_id_values(_first(engagement, "portfolioId", "portfolio_id")))
                linked_portfolios = [portfolio for portfolio in context["portfolios"] if any(_same_id(portfolio.get("_id"), item) for item in linked_ids)]
            items.append({
                "id": str(engagement.get("_id", "")),
                "client_id": str(creditor_id),
                "name": str(_first(client, "name", "legalName", "tradeName", default=_first(engagement, "name", default="Client engagement"))),
                "status": str(_first(engagement, "status", default="active")),
                "start_date": _iso(_first(engagement, "startAt", "startDate", "createdAt")),
                "active_cases": active_cases,
                "outstanding_amount": {currency: _money(amount) for currency, amount in sorted(balances.items())},
                "portfolios": [{"id": str(item.get("_id", "")), "name": str(_first(item, "name", "portfolioName", default="Portfolio")), "status": str(_first(item, "status", default="active"))} for item in linked_portfolios],
                "cases": len(related_case_rows),
            })
        items.sort(key=lambda item: item["name"].lower())
        return {"items": items, "total": len(items)}

    @router.get("/agency/team")
    def agency_team(context: dict = Depends(get_context)) -> dict:
        if context["account_type"] != "agency":
            raise HTTPException(status_code=403, detail="Collector workload is available to an agency workspace.")
        invoices = _invoice_documents(context)
        financials = _financials(context, invoices)
        rows = _case_rows(context, invoices, financials)
        cases = {str(item.get("_id")): item for item in context["cases"]}
        grouped: dict[str, dict] = {}
        for row in rows:
            case = cases.get(row["id"], {})
            collector_id = str(_first(case, "assignedCollectorId", "assignedTo", "assigneeUserId", "assigned_collector_id", default=""))
            name = row["assigned_collector"].strip() or "Unassigned"
            key = collector_id or name.lower()
            entry = grouped.setdefault(key, {"id": key, "name": name, "active_cases": 0, "case_count": 0, "outstanding": {}})
            entry["case_count"] += 1
            if _normal(row["status"]) not in {"resolved", "closed", "cancelled", "canceled", "written off"}:
                entry["active_cases"] += 1
                for currency, amount in (row["outstanding_amount"] or {}).items():
                    entry["outstanding"][currency] = entry["outstanding"].get(currency, Decimal("0")) + _decimal(amount)
        items = [{**entry, "outstanding_amount": {currency: _money(amount) for currency, amount in sorted(entry["outstanding"].items())}} for entry in grouped.values()]
        items.sort(key=lambda item: (-item["active_cases"], item["name"].lower()))
        return {"items": items, "total": len(items)}

    @router.get("/promises")
    def list_promises(context: dict = Depends(get_context)) -> dict:
        if context["account_type"] not in {"creditor", "agency"}:
            raise HTTPException(status_code=403, detail="Promises are available to creditor and agency workspaces.")
        case_ids = _case_ids(context)
        if not case_ids:
            return {"items": [], "total": 0}
        promises = _find(db, "promises", _field_filter(("caseId", "case_id", "recoveryCaseId"), case_ids), sort=("dueDate", 1), limit=250)
        cases = {str(item.get("_id")): item for item in context["cases"]}
        invoices = _invoice_documents(context)
        invoice_by_id = {str(item.get("_id")): item for item in invoices}
        debtor_ids = [_first(case, "debtorId", "debtor_id") for case in context["cases"]]
        debtors = _debtor_names(debtor_ids, context)
        client_names = {str(item.get("_id")): str(_first(item, "name", "legalName", "tradeName", default="Client")) for item in _find(db, "organizations", _field_filter(("_id",), context["creditor_ids"]))}
        items = []
        for promise in promises:
            case_id = _first(promise, "caseId", "case_id", "recoveryCaseId")
            case = cases.get(str(case_id))
            if not case:
                continue
            invoice = invoice_by_id.get(str(_first(promise, "invoiceId", "invoice_id")), {})
            debtor_id = _first(case, "debtorId", "debtor_id")
            creditor_id = _first(case, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
            items.append({
                "id": str(promise.get("_id", "")),
                "case_reference": str(_first(case, "caseReference", "caseNumber", "reference", default="")),
                "debtor": str(_first(debtors.get(str(debtor_id), {}), "tradeName", "legalName", "name", default="Unknown debtor")),
                "client": client_names.get(str(creditor_id), "Client"),
                "invoice_number": str(_first(invoice, "invoiceNumber", "number", default="")),
                "amount": _money(_first(promise, "amount", "installmentAmount", "installment_amount")),
                "currency": str(_first(promise, "currency", default=_currency(invoice))).upper(),
                "due_date": _iso(_first(promise, "dueDate", "due_date", "promisedDate")),
                "status": str(_first(promise, "status", default="scheduled")),
            })
        return {"items": items, "total": len(items)}

    @router.get("/disputes")
    def list_disputes(context: dict = Depends(get_context)) -> dict:
        if context["account_type"] not in {"creditor", "agency"}:
            raise HTTPException(status_code=403, detail="Disputes are available to creditor and agency workspaces.")
        case_ids = _case_ids(context)
        if not case_ids:
            return {"items": [], "total": 0}
        disputes = _find(db, "disputes", _field_filter(("caseId", "case_id"), case_ids), sort=("openedAt", -1), limit=250)
        cases = {str(item.get("_id")): item for item in context["cases"]}
        invoices = _invoice_documents(context)
        invoice_by_id = {str(item.get("_id")): item for item in invoices}
        debtors = _debtor_names([_first(case, "debtorId", "debtor_id") for case in context["cases"]], context)
        client_names = {str(item.get("_id")): str(_first(item, "name", "legalName", "tradeName", default="Client")) for item in _find(db, "organizations", _field_filter(("_id",), context["creditor_ids"]))}
        items = []
        for dispute in disputes:
            case_id = _first(dispute, "caseId", "case_id")
            case = cases.get(str(case_id))
            if not case:
                continue
            invoice_id = _first(dispute, "invoiceId", "invoice_id")
            debtor_id = _first(case, "debtorId", "debtor_id")
            creditor_id = _first(case, "creditorOrgId", "creditorOrganizationId", "creditor_org_id")
            items.append({
                "id": str(dispute.get("_id", "")),
                "reference": str(_first(dispute, "disputeReference", "reference", default=f"DSP-{str(dispute.get('_id', ''))[-6:].upper()}")),
                "subject": str(_first(dispute, "subject", "reason", "issue", "description", default="Invoice dispute")),
                "client": client_names.get(str(creditor_id), "Client"),
                "debtor": str(_first(debtors.get(str(debtor_id), {}), "tradeName", "legalName", "name", default="Unknown debtor")),
                "case_reference": str(_first(case, "caseReference", "caseNumber", "reference", default="")),
                "invoice_number": str(_first(invoice_by_id.get(str(invoice_id), {}), "invoiceNumber", "number", default="")),
                "opened_at": _iso(_first(dispute, "openedAt", "createdAt", "opened_at")),
                "status": str(_first(dispute, "status", default="open")),
            })
        return {"items": items, "total": len(items)}

    @router.post("/invoices", status_code=status.HTTP_201_CREATED)
    def create_invoice(payload: InvoiceCreateRequest, context: dict = Depends(get_context)) -> dict:
        if context["platform_admin"] or context["account_type"] != "creditor" or context["role"] not in {"owner", "admin", "creditor finance", "finance"}:
            raise HTTPException(status_code=403, detail="Only an authorised creditor finance user can create invoices.")
        if payload.due_date < payload.issue_date:
            raise HTTPException(status_code=422, detail="The due date must be on or after the invoice date.")
        debtor_id = _object_id(payload.debtor_id)
        debtor = db.debtors.find_one(_combine(
            _field_filter(("_id",), [debtor_id]),
            _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
        ))
        if not debtor:
            raise HTTPException(status_code=404, detail="The selected debtor is not in this creditor workspace.")
        invoice_number = payload.invoice_number.strip()
        if db.invoices.find_one(_combine(
            _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
            {"invoiceNumber": {"$regex": f"^{re.escape(invoice_number)}$", "$options": "i"}},
        )):
            raise HTTPException(status_code=409, detail="That invoice number already exists in this workspace.")
        now = datetime.now(timezone.utc)
        document = {
            "creditorOrgId": context["org_id"],
            "debtorId": debtor["_id"],
            "invoiceNumber": invoice_number,
            "issueDate": datetime.combine(payload.issue_date, time.min, tzinfo=timezone.utc),
            "dueDate": datetime.combine(payload.due_date, time.min, tzinfo=timezone.utc),
            "currency": payload.currency.upper(),
            "originalAmount": Decimal128(payload.original_amount),
            "invoiceStatus": "open",
            "createdBy": context["user"]["_id"],
            "createdAt": now,
            "updatedAt": now,
        }
        try:
            result = db.invoices.insert_one(document)
        except DuplicateKeyError as exc:
            raise HTTPException(status_code=409, detail="That invoice number already exists in this workspace.") from exc
        try:
            db.audit_events.insert_one({
                "organizationId": context["org_id"], "actorUserId": context["user"]["_id"],
                "action": "invoice.created", "resourceType": "invoice", "resourceId": result.inserted_id,
                "createdAt": now,
            })
        except PyMongoError:
            pass
        created = {**document, "_id": result.inserted_id}
        financials = _financials(context, [created])
        row = _invoice_rows(context, [created], financials, now)[0]
        row["client"] = str(_first(debtor, "tradeName", "legalName", "name", "trade_name", "legal_name", default="Unnamed debtor"))
        return row

    @router.get("/tasks")
    def list_tasks(
        status_filter: str = Query(default="", alias="status", max_length=40),
        limit: int = Query(default=100, ge=1, le=250),
        context: dict = Depends(get_context),
    ) -> dict:
        rows = _task_rows(context, limit)
        if status_filter:
            rows = [row for row in rows if row["status"] == status_filter.lower()]
        return {"items": rows, "total": len(rows)}

    @router.patch("/tasks/{task_id}")
    def update_task(task_id: str, payload: TaskActionRequest, context: dict = Depends(get_context)) -> dict:
        if context["platform_admin"] or context["account_type"] == "debtor":
            raise HTTPException(status_code=403, detail="Read-only admin and debtor dashboards cannot update recovery tasks.")
        if not ObjectId.is_valid(task_id):
            raise HTTPException(status_code=404, detail="Task not found.")
        task_query = _combine(_field_filter(("_id",), [ObjectId(task_id)]), _task_query(context))
        task = db.tasks.find_one(task_query)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found in this workspace.")
        assignee = _first(task, "assignedTo", "assigneeUserId", "assignedToUserId", "assignee_user_id")
        if not context["can_manage"] and not _same_id(assignee, context["user"]["_id"]):
            raise HTTPException(status_code=403, detail="Only the task assignee or an authorised manager can update this task.")
        if _normal(_first(task, "status", default="open")) in {"completed", "complete", "done", "cancelled", "canceled"}:
            raise HTTPException(status_code=409, detail="This task is already closed.")
        now = datetime.now(timezone.utc)
        if payload.action == "complete":
            update = {"$set": {"status": "completed", "completedAt": now, "updatedAt": now}}
        else:
            due_key = next((key for key in ("dueAt", "dueDate", "due_at", "due_date") if key in task), "dueAt")
            due = _as_datetime(task.get(due_key)) or now
            next_due = max(due, now) + timedelta(days=1)
            update = {"$set": {"status": "open", due_key: next_due, "deferredAt": now, "updatedAt": now}}
        db.tasks.update_one({"_id": task["_id"]}, update)
        try:
            db.audit_events.insert_one({
                "organizationId": context["org_id"], "actorUserId": context["user"]["_id"],
                "action": f"task.{payload.action}d" if payload.action == "complete" else "task.deferred",
                "resourceType": "task", "resourceId": task["_id"], "createdAt": now,
            })
        except PyMongoError:
            pass
        return {"ok": True, "id": str(task["_id"]), "status": "completed" if payload.action == "complete" else "open"}

    @router.get("/documents")
    def list_documents(
        query: str = Query(default="", max_length=120),
        limit: int = Query(default=100, ge=1, le=250),
        context: dict = Depends(get_context),
    ) -> dict:
        rows = _document_rows(context, limit)
        if query.strip():
            term = query.strip().lower()
            rows = [row for row in rows if term in f"{row['file_name']} {row['document_type']} {row['case_reference']}".lower()]
        return {"items": rows, "total": len(rows)}

    def _require_debtor(context: dict, *, write: bool = False) -> None:
        if context["account_type"] != "debtor":
            raise HTTPException(status_code=403, detail="This action is available to a debtor portal account.")
        if write and context["platform_admin"]:
            raise HTTPException(status_code=403, detail="Platform admin access is read-only.")

    def _debtor_invoice(context: dict, invoice_ref: str) -> dict:
        if not ObjectId.is_valid(invoice_ref):
            raise HTTPException(status_code=404, detail="Invoice not found in your account.")
        invoice = next((item for item in _invoice_documents(context) if _same_id(item.get("_id"), invoice_ref)), None)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found in your account.")
        return invoice

    def _case_id_for_invoice(context: dict, invoice: dict) -> Any:
        case_ids = _case_ids(context)
        linked_case = _first(invoice, "caseId", "recoveryCaseId", "case_id")
        if linked_case and any(_same_id(linked_case, case_id) for case_id in case_ids):
            return linked_case
        if case_ids and _collection_exists(db, "case_invoices"):
            relation = db.case_invoices.find_one(_combine(
                _field_filter(("invoiceId", "invoice_id"), [invoice["_id"]]),
                _field_filter(("caseId", "case_id", "recoveryCaseId"), case_ids),
            ))
            if relation:
                candidate = _first(relation, "caseId", "case_id", "recoveryCaseId")
                if any(_same_id(candidate, case_id) for case_id in case_ids):
                    return candidate
        return None

    @router.get("/debtor/payment-plans")
    def debtor_payment_plans(context: dict = Depends(get_context)) -> dict:
        _require_debtor(context)
        invoices = _invoice_documents(context)
        invoice_by_id = {str(item.get("_id")): item for item in invoices}
        case_ids = _case_ids(context)
        promise_terms = [_field_filter(("debtorId", "debtor_id"), [context["debtor_id"]])]
        if case_ids:
            promise_terms.append(_field_filter(("caseId", "case_id", "recoveryCaseId"), case_ids))
        promises = _find(db, "promises", {"$or": promise_terms}, sort=("dueDate", 1), limit=250)
        rows = []
        for promise in promises:
            invoice_id = _first(promise, "invoiceId", "invoice_id")
            case_id = _first(promise, "caseId", "case_id", "recoveryCaseId")
            invoice = invoice_by_id.get(str(invoice_id), {})
            if invoice_id and not invoice:
                continue
            if not invoice and case_id:
                linked = _case_invoice_map(context).get(str(case_id), [])
                invoice = invoice_by_id.get(str(linked[0]), {}) if linked else {}
            rows.append({
                "id": str(promise.get("_id", "")),
                "invoice_number": str(_first(invoice, "invoiceNumber", "number", "invoice_number", default="")),
                "amount": _money(_first(promise, "amount", "installmentAmount", "installment_amount")),
                "currency": str(_first(promise, "currency", default=_currency(invoice))).upper(),
                "due_date": _iso(_first(promise, "dueDate", "due_date", "promisedDate")),
                "installment_number": _first(promise, "installmentNumber", "installment_number"),
                "status": str(_first(promise, "status", default="scheduled")),
            })
        request_query = _combine(
            _field_filter(("debtorId", "debtor_id"), [context["debtor_id"]]),
            _org_filter(context["org_id"], ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
        )
        requests = _find(db, "payment_plan_requests", request_query, sort=("createdAt", -1), limit=250)
        request_rows = []
        for item in requests:
            invoice = invoice_by_id.get(str(_first(item, "invoiceId", "invoice_id")))
            if not invoice:
                continue
            request_rows.append({
                "id": str(item.get("_id", "")),
                "invoice_number": str(_first(invoice, "invoiceNumber", "number", "invoice_number", default="")),
                "installment_count": int(_first(item, "installmentCount", "installment_count", default=0)),
                "first_payment_date": _iso(_first(item, "firstPaymentDate", "first_payment_date")),
                "note": str(_first(item, "note", default="")),
                "status": str(_first(item, "status", default="pending review")),
            })
        return {"items": rows, "requests": request_rows}

    @router.post("/debtor/payment-plans", status_code=status.HTTP_201_CREATED)
    def request_debtor_payment_plan(payload: DebtorPaymentPlanRequest, context: dict = Depends(get_context)) -> dict:
        _require_debtor(context, write=True)
        invoice = _debtor_invoice(context, payload.invoice_id)
        now = datetime.now(timezone.utc)
        if payload.first_payment_date < now.date() or payload.first_payment_date > (now + timedelta(days=365)).date():
            raise HTTPException(status_code=422, detail="Choose a first payment date within the next 12 months.")
        financials = _financials(context, [invoice])
        balance = financials["balances"].get(str(invoice["_id"]), Decimal("0"))
        if balance <= 0 or _normal(_first(invoice, "invoiceStatus", "status")) in {"draft", "cancelled", "canceled", "void", "written off"}:
            raise HTTPException(status_code=409, detail="This invoice does not have an outstanding balance to plan.")
        document = {
            "creditorOrgId": context["org_id"], "debtorId": context["debtor_id"], "invoiceId": invoice["_id"],
            "caseId": _case_id_for_invoice(context, invoice), "requestedAmount": Decimal128(balance),
            "currency": _currency(invoice), "installmentCount": payload.installment_count,
            "firstPaymentDate": datetime.combine(payload.first_payment_date, time.min, tzinfo=timezone.utc),
            "note": payload.note.strip(), "status": "pending review", "createdBy": context["user"]["_id"],
            "createdAt": now, "updatedAt": now,
        }
        result = db.payment_plan_requests.insert_one(document)
        try:
            db.audit_events.insert_one({"organizationId": context["org_id"], "actorUserId": context["user"]["_id"], "action": "debtor.payment_plan_requested", "resourceType": "payment_plan_request", "resourceId": result.inserted_id, "createdAt": now})
        except PyMongoError:
            pass
        return {"id": str(result.inserted_id), "status": document["status"]}

    @router.get("/debtor/disputes")
    def debtor_disputes(context: dict = Depends(get_context)) -> dict:
        _require_debtor(context)
        invoices = _invoice_documents(context)
        invoice_by_id = {str(item.get("_id")): item for item in invoices}
        terms = [_field_filter(("debtorId", "debtor_id"), [context["debtor_id"]])]
        if _case_ids(context):
            terms.append(_field_filter(("caseId", "case_id", "recoveryCaseId"), _case_ids(context)))
        if invoices:
            terms.append(_field_filter(("invoiceId", "invoice_id"), [item["_id"] for item in invoices]))
        disputes = _find(db, "disputes", {"$or": terms}, sort=("openedAt", -1), limit=500)
        rows = []
        allowed_case_ids = _case_ids(context)
        for item in disputes:
            invoice_id = _first(item, "invoiceId", "invoice_id")
            case_id = _first(item, "caseId", "case_id", "recoveryCaseId")
            debtor_id = _first(item, "debtorId", "debtor_id")
            if invoice_id and str(invoice_id) not in invoice_by_id:
                continue
            if case_id and not any(_same_id(case_id, allowed) for allowed in allowed_case_ids):
                continue
            if debtor_id and not _same_id(debtor_id, context["debtor_id"]):
                continue
            rows.append({
                "id": str(item.get("_id", "")),
                "invoice_number": str(_first(invoice_by_id.get(str(invoice_id), {}), "invoiceNumber", "number", "invoice_number", default="")),
                "reason": str(_first(item, "reason", "category", default="Invoice dispute")),
                "details": str(_first(item, "details", "description", "message", default="")),
                "status": str(_first(item, "status", default="open")),
                "opened_at": _iso(_first(item, "openedAt", "createdAt", "opened_at")),
            })
        rows.sort(key=lambda item: item["opened_at"] or "", reverse=True)
        return {"items": rows, "total": len(rows)}

    @router.post("/debtor/disputes", status_code=status.HTTP_201_CREATED)
    def create_debtor_dispute(payload: DebtorDisputeRequest, context: dict = Depends(get_context)) -> dict:
        _require_debtor(context, write=True)
        invoice = _debtor_invoice(context, payload.invoice_id)
        if _normal(_first(invoice, "invoiceStatus", "status")) in {"draft", "cancelled", "canceled", "void", "written off"}:
            raise HTTPException(status_code=409, detail="This invoice is not available for dispute review.")
        now = datetime.now(timezone.utc)
        document = {
            "creditorOrgId": context["org_id"], "debtorId": context["debtor_id"], "invoiceId": invoice["_id"],
            "caseId": _case_id_for_invoice(context, invoice), "reason": payload.reason.strip(), "details": payload.details.strip(),
            "status": "open", "openedAt": now, "createdAt": now, "updatedAt": now, "createdBy": context["user"]["_id"],
        }
        result = db.disputes.insert_one(document)
        try:
            db.audit_events.insert_one({"organizationId": context["org_id"], "actorUserId": context["user"]["_id"], "action": "debtor.dispute_created", "resourceType": "dispute", "resourceId": result.inserted_id, "createdAt": now})
        except PyMongoError:
            pass
        return {"id": str(result.inserted_id), "status": document["status"]}

    @router.get("/debtor/messages")
    def debtor_messages(context: dict = Depends(get_context)) -> dict:
        _require_debtor(context)
        invoices = _invoice_documents(context)
        invoice_by_id = {str(item.get("_id")): item for item in invoices}
        terms = [_field_filter(("debtorId", "debtor_id"), [context["debtor_id"]])]
        if _case_ids(context):
            terms.append(_field_filter(("caseId", "case_id", "recoveryCaseId"), _case_ids(context)))
        if invoices:
            terms.append(_field_filter(("invoiceId", "invoice_id"), [item["_id"] for item in invoices]))
        messages = _find(db, "communications", {"$or": terms}, sort=("createdAt", 1), limit=500)
        allowed_cases = _case_ids(context)
        rows = []
        for item in messages:
            debtor_id = _first(item, "debtorId", "debtor_id")
            invoice_id = _first(item, "invoiceId", "invoice_id")
            case_id = _first(item, "caseId", "case_id", "recoveryCaseId")
            if debtor_id and not _same_id(debtor_id, context["debtor_id"]):
                continue
            if invoice_id and str(invoice_id) not in invoice_by_id:
                continue
            if case_id and not any(_same_id(case_id, allowed) for allowed in allowed_cases):
                continue
            sender_id = _first(item, "senderUserId", "authorUserId", "createdBy", "userId")
            sender_type = _normal(_first(item, "senderType", "authorType", "direction", default=""))
            if sender_type not in {"debtor", "creditor", "agency", "system"}:
                sender_type = "debtor" if _same_id(sender_id, context["user"]["_id"]) else "creditor"
            rows.append({
                "id": str(item.get("_id", "")), "subject": str(_first(item, "subject", "title", default="Account support")),
                "message": str(_first(item, "message", "body", "content", default="")), "sender_type": sender_type,
                "sender_name": str(_first(item, "senderName", "authorName", "createdByName", default="")),
                "invoice_number": str(_first(invoice_by_id.get(str(invoice_id), {}), "invoiceNumber", "number", "invoice_number", default="")),
                "created_at": _iso(_first(item, "createdAt", "sentAt", "created_at")),
            })
        rows.sort(key=lambda item: item["created_at"] or "")
        return {"items": rows, "total": len(rows)}

    @router.post("/debtor/messages", status_code=status.HTTP_201_CREATED)
    def create_debtor_message(payload: DebtorMessageRequest, context: dict = Depends(get_context)) -> dict:
        _require_debtor(context, write=True)
        invoice = _debtor_invoice(context, payload.invoice_id) if payload.invoice_id.strip() else None
        now = datetime.now(timezone.utc)
        user_name = str(_first(context["user"], "fullName", "full_name", default="Debtor"))
        document = {
            "creditorOrgId": context["org_id"], "debtorId": context["debtor_id"],
            "invoiceId": invoice["_id"] if invoice else None,
            "caseId": _case_id_for_invoice(context, invoice) if invoice else None,
            "subject": payload.subject.strip(), "message": payload.message.strip(), "senderType": "debtor",
            "senderUserId": context["user"]["_id"], "senderName": user_name, "status": "open",
            "createdAt": now, "updatedAt": now,
        }
        result = db.communications.insert_one(document)
        try:
            db.audit_events.insert_one({"organizationId": context["org_id"], "actorUserId": context["user"]["_id"], "action": "debtor.support_message_sent", "resourceType": "communication", "resourceId": result.inserted_id, "createdAt": now})
        except PyMongoError:
            pass
        return {"id": str(result.inserted_id), "status": "sent"}

    @router.post("/debtor/documents", status_code=status.HTTP_201_CREATED)
    async def upload_debtor_document(
        file: UploadFile = File(...),
        document_type: str = Form(default="supporting_document", max_length=40),
        invoice_id: str = Form(default="", max_length=80),
        context: dict = Depends(get_context),
    ) -> dict:
        _require_debtor(context, write=True)
        allowed_types = {"payment_receipt", "supporting_document", "dispute_evidence"}
        if document_type not in allowed_types:
            raise HTTPException(status_code=422, detail="Choose a supported document type.")
        invoice = _debtor_invoice(context, invoice_id) if invoice_id.strip() else None
        content = await file.read(8 * 1024 * 1024 + 1)
        if not content or len(content) > 8 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Choose a file from 1 byte to 8 MB.")
        if content.startswith(b"%PDF-"):
            content_type = "application/pdf"
            extension = ".pdf"
        elif content.startswith(b"\x89PNG\r\n\x1a\n"):
            content_type = "image/png"
            extension = ".png"
        elif content.startswith(b"\xff\xd8\xff"):
            content_type = "image/jpeg"
            extension = ".jpg"
        else:
            raise HTTPException(status_code=415, detail="Upload a valid PDF, PNG or JPEG document.")
        original_name = (file.filename or f"{document_type}{extension}").replace("\\", "/").split("/")[-1]
        safe_name = re.sub(r"[^A-Za-z0-9._ ()-]", "_", original_name).strip(" .")[:160] or f"{document_type}{extension}"
        now = datetime.now(timezone.utc)
        bucket = GridFSBucket(db, bucket_name="dashboard_uploads")
        try:
            storage_id = bucket.upload_from_stream(safe_name, content, metadata={
                "contentType": content_type, "debtorId": context["debtor_id"],
                "creditorOrgId": context["org_id"], "uploadedAt": now,
            })
            case_id = _case_id_for_invoice(context, invoice) if invoice else None
            record = {
                "creditorOrgId": context["org_id"], "debtorId": context["debtor_id"],
                "invoiceId": invoice["_id"] if invoice else None, "caseId": case_id,
                "fileName": safe_name, "documentType": document_type, "mimeType": content_type,
                "storageId": storage_id, "uploadedBy": context["user"]["_id"],
                "scanStatus": "pending review", "uploadedAt": now, "createdAt": now,
            }
            result = db.evidence_documents.insert_one(record)
        except PyMongoError as exc:
            raise HTTPException(status_code=503, detail="The document could not be stored. Try again shortly.") from exc
        try:
            db.audit_events.insert_one({"organizationId": context["org_id"], "actorUserId": context["user"]["_id"], "action": "debtor.document_uploaded", "resourceType": "evidence_document", "resourceId": result.inserted_id, "createdAt": now})
        except PyMongoError:
            pass
        return {"id": str(result.inserted_id), "file_name": safe_name, "document_type": document_type, "uploaded_at": now.isoformat(), "scan_status": "pending review"}

    @router.get("/documents/{document_id}/download")
    def download_dashboard_document(document_id: str, context: dict = Depends(get_context)) -> StreamingResponse:
        if not ObjectId.is_valid(document_id):
            raise HTTPException(status_code=404, detail="Document not found.")
        permitted = {item["id"] for item in _document_rows(context, MAX_DASHBOARD_RECORDS)}
        if document_id not in permitted:
            raise HTTPException(status_code=404, detail="Document not found in your authorised account.")
        document = db.evidence_documents.find_one({"_id": ObjectId(document_id)})
        storage_id = _first(document, "storageId", "storage_id")
        if not storage_id:
            raise HTTPException(status_code=404, detail="This document has no stored file available to download.")
        try:
            stream = GridFSBucket(db, bucket_name="dashboard_uploads").open_download_stream(storage_id)
            content = stream.read()
        except NoFile as exc:
            raise HTTPException(status_code=404, detail="The stored file could not be found.") from exc
        except PyMongoError as exc:
            raise HTTPException(status_code=503, detail="The stored file is temporarily unavailable.") from exc
        filename = str(_first(document, "fileName", "name", default="collectflow-document"))
        ascii_name = re.sub(r"[^A-Za-z0-9._-]", "_", filename)[:120] or "collectflow-document"
        content_type = str(_first(document, "mimeType", default="application/octet-stream"))
        return StreamingResponse(
            BytesIO(content), media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(filename)}",
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, no-store",
            },
        )

    @router.get("/reports/recovery")
    def recovery_report(
        months: int = Query(default=6, ge=3, le=12),
        context: dict = Depends(get_context),
    ) -> dict:
        now = datetime.now(timezone.utc)
        invoices = _invoice_documents(context)
        financials = _financials(context, invoices)
        series = []
        for key, _, _ in _month_bounds(months, now):
            year, month = key.split("-")
            series.append({"month": key, "label": f"{month_name[int(month)][:3]} {year[-2:]}", "recovered": _month_money(financials, key)})
        totals: dict[str, Decimal] = {}
        for item in series:
            for currency, amount in item["recovered"].items():
                totals[currency] = totals.get(currency, Decimal("0")) + _decimal(amount)
        return {"series": series, "total_recovered": {currency: _money(amount) for currency, amount in sorted(totals.items())}}

    def require_platform_admin(user: dict = Depends(get_current_user)) -> dict:
        if user.get("platformAdmin") is not True:
            raise HTTPException(status_code=403, detail="Platform admin access is required.")
        return user

    def record_admin_directory_read(user: dict, request: Request, resource_type: str, org_id: Any = None) -> None:
        try:
            db.audit_events.insert_one({
                "organizationId": org_id,
                "actorUserId": user["_id"],
                "action": "platform_admin.directory_read",
                "resourceType": resource_type,
                "createdAt": datetime.now(timezone.utc),
                "metadata": {"path": request.url.path},
            })
        except PyMongoError as exc:
            raise HTTPException(status_code=503, detail="Admin access could not be audited; try again shortly.") from exc

    @router.get("/admin/workspaces")
    def admin_workspaces(
        request: Request,
        account_type: str = Query(default="", alias="type", max_length=20),
        user: dict = Depends(require_platform_admin),
    ) -> dict:
        query: dict[str, Any] = {"status": {"$in": ["active", "ACTIVE"]}}
        if account_type:
            normalized_type = _normal(account_type)
            if normalized_type not in {"creditor", "agency"}:
                raise HTTPException(status_code=422, detail="Workspace type must be creditor or agency.")
            query["organizationType"] = normalized_type
        record_admin_directory_read(user, request, "workspace_directory")
        organizations = _find(db, "organizations", query, sort=("name", 1), limit=2000)
        return {"items": [{
            "id": str(item.get("_id", "")),
            "name": str(_first(item, "name", default="Unnamed workspace")),
            "account_type": _normal(_first(item, "organizationType", "organization_type")),
        } for item in organizations]}

    @router.get("/admin/debtors")
    def admin_debtors(
        request: Request,
        organization_id: str = Query(min_length=24, max_length=24),
        user: dict = Depends(require_platform_admin),
    ) -> dict:
        if not ObjectId.is_valid(organization_id):
            raise HTTPException(status_code=404, detail="Creditor workspace not found.")
        org_id = ObjectId(organization_id)
        organization = db.organizations.find_one({"_id": org_id, "organizationType": "creditor", "status": {"$in": ["active", "ACTIVE"]}})
        if not organization:
            raise HTTPException(status_code=404, detail="Creditor workspace not found.")
        record_admin_directory_read(user, request, "debtor_directory", org_id)
        debtors = _find(
            db,
            "debtors",
            _combine(
                _org_filter(org_id, ("creditorOrgId", "creditorOrganizationId", "creditor_org_id")),
                {"portalStatus": {"$in": ["active", "ACTIVE"]}},
                {"portalUserId": {"$exists": True, "$ne": None}},
            ),
            sort=("name", 1),
            limit=2000,
        )
        return {"items": [{
            "id": str(item.get("_id", "")),
            "name": str(_first(item, "tradeName", "legalName", "name", "trade_name", "legal_name", default="Unnamed debtor")),
            "email": str(_first(item, "email", default="")),
        } for item in debtors]}

    return router
