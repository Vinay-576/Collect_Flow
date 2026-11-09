// ============================================
// COLLECTFLOW - MONGODB DATABASE INITIALIZATION
// ============================================

const DB_NAME = "collectflow";
const cf = db.getSiblingDB(DB_NAME);

print("==================================");
print("   COLLECTFLOW DATABASE SETUP");
print("==================================");

// Create collections safely
const collections = [
    "organizations",
    "users",
    "workspaces",
    "memberships",
    "client_engagements",
    "portfolios",
    "engagement_portfolio_grants",
    "agency_case_assignments",
    "case_access_grants",
    "debtors",
    "invoices",
    "invoice_adjustments",
    "debt_cases",
    "case_invoices",
    "evidence_documents",
    "disputes",
    "payments",
    "payment_allocations",
    "promises",
    "payment_plan_requests",
    "tasks",
    "communications",
    "ai_recommendations",
    "audit_events",
    "notifications",
    "integration_connections",
    "import_jobs",
    "auth_otps"
];

collections.forEach(name => {
    if (!cf.getCollectionNames().includes(name)) {
        cf.createCollection(name);
        print("Created: " + name);
    } else {
        print("Already exists: " + name);
    }
});

// ============================================
// INDEXES
// ============================================

// Organizations
cf.organizations.createIndex({ slug: 1 }, { unique: true });
cf.organizations.createIndex({ organizationType: 1 });

// Users
cf.users.createIndex({ email: 1 }, { unique: true });
cf.users.createIndex({ status: 1 });
cf.users.createIndex({ platformAdmin: 1 });

// Workspaces
cf.workspaces.createIndex({ organizationId: 1 });
cf.workspaces.createIndex({ slug: 1 }, { unique: true });

// Memberships
cf.memberships.createIndex(
    { workspaceId: 1, userId: 1 },
    { unique: true }
);
cf.memberships.createIndex({ organizationId: 1 });

// Client engagements
cf.client_engagements.createIndex({ creditorOrgId: 1 });
cf.client_engagements.createIndex({ agencyOrgId: 1 });
cf.client_engagements.createIndex({ status: 1 });

// Portfolios
cf.portfolios.createIndex({ creditorOrgId: 1 });
cf.portfolios.createIndex({ agencyOrgId: 1 });
cf.portfolios.createIndex({ clientEngagementId: 1 });

// Engagement grants and agency assignments
cf.engagement_portfolio_grants.createIndex(
    { engagementId: 1, portfolioId: 1 },
    { unique: true, name: "uq_engagement_portfolio_grant" }
);
cf.agency_case_assignments.createIndex(
    { agencyOrgId: 1, assignedCollectorUserId: 1, assignmentStatus: 1 },
    { name: "ix_agency_collector_assignments" }
);
cf.agency_case_assignments.createIndex({ caseId: 1, assignmentStatus: 1 });
cf.case_access_grants.createIndex(
    { granteeOrgId: 1, resourceType: 1, resourceId: 1, revokedAt: 1 },
    { name: "ix_active_case_access_grants" }
);

// Debtors
cf.debtors.createIndex({ creditorOrgId: 1 });
cf.debtors.createIndex({ name: 1 });
cf.debtors.createIndex({ portalUserId: 1 });
cf.debtors.createIndex({ portalStatus: 1 });

// Invoices
cf.invoices.createIndex({ creditorOrgId: 1 });
cf.invoices.createIndex({ debtorId: 1 });
cf.invoices.createIndex(
    { creditorOrgId: 1, invoiceNumber: 1 },
    { unique: true }
);
cf.invoices.createIndex({ dueDate: 1 });

// Invoice adjustments and case-to-invoice links
cf.invoice_adjustments.createIndex({ invoiceId: 1, status: 1 });
cf.case_invoices.createIndex(
    { caseId: 1, invoiceId: 1 },
    { unique: true, name: "uq_case_invoice_link" }
);
cf.case_invoices.createIndex({ invoiceId: 1 });

// Debt cases
cf.debt_cases.createIndex({ creditorOrgId: 1 });
cf.debt_cases.createIndex({ agencyOrgId: 1 });
cf.debt_cases.createIndex({ portfolioId: 1 });
cf.debt_cases.createIndex({ debtorId: 1 });
cf.debt_cases.createIndex({ status: 1 });
cf.debt_cases.createIndex({ assignedCollectorId: 1 });
cf.debt_cases.createIndex({ createdAt: -1 });

// Evidence documents
cf.evidence_documents.createIndex({ caseId: 1 });
cf.evidence_documents.createIndex({ invoiceId: 1 });
cf.evidence_documents.createIndex({ creditorOrgId: 1 });
cf.evidence_documents.createIndex({ debtorId: 1, uploadedAt: -1 });

// Disputes
cf.disputes.createIndex({ caseId: 1 });
cf.disputes.createIndex({ invoiceId: 1 });
cf.disputes.createIndex({ debtorId: 1, openedAt: -1 });
cf.disputes.createIndex({ status: 1 });

// Payments
cf.payments.createIndex({ caseId: 1 });
cf.payments.createIndex({ invoiceId: 1 });
cf.payments.createIndex({ creditorOrgId: 1 });
cf.payments.createIndex({ transactionReference: 1 });

// Payment allocations
cf.payment_allocations.createIndex({ paymentId: 1 });
cf.payment_allocations.createIndex({ invoiceId: 1 });

// Promises
cf.promises.createIndex({ caseId: 1 });
cf.promises.createIndex({ dueDate: 1 });
cf.promises.createIndex({ status: 1 });

// Debtor-submitted installment proposals
cf.payment_plan_requests.createIndex({ debtorId: 1, createdAt: -1 });
cf.payment_plan_requests.createIndex({ creditorOrgId: 1, status: 1 });
cf.payment_plan_requests.createIndex({ invoiceId: 1 });

// Tasks
cf.tasks.createIndex({ assignedTo: 1 });
cf.tasks.createIndex({ caseId: 1 });
cf.tasks.createIndex({ dueDate: 1 });

// Communications
cf.communications.createIndex({ caseId: 1 });
cf.communications.createIndex({ debtorId: 1, createdAt: -1 });
cf.communications.createIndex({ invoiceId: 1 });
cf.communications.createIndex({ createdAt: -1 });

// AI recommendations
cf.ai_recommendations.createIndex({ caseId: 1 });
cf.ai_recommendations.createIndex({ createdAt: -1 });

// Audit events
cf.audit_events.createIndex({ organizationId: 1 });
cf.audit_events.createIndex({ createdAt: -1 });
cf.audit_events.createIndex({ caseId: 1 });

// Notifications
cf.notifications.createIndex({ userId: 1, createdAt: -1 });
cf.notifications.createIndex({ read: 1 });

// Integrations
cf.integration_connections.createIndex({ organizationId: 1 });

// Import jobs
cf.import_jobs.createIndex({ organizationId: 1 });
cf.import_jobs.createIndex({ status: 1 });

// OTP expiration
cf.auth_otps.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

// ============================================
// DATABASE INFORMATION
// ============================================

print("\n==================================");
print("COLLECTFLOW DATABASE READY");
print("==================================");

print("Database: " + DB_NAME);
print("Collections: " + cf.getCollectionNames().length);

print("\nAvailable Collections:");

cf.getCollectionNames().sort().forEach(name => {
    print(" - " + name);
});

print("\nSetup completed successfully!");
