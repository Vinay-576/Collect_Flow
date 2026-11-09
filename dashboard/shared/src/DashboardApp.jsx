import React, { useEffect, useState } from 'react';
import {
  BarChart2,
  CalendarCheck,
  CreditCard,
  CalendarClock,
  FileText,
  FolderOpen,
  Home,
  MessageSquareText,
  MessageSquareWarning,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import { apiRequest, setAdminRequestContext } from './lib/api';
import { initials } from './lib/format';
import { JellyfishCompanion } from './components/RoleCompanions';
import CreditorOverview from '../../creditor/src/pages/CreditorOverview.jsx';
import DebtorInvitations from '../../creditor/src/pages/DebtorInvitations.jsx';
import AgencyOverview from '../../agency/src/pages/AgencyOverview.jsx';
import DebtorOverview from '../../debtor/src/pages/DebtorOverview.jsx';
import AdminAccess from '../../admin/src/pages/AdminAccess.jsx';
import {
  DailyPulsePage,
  DocumentsPage,
  InvoicesPage,
  PaymentsPage,
  ReportsPage,
  SettingsPage,
} from './pages/DashboardPages';
import {
  DebtorDocumentsPage,
  DebtorDisputesPage,
  DebtorMessagesPage,
  DebtorPaymentPlansPage,
  DebtorPaymentsPage,
} from '../../debtor/src/pages/DebtorSections.jsx';

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || 'http://127.0.0.1:5173/';
const PAGE_IDS = ['admin', 'overview', 'invoices', 'debtors', 'payments', 'reports', 'documents', 'pulse', 'plans', 'disputes', 'messages', 'settings'];
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'invoices', label: 'Invoices', icon: Wallet },
  { id: 'debtors', label: 'Debtors', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'pulse', label: 'Daily Pulse', icon: CalendarCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const DEBTOR_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', description: 'A quick look at your account', icon: Home },
  { id: 'invoices', label: 'My Invoices', description: 'View outstanding and paid invoices', icon: Wallet },
  { id: 'payments', label: 'Payments', description: 'Payment history and receipts', icon: CreditCard },
  { id: 'plans', label: 'Payment Plans', description: 'Installments and payment commitments', icon: CalendarClock },
  { id: 'disputes', label: 'Disputes', description: 'Raise and track invoice disputes', icon: MessageSquareWarning },
  { id: 'documents', label: 'Documents & Proofs', description: 'Upload receipts and supporting documents', icon: FolderOpen },
  { id: 'messages', label: 'Messages & Support', description: 'Communicate about your cases', icon: MessageSquareText },
  { id: 'settings', label: 'My Profile', description: 'Personal details and security settings', icon: UserRound },
];

function viewFromPath(pathname) {
  const segment = pathname.replace(/\/+$/, '').split('/').pop();
  if (['creditor', 'agency', 'debtor', 'admin'].includes(segment)) return segment === 'admin' ? 'admin' : 'overview';
  return PAGE_IDS.includes(segment) ? segment : 'overview';
}

function roleFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] === 'dashboard' && ['creditor', 'agency', 'debtor', 'admin'].includes(segments[1])
    ? segments[1]
    : null;
}

function navigationFor(user, accountType = user.account_type, readOnlyAdminScope = false) {
  if (accountType === 'debtor') return DEBTOR_NAV_ITEMS;
  if (accountType === 'agency' || readOnlyAdminScope || !['owner', 'admin'].includes(String(user.role || '').toLowerCase())) {
    return NAV_ITEMS.filter(({ id }) => id !== 'debtors');
  }
  return NAV_ITEMS;
}

function routeForView(view, user) {
  if (view === 'admin') return '/dashboard/admin';
  return view === 'overview' ? `/dashboard/${user.account_type}` : `/dashboard/${user.account_type}/${view}`;
}

