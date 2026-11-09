import React from 'react';
import CreditorApp from '../creditor/src/App.jsx';
import AgencyApp from '../agency/src/App.jsx';
import DebtorApp from '../debtor/src/App.jsx';
import AdminApp from '../admin/src/App.jsx';
import DashboardApp from '../shared/src/DashboardApp.jsx';

const ACCOUNT_APPS = {
  creditor: CreditorApp,
  agency: AgencyApp,
  debtor: DebtorApp,
  admin: AdminApp,
};

export default function AccountRouter() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const routeKind = segments[0] === 'dashboard' ? segments[1] : null;
  const Dashboard = ACCOUNT_APPS[routeKind];

  // Keep old /dashboard/invoices links working while sending users to their
  // role-specific path after their session is resolved.
  return Dashboard ? <Dashboard /> : <DashboardApp dashboardKind="auto" />;
}
