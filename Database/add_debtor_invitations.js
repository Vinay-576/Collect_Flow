// Run this migration once for the existing CollectFlow database.
// It does NOT delete or recreate your existing collections or records.
const cf = db.getSiblingDB("collectflow");

if (!cf.getCollectionNames().includes("debtor_invitations")) {
  cf.createCollection("debtor_invitations");
  print("Created: debtor_invitations");
} else {
  print("Already exists: debtor_invitations");
}

cf.debtor_invitations.createIndex(
  { codeHash: 1 },
  { unique: true, name: "uq_debtor_invite_code_hash" }
);
cf.debtor_invitations.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "ttl_debtor_invite_expiry" }
);
cf.debtor_invitations.createIndex(
  { creditorOrgId: 1, emailNormalized: 1, status: 1 },
  { name: "ix_debtor_invite_creditor_email_status" }
);

print("CollectFlow debtor invitation migration completed.");