function readThemePreference() {
  try {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith('collectflow-theme='));
    const sharedValue = cookie ? decodeURIComponent(cookie.slice('collectflow-theme='.length)) : '';
    if (['system', 'light', 'dark'].includes(sharedValue)) return sharedValue;
    const savedValue = localStorage.getItem('collectflow-theme');
    return ['system', 'light', 'dark'].includes(savedValue) ? savedValue : 'system';
  } catch {
    return 'system';
  }
}

function CollectFlowLogo({ dark }) {
  return <div className="flex shrink-0 items-center gap-2.5" aria-label="CollectFlow">
    <img src="/collectflow-logo.png" alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
    <span className="text-xl font-extrabold tracking-tight"><span className={dark ? 'text-white' : 'text-[#251d38]'}>Collect</span><span className={dark ? 'text-[#c4adff]' : 'text-[#7851dd]'}>Flow</span></span>
  </div>;
}

function Header({ user, accountType, adminScope, dark, page, navItems, platformAdmin, onNavigate, onThemeToggle, onGlobalSearch, onSignOut, onAdminHome, onOpenOwnAccount }) {
  const [search, setSearch] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const submitSearch = (event) => {
    event.preventDefault();
    if (search.trim()) onGlobalSearch(search.trim());
  };
  const selectedPage = navItems.find((item) => item.id === page);

  return <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${dark ? 'border-[#302744] bg-[#100d1b]/95' : 'border-[#e8e2f2] bg-[#fbfaff]/95'}`}>
    <div className="mx-auto flex min-h-[68px] max-w-[1480px] items-center justify-between gap-3 px-4 sm:px-7">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <CollectFlowLogo dark={dark} />
        <div className={`hidden border-l pl-4 md:block ${dark ? 'border-[#382f4d]' : 'border-[#e6dfef]'}`}>
          <p className={`text-[9px] font-bold uppercase tracking-[.16em] ${dark ? 'text-[#958ba9]' : 'text-[#958aa5]'}`}>{page === 'admin' ? 'Platform admin' : accountType === 'agency' ? 'Agency workspace' : accountType === 'debtor' ? 'Debtor portal' : 'Receivables workspace'}</p>
          <p className={`mt-0.5 text-xs font-semibold ${dark ? 'text-[#ded7ea]' : 'text-[#51445f]'}`}>{page === 'admin' ? 'Select an account' : selectedPage?.label || 'CollectFlow'}</p>
          {platformAdmin && adminScope && <p className={`mt-0.5 text-[9px] font-medium ${dark ? 'text-violet-300' : 'text-violet-700'}`}>Read-only admin view · {adminScope.workspace_name}</p>}
        </div>
      </div>
      {(!platformAdmin || adminScope || page !== 'admin') && <form onSubmit={submitSearch} className={`hidden w-full max-w-[340px] items-center gap-2 rounded-full border px-4 py-2.5 md:flex ${dark ? 'border-[#302744] bg-[#19152a]' : 'border-[#e8e2f2] bg-white'}`}>
        <Search size={15} className="shrink-0 text-[#938aa5]" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices or debtors" aria-label="Search invoices or debtors" className={`w-full bg-transparent text-xs outline-none ${dark ? 'text-white placeholder:text-[#766d87]' : 'text-[#352747] placeholder:text-[#9a92a5]'}`} />
        <kbd className={`rounded-md px-1.5 py-0.5 text-[9px] ${dark ? 'bg-[#27213a] text-[#9d94ad]' : 'bg-[#f5f2fa] text-[#9a92a5]'}`}>↵</kbd>
      </form>}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button type="button" onClick={onThemeToggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} className={`grid h-9 w-9 place-items-center rounded-full border ${dark ? 'border-[#3a3150] text-[#d4cbe4] hover:bg-white/5' : 'border-[#e8e2f2] text-[#635878] hover:bg-violet-50'}`}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        <div className="relative">
          <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-label="Open account menu" className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 sm:pr-3 ${dark ? 'border-[#302744] hover:bg-white/5' : 'border-[#e8e2f2] hover:bg-white'}`}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-600 text-[10px] font-bold text-white">{initials(user.full_name)}</span>
            <span className={`hidden max-w-28 truncate text-xs font-semibold sm:inline ${dark ? 'text-[#e4deed]' : 'text-[#51445f]'}`}>{user.full_name?.split(/\s+/)[0] || 'Account'}</span>
          </button>
          {profileOpen && <div className={`absolute right-0 top-12 z-50 w-56 rounded-2xl border p-2 shadow-xl ${dark ? 'border-[#3a3150] bg-[#1b1729]' : 'border-[#e8e2f2] bg-white'}`}>
            <div className={`border-b px-3 py-2 ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}><p className={`truncate text-xs font-bold ${dark ? 'text-white' : 'text-[#241a35]'}`}>{user.full_name}</p><p className={`mt-1 truncate text-[10px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p></div>
            {platformAdmin && adminScope && <button type="button" onClick={() => { setProfileOpen(false); onAdminHome(); }} className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${dark ? 'text-violet-200 hover:bg-violet-500/10' : 'text-violet-700 hover:bg-violet-50'}`}><Settings size={14} />Switch workspace</button>}
            {platformAdmin && !adminScope && page === 'admin' && user.account_type === 'creditor' && <button type="button" onClick={() => { setProfileOpen(false); onOpenOwnAccount(); }} className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${dark ? 'text-violet-200 hover:bg-violet-500/10' : 'text-violet-700 hover:bg-violet-50'}`}><Wallet size={14} />My creditor dashboard</button>}
            {platformAdmin && !adminScope && page !== 'admin' && <button type="button" onClick={() => { setProfileOpen(false); onAdminHome(); }} className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${dark ? 'text-violet-200 hover:bg-violet-500/10' : 'text-violet-700 hover:bg-violet-50'}`}><Settings size={14} />Platform admin</button>}
            <button type="button" onClick={() => { setProfileOpen(false); onSignOut(); }} className={`mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${dark ? 'text-rose-200 hover:bg-rose-500/10' : 'text-rose-700 hover:bg-rose-50'}`}><LogOut size={14} />Sign out</button>
          </div>}
        </div>
      </div>
    </div>
    <div className="mx-auto max-w-[1480px] px-3 pb-3 sm:px-7">
      {accountType === 'debtor' && <DebtorNavigationBar dark={dark} page={page} navItems={navItems} onNavigate={onNavigate} />}
      {accountType !== 'debtor' && navItems.length > 0 && <nav aria-label="Dashboard sections" className={`mx-auto flex w-max max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1.5 ${dark ? 'border-[#302744] bg-[#171326]' : 'border-[#e8e2f2] bg-white shadow-[0_5px_18px_rgba(50,34,89,.04)]'}`}>
        {navItems.map(({ id, label, icon: Icon }) => {
          const selected = page === id;
          return <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={selected ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold transition sm:px-4 sm:text-xs ${selected ? 'bg-violet-600 text-white shadow-[0_5px_14px_rgba(120,81,221,.24)]' : dark ? 'text-[#b9b0c9] hover:bg-white/5 hover:text-white' : 'text-[#766d83] hover:bg-violet-50 hover:text-[#35244e]'}`}><Icon size={15} strokeWidth={1.9} /><span>{label}</span></button>;
        })}
      </nav>}
    </div>
  </header>;
}

function DebtorNavigationBar({ dark, page, navItems, onNavigate }) {
  const shortLabels = { invoices: 'Invoices', plans: 'Plans', documents: 'Proofs', messages: 'Support', settings: 'Profile' };
  return <nav aria-label="Debtor dashboard sections" className={`mx-auto flex max-w-[1480px] items-center gap-2 overflow-x-auto rounded-2xl border p-1.5 shadow-[0_8px_24px_rgba(72,44,112,.08)] sm:rounded-full sm:p-2 ${dark ? 'border-[#392d51] bg-[#1a1527]' : 'border-[#e8e1f0] bg-white'}`}>
    {navItems.map(({ id, label, icon: Icon }) => {
      const selected = page === id;
      const visibleLabel = shortLabels[id] || label;
      return <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={selected ? 'page' : undefined} aria-label={label} title={label} className={`relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-[11px] font-bold transition-all duration-200 sm:h-11 sm:rounded-full sm:px-4 sm:text-xs ${selected ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_6px_17px_rgba(116,75,206,.32)]' : dark ? 'text-[#bcb2ca] hover:bg-white/[.06] hover:text-white' : 'text-[#746982] hover:bg-violet-50 hover:text-[#462d6f]'}`}>
        <Icon size={16} strokeWidth={selected ? 2.2 : 1.8} /><span>{visibleLabel}</span>
        {selected && <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-white/70 sm:hidden" />}
      </button>;
    })}
  </nav>;
}

function FixedJellyfish({ dark, hidden }) {
  if (hidden) return null;
  return <div className="pointer-events-none fixed bottom-4 right-4 z-20">
    <div className="pointer-events-auto">
      <JellyfishCompanion isDark={dark} compact />
    </div>
  </div>;
}

export default function DashboardApp({ dashboardKind = 'auto' }) {
  const [user, setUser] = useState(null);
  const [adminScope, setAdminScope] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [page, setPage] = useState(() => viewFromPath(window.location.pathname));
  const [themePreference, setThemePreference] = useState(readThemePreference);
  const [dark, setDark] = useState(false);
  const [companionsHidden, setCompanionsHidden] = useState(() => {
    try { return localStorage.getItem('collectflow-hide-companions') === 'true'; } catch { return false; }
  });
  const [searchSeed, setSearchSeed] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/api/auth/me', { signal: controller.signal })
      .then((result) => {
        if (!['creditor', 'agency', 'debtor'].includes(result.user?.account_type)) throw new Error('A creditor, agency or debtor account is required.');
        if (roleFromPath(window.location.pathname) === 'admin' && result.user.platform_admin !== true) {
          throw new Error('Platform admin access is not enabled for this account in the active CollectFlow database.');
        }
        setUser(result.user);
        setAdminRequestContext(null);
        const available = navigationFor(result.user).map((item) => item.id);
        const currentPathRole = roleFromPath(window.location.pathname) || (dashboardKind === 'auto' ? null : dashboardKind);
        const routeMatchesAccount = currentPathRole === null || currentPathRole === result.user.account_type || (currentPathRole === 'admin' && result.user.platform_admin === true);
        const requested = routeMatchesAccount ? viewFromPath(window.location.pathname) : 'overview';
        const nextPage = result.user.platform_admin === true && currentPathRole === 'admin'
          ? 'admin'
          : (available.includes(requested) ? requested : 'overview');
        setPage(nextPage);
        const expectedPath = routeForView(nextPage, result.user);
        if (window.location.pathname !== expectedPath) window.history.replaceState({ collectflowPage: nextPage }, '', expectedPath);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setAuthError(error instanceof Error ? error.message : 'CollectFlow could not verify your account.');
      })
      .finally(() => { if (!controller.signal.aborted) setAuthLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = themePreference === 'system' ? media.matches : themePreference === 'dark';
      setDark(resolved);
      document.documentElement.classList.toggle('dark', resolved);
      document.documentElement.dataset.theme = resolved ? 'dark' : 'light';
      document.documentElement.style.colorScheme = resolved ? 'dark' : 'light';
    };
    apply();
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, [themePreference]);

  useEffect(() => {
    try { localStorage.setItem('collectflow-theme', themePreference); } catch { /* Keep the selection for this session. */ }
    try { document.cookie = `collectflow-theme=${encodeURIComponent(themePreference)}; Max-Age=31536000; Path=/; SameSite=Lax`; } catch { /* Shared preference is optional when cookies are disabled. */ }
  }, [themePreference]);

  useEffect(() => {
    try { localStorage.setItem('collectflow-hide-companions', String(companionsHidden)); } catch { /* Keep the companion setting for this session. */ }
  }, [companionsHidden]);

  useEffect(() => { setAdminRequestContext(adminScope); }, [adminScope]);

  useEffect(() => {
    if (!user) return undefined;
    const accountType = adminScope?.account_type || user.account_type;
    const available = navigationFor(user, accountType, Boolean(adminScope)).map((item) => item.id);
    const onPopState = () => {
      const requested = viewFromPath(window.location.pathname);
      if (user.platform_admin && requested === 'admin') {
        setAdminRequestContext(null);
        setAdminScope(null);
        setPage('admin');
      } else {
        setPage(available.includes(requested) ? requested : 'overview');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [user, adminScope]);

  const navigate = (nextPage) => {
    if (!user) return;
    if (nextPage === 'admin' && user.platform_admin) {
      setAdminRequestContext(null);
      setAdminScope(null);
      setPage('admin');
      window.history.pushState({ collectflowPage: 'admin' }, '', '/dashboard/admin');
      return;
    }
    const accountType = adminScope?.account_type || user.account_type;
    if (!navigationFor(user, accountType, Boolean(adminScope)).some((item) => item.id === nextPage)) return;
    const routeUser = { ...user, account_type: accountType };
    const path = routeForView(nextPage, routeUser);
    window.history.pushState({ collectflowPage: nextPage }, '', path);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const openAdminWorkspace = (scope) => {
    if (!user?.platform_admin) return;
    setAdminRequestContext(scope);
    setAdminScope(scope);
    setPage('overview');
    window.history.pushState({ collectflowPage: 'overview' }, '', `/dashboard/${scope.account_type}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const returnToAdminHome = () => {
    setAdminRequestContext(null);
    setAdminScope(null);
    setPage('admin');
    window.history.pushState({ collectflowPage: 'admin' }, '', '/dashboard/admin');
  };

  const openOwnAccount = () => {
    setAdminRequestContext(null);
    setAdminScope(null);
    setPage('overview');
    const path = routeForView('overview', user);
    window.history.pushState({ collectflowPage: 'overview' }, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (term) => {
    setSearchSeed(term);
    navigate('invoices');
  };

  const signOut = async () => {
    try { await apiRequest('/api/auth/logout', { method: 'POST' }); } catch { /* Continue to the login screen if the session has already expired. */ }
    window.location.assign(LOGIN_URL);
  };

  if (authLoading) return <div className={`grid min-h-screen place-items-center ${dark ? 'bg-[#100d1b] text-slate-300' : 'bg-[#f7f5fb] text-slate-600'}`}><div className="flex items-center gap-3 text-sm"><span className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-violet-700" />Loading your workspace…</div></div>;
  if (authError) return <div className={`grid min-h-screen place-items-center px-4 ${dark ? 'bg-[#100d1b] text-slate-100' : 'bg-[#f7f5fb] text-[#241a35]'}`}><section className={`w-full max-w-lg rounded-3xl border p-7 shadow-xl ${dark ? 'border-[#302744] bg-[#19152a]' : 'border-[#e8e2f2] bg-white'}`}><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-500">CollectFlow access</p><h1 className="mt-2 text-xl font-bold">We couldn’t open this dashboard</h1><p className={`mt-3 text-sm leading-relaxed ${dark ? 'text-[#aaa2bd]' : 'text-[#746b83]'}`}>{authError}</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => window.location.reload()} className="rounded-full bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700">Try again</button><a href={LOGIN_URL} className={`rounded-full border px-4 py-2.5 text-xs font-bold ${dark ? 'border-[#3a3150] text-violet-200 hover:bg-white/5' : 'border-[#e8e2f2] text-violet-700 hover:bg-violet-50'}`}>Back to sign in</a></div></section></div>;
  if (!user) return null;

  const activeAccountType = adminScope?.account_type || user.account_type;
  const activeUser = {
    ...user,
    ...(adminScope ? {
      account_type: activeAccountType,
      organization_id: adminScope.organization_id,
      organization_name: adminScope.workspace_name,
      debtor_id: adminScope.debtor_id || null,
    } : {}),
    platform_admin: Boolean(adminScope),
  };
  const navItems = page === 'admin' ? [] : navigationFor(user, activeAccountType, Boolean(adminScope));
  const contentProps = { dark, user: activeUser, companionsHidden, onToggleCompanions: () => setCompanionsHidden((hidden) => !hidden) };
  return <div className={`min-h-screen transition-colors ${dark ? 'bg-[#100d1b] text-slate-100' : 'bg-[#f7f5fb] text-[#241a35]'}`}>
    <Header user={user} accountType={activeAccountType} adminScope={adminScope} platformAdmin={user.platform_admin === true} dark={dark} page={page} navItems={navItems} onNavigate={navigate} onThemeToggle={() => setThemePreference(dark ? 'light' : 'dark')} onGlobalSearch={handleSearch} onSignOut={signOut} onAdminHome={returnToAdminHome} onOpenOwnAccount={openOwnAccount} />
    <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-7 sm:py-8">
      <div className="min-w-0">
      {page === 'admin' && user.platform_admin && <AdminAccess dark={dark} user={user} onOpenWorkspace={openAdminWorkspace} onOpenOwnAccount={openOwnAccount} />}
      {page === 'overview' && activeAccountType === 'debtor' && <DebtorOverview {...contentProps} onNavigate={navigate} />}
      {page === 'overview' && activeAccountType === 'agency' && <AgencyOverview {...contentProps} onNavigate={navigate} />}
      {page === 'overview' && activeAccountType === 'creditor' && <CreditorOverview {...contentProps} onNavigate={navigate} />}
      {page === 'invoices' && <InvoicesPage dark={dark} user={activeUser} initialQuery={searchSeed} />}
      {page === 'debtors' && activeAccountType === 'creditor' && !adminScope && <DebtorInvitations dark={dark} user={activeUser} />}
      {page === 'payments' && activeAccountType === 'debtor' && <DebtorPaymentsPage dark={dark} />}
      {page === 'payments' && activeAccountType !== 'debtor' && <PaymentsPage dark={dark} user={activeUser} />}
      {page === 'reports' && activeAccountType !== 'debtor' && <ReportsPage dark={dark} />}
      {page === 'documents' && activeAccountType === 'debtor' && <DebtorDocumentsPage dark={dark} readOnly={activeUser.platform_admin === true} />}
      {page === 'documents' && activeAccountType !== 'debtor' && <DocumentsPage dark={dark} />}
      {page === 'plans' && activeAccountType === 'debtor' && <DebtorPaymentPlansPage dark={dark} readOnly={activeUser.platform_admin === true} />}
      {page === 'disputes' && activeAccountType === 'debtor' && <DebtorDisputesPage dark={dark} readOnly={activeUser.platform_admin === true} />}
      {page === 'messages' && activeAccountType === 'debtor' && <DebtorMessagesPage dark={dark} readOnly={activeUser.platform_admin === true} />}
      {page === 'pulse' && activeAccountType !== 'debtor' && <DailyPulsePage {...contentProps} />}
      {page === 'settings' && <SettingsPage {...contentProps} themePreference={themePreference} onThemeChange={setThemePreference} onSignOut={signOut} />}
      </div>
    </main>
    {activeAccountType === 'debtor' && page !== 'admin' && <FixedJellyfish dark={dark} hidden={companionsHidden} />}
  </div>;
}
