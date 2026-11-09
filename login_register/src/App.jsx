import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  FileCheck2,
  Layers3,
  LockKeyhole,
  Mail,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const DASHBOARD_BASE_URL = import.meta.env.VITE_DASHBOARD_BASE_URL || 'http://127.0.0.1:5174';

const accountTypes = [
  {
    value: 'creditor',
    label: 'Business / Creditor',
    description: 'Recover payments, manage invoices and cases.',
    Icon: Building2,
  },
  {
    value: 'agency',
    label: 'Collection Agency',
    description: 'Manage multiple clients, cases and collector teams.',
    Icon: Layers3,
  },
  {
    value: 'debtor',
    label: 'Debtor / Customer',
    description: 'View invoices, raise disputes and make payments.',
    Icon: UsersRound,
  },
];

const features = [
  {
    Icon: BarChart3,
    title: 'Track & Recover',
    description: 'Manage invoices, cases and follow-ups',
  },
  {
    Icon: UsersRound,
    title: 'Collaborate Securely',
    description: 'Work with collection agencies and teams',
  },
  {
    Icon: ShieldCheck,
    title: 'Resolve with Confidence',
    description: 'Handle disputes, proofs and payment plans',
  },
];

function useAppearance() {
  const [preference, setPreference] = useState(() => {
    try {
      const sharedCookie = document.cookie.split('; ').find((item) => item.startsWith('collectflow-theme='));
      const sharedPreference = sharedCookie ? decodeURIComponent(sharedCookie.slice('collectflow-theme='.length)) : '';
      if (['system', 'light', 'dark'].includes(sharedPreference)) return sharedPreference;
      const savedPreference = localStorage.getItem('collectflow-theme');
      return ['system', 'light', 'dark'].includes(savedPreference) ? savedPreference : 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    };

    applyTheme();
    media.addEventListener?.('change', applyTheme);
    return () => media.removeEventListener?.('change', applyTheme);
  }, [preference]);

  useEffect(() => {
    try {
      localStorage.setItem('collectflow-theme', preference);
    } catch {
      // Keep the selected theme for this session if storage is unavailable.
    }
    try {
      document.cookie = `collectflow-theme=${encodeURIComponent(preference)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch {
      // The login theme remains available through local storage.
    }
  }, [preference]);

  return [preference, setPreference];
}

function BrandMark({ compact = false }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-3'}`} aria-label="CollectFlow">
      <img
        src="/collectflow-logo.png"
        alt=""
        aria-hidden="true"
        draggable="false"
        className={`${compact ? 'h-9 w-10' : 'h-10 w-11'} shrink-0 object-contain`}
      />
      <span className={`whitespace-nowrap font-bold tracking-[-0.055em] text-white ${compact ? 'text-[1.5rem]' : 'text-[1.7rem]'}`}>
        Collect<span className="brand-word-accent">Flow</span>
      </span>
    </div>
  );
}

function ThemePicker({ preference, onChange }) {
  const options = [
    { value: 'system', label: 'System', Icon: Monitor },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ];

  return (
    <div className="theme-picker inline-flex items-center gap-1 rounded-full p-1" role="group" aria-label="Choose appearance">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={preference === value}
          className={`theme-option inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 sm:px-3.5 ${preference === value ? 'theme-option-active' : ''}`}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function FloatingLeaves() {
  return (
    <div className="leaf-layer pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {['leaf-a', 'leaf-b', 'leaf-c', 'leaf-d', 'leaf-e', 'leaf-f'].map((className) => (
        <span key={className} className={`flying-leaf ${className}`} />
      ))}
    </div>
  );
}

function LandscapeTree() {
  return (
    <div className="tree-scene pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true">
      <svg className="h-full w-full" viewBox="0 0 600 280" preserveAspectRatio="xMidYMax slice" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cfHillBack" x1="80" y1="115" x2="530" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9B88E6" stopOpacity=".28" />
            <stop offset="1" stopColor="#574B9A" stopOpacity=".54" />
          </linearGradient>
          <linearGradient id="cfHillFront" x1="120" y1="170" x2="420" y2="280" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7566C4" stopOpacity=".65" />
            <stop offset="1" stopColor="#27234F" stopOpacity=".96" />
          </linearGradient>
          <radialGradient id="cfSunGlow" cx="0" cy="0" r="1" gradientTransform="matrix(0 85 -85 0 286 170)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFD5C7" stopOpacity=".4" />
            <stop offset="1" stopColor="#FFD5C7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="286" cy="170" r="85" fill="url(#cfSunGlow)" />
        <circle cx="286" cy="170" r="42" fill="#FFD6C8" />
        <path d="M0 207C76 171 129 178 196 205C260 230 319 172 393 188C471 205 524 177 600 191V280H0V207Z" fill="url(#cfHillBack)" />
        <path d="M0 230C70 211 136 219 204 237C275 257 343 215 405 224C484 236 541 217 600 228V280H0V230Z" fill="url(#cfHillFront)" />
        <path d="M0 262C74 250 129 262 191 271C264 282 321 257 384 267C464 280 525 257 600 267V280H0V262Z" fill="#171936" fillOpacity=".88" />
        <g className="tree-sway-group">
          <path d="M55 275C68 236 74 203 70 177C67 159 55 147 44 135C39 129 44 123 50 127C67 138 78 153 83 169C87 151 100 130 116 116C122 111 127 117 122 123C105 144 94 166 91 188C89 217 98 247 107 275H55Z" fill="#14152F" />
          <g className="tree-canopy">
            <path d="M79 178C52 165 28 164 10 171C-2 175-9 164 0 153C10 141 30 144 43 150C29 136 28 119 39 111C52 101 67 115 73 130C71 110 82 94 98 94C115 94 124 111 120 129C138 111 158 111 168 124C178 138 167 154 149 160C170 159 185 170 179 184C173 198 151 199 132 191C108 182 92 184 79 178Z" fill="#27234F" />
            <path d="M60 159C43 145 41 129 52 122C63 115 75 127 77 141C80 124 93 116 103 124C114 133 104 150 93 161L60 159Z" fill="#6256A8" fillOpacity=".85" />
            <path d="M100 171C96 151 109 137 124 143C137 148 135 166 122 177L100 171Z" fill="#A899E8" fillOpacity=".5" />
            <path d="M23 164C14 150 19 137 31 137C42 137 49 149 47 161L23 164Z" fill="#8879CE" fillOpacity=".8" />
            <path d="M139 157C143 141 157 136 166 145C175 155 163 168 150 171L139 157Z" fill="#8A7BD3" fillOpacity=".65" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function MarketingPanel() {
  return (
    <section className="marketing-panel relative isolate flex min-h-[650px] flex-col overflow-hidden px-7 pb-8 pt-7 text-white sm:px-10 lg:min-h-screen lg:px-10 lg:pb-9 lg:pt-8 xl:px-14">
      <div className="marketing-orb marketing-orb-one" aria-hidden="true" />
      <div className="marketing-orb marketing-orb-two" aria-hidden="true" />
      <FloatingLeaves />

      <header className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-2">
        <BrandMark compact />
        <span className="hidden h-6 w-px bg-white/25 sm:block" />
        <span className="text-[11px] tracking-[0.01em] text-indigo-100/75 sm:text-xs">
          Receivables. Recoveries. Resolutions.
        </span>
      </header>

      <div className="relative z-10 mt-12 max-w-[500px] lg:mt-[clamp(3.2rem,8vh,5.8rem)]">
        <h1 className="max-w-[470px] text-[clamp(2.25rem,4.05vw,3.4rem)] font-bold leading-[1.08] tracking-[-0.052em]">
          Turn Outstanding Payments into{' '}
          <span className="headline-accent">Recovered Revenue.</span>
        </h1>
        <p className="mt-5 max-w-[440px] text-[14px] leading-[1.65] text-indigo-100/85 sm:text-[15px]">
          A unified platform for businesses, collection agencies and customers to manage, recover and resolve payments — faster, more transparently, and in one place.
        </p>

        <div className="mt-7 space-y-4">
          {features.map(({ Icon, title, description }) => (
            <div key={title} className="flex items-center gap-4">
              <div className="feature-icon grid h-10 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.09] text-violet-100 backdrop-blur-sm">
                <Icon size={21} strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-[13px] font-bold tracking-[-0.01em] text-white sm:text-sm">{title}</h2>
                <p className="mt-0.5 text-[11px] leading-5 text-indigo-100/75 sm:text-xs">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-auto hidden pt-8 text-[10px] text-indigo-100/50 lg:block">
        Built for better business relationships.
      </div>
      <LandscapeTree />
    </section>
  );
}

function Field({ label, icon: Icon, className = '', ...props }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-[11px] font-bold text-slate-800 dark:text-slate-200 sm:text-xs">
        {label}
      </span>
      <span className="input-shell flex h-[38px] items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-900/70">
        {Icon && <Icon size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />}
        <input
          className="w-full min-w-0 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          {...props}
        />
      </span>
    </label>
  );
}

function PasswordField({ label, value, onChange, placeholder, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-800 dark:text-slate-200 sm:text-xs">{label}</span>
      <span className="input-shell flex h-[38px] items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 transition focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-900/70">
        <LockKeyhole size={16} className="shrink-0 text-slate-500 dark:text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="w-full min-w-0 bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="rounded-md p-0.5 text-slate-500 transition hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-400 dark:hover:text-violet-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </span>
    </label>
  );
}

function AccountTypeSelector({ value, onChange }) {
  return (
    <div>
      <label htmlFor="accountType" className="mb-1.5 block text-[11px] font-bold text-slate-800 dark:text-slate-200 sm:text-xs">
        Account Type <span className="text-rose-500">*</span>
      </label>
      <div className="relative">
        <select
          id="accountType"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="account-select h-[36px] w-full appearance-none rounded-lg border border-violet-400 bg-white pl-3 pr-10 text-[12px] font-semibold text-slate-800 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-500/10 dark:border-violet-400/60 dark:bg-slate-900 dark:text-slate-100"
        >
          {accountTypes.map((account) => (
            <option key={account.value} value={account.value}>{account.label}</option>
          ))}
        </select>
        <ChevronDown size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300" />
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {accountTypes.map(({ value: type, label, description, Icon }) => {
          const selected = value === type;
          return (
            <button
              type="button"
              key={type}
              onClick={() => onChange(type)}
              aria-pressed={selected}
              className={`account-card relative min-h-[91px] rounded-xl border p-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/15 sm:p-3 ${
                selected
                  ? 'account-card-selected border-violet-500 bg-[#F0EAFE] dark:bg-violet-500/15'
                  : 'border-slate-300 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-violet-400/60'
              }`}
            >
              <span className={`mb-1.5 inline-flex ${selected ? 'text-violet-700 dark:text-violet-200' : 'text-slate-700 dark:text-slate-300'}`}>
                <Icon size={19} strokeWidth={2} />
              </span>
              {selected && (
                <span className="absolute right-2 top-2 grid h-[17px] w-[17px] place-items-center rounded-full bg-violet-700 text-white">
                  <Check size={11} strokeWidth={3} />
                </span>
              )}
              <span className="block text-[11px] font-bold leading-4 text-slate-900 dark:text-slate-100 sm:text-[11.5px]">{label}</span>
              <span className="mt-0.5 block text-[10px] leading-[1.35] text-slate-600 dark:text-slate-400">{description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SetupDetailsModal({ accountType, value, onChange, onClose, onContinue, isSubmitting }) {
  const isDebtor = accountType === 'debtor';
  const title = isDebtor ? 'Verify your invitation' : accountType === 'agency' ? 'Set up your agency' : 'Set up your business';
  const label = isDebtor ? 'Invitation code' : accountType === 'agency' ? 'Agency name' : 'Business / organisation name';
  const placeholder = isDebtor ? 'Enter the code shared with you' : accountType === 'agency' ? 'Your collection agency name' : 'Your registered business name';

  return (
    <div className="setup-modal-backdrop fixed inset-0 z-50 grid place-items-center p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form onSubmit={onContinue} className="setup-modal w-full max-w-[420px] rounded-2xl border border-white/70 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">One last detail</p>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {isDebtor ? 'Enter the code sent to this email by the business managing your invoice. If you have not received an invitation, ask them to invite this email from their CollectFlow dashboard.' : 'This will be used to create your CollectFlow workspace.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-800 dark:text-slate-200">{label}</span>
          <input
            autoFocus
            required
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <button type="submit" disabled={isSubmitting} className="primary-cta mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-white disabled:opacity-60">
          {isSubmitting ? 'Creating account…' : 'Continue'}
          {!isSubmitting && <ArrowRight size={17} />}
        </button>
      </form>
    </div>
  );
}

function AuthPanel({ preference, setPreference }) {
  const [mode, setMode] = useState('register');
  const [accountType, setAccountType] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('account');
    return ['creditor', 'agency', 'debtor'].includes(requested) ? requested : 'creditor';
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [setupValue, setSetupValue] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setNotice('');
    setShowSetup(false);
  };

  const performSubmit = async (extraValue = '') => {
    setNotice('');
    setIsSubmitting(true);
    try {
      const isRegister = mode === 'register';
      const payload = isRegister
        ? {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password,
            account_type: accountType,
            organization_name: accountType === 'debtor' ? undefined : (extraValue || organisation).trim(),
            invitation_code: accountType === 'debtor' ? (extraValue || invitationCode).trim() : undefined,
          }
        : { email: email.trim().toLowerCase(), password };

      const response = await fetch(`${API_BASE}/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get('content-type') || '';
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof data?.detail === 'string' ? data.detail : typeof data?.message === 'string' ? data.message : '';
        if (detail) throw new Error(detail);
        if (response.status === 401) throw new Error('The email or password is incorrect. Check your details and try again.');
        if (response.status === 404 || !contentType.includes('application/json')) {
          throw new Error(`The authentication API returned an unexpected response (HTTP ${response.status}). Check that Netlify's COLLECTFLOW_API_URL points to the hosted FastAPI service and that its /api/auth route is available.`);
        }
        if (response.status >= 500) throw new Error(`The authentication service is unavailable (HTTP ${response.status}). Check the FastAPI service and its MongoDB connection.`);
        throw new Error(`Authentication could not be completed (HTTP ${response.status}). Please try again.`);
      }
      if (!data || typeof data !== 'object') throw new Error('The authentication service returned an invalid response. Check the FastAPI service logs.');

      setNotice(data.message || 'Signed in successfully. Opening your workspace…');
      if (data.redirect_path) {
        const dashboardBase = DASHBOARD_BASE_URL === 'same-origin' ? window.location.origin : DASHBOARD_BASE_URL;
        const dashboardUrl = new URL(data.redirect_path, dashboardBase);
        window.location.assign(dashboardUrl.href);
      }
    } catch (error) {
      setNotice(error instanceof TypeError
        ? 'Could not reach the authentication API. Check COLLECTFLOW_API_URL, the API service status, and its allowed Netlify origin.'
        : error instanceof Error ? error.message : 'Could not connect to CollectFlow. Check that the API is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice('');
    if (isSubmitting) return;

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setNotice('Your passwords do not match. Please check and try again.');
        return;
      }
      if (accountType === 'debtor' || !organisation.trim()) {
        setSetupValue(accountType === 'debtor' ? invitationCode : organisation);
        setShowSetup(true);
        return;
      }
    }
    await performSubmit();
  };

  const finishSetup = async (event) => {
    event.preventDefault();
    const value = setupValue.trim();
    if (!value) return;
    if (accountType === 'debtor') setInvitationCode(value);
    else setOrganisation(value);
    setShowSetup(false);
    await performSubmit(value);
  };

  const handleSocial = (provider) => {
    setNotice(`${provider} sign-in will be available after its OAuth connection is configured.`);
  };

  return (
    <section className="auth-area flex min-h-[780px] flex-col px-5 py-4 sm:px-7 sm:py-4 lg:min-h-screen lg:px-4 lg:py-3 xl:px-5">
      <div className="mx-auto flex w-full max-w-[650px] justify-end">
        <ThemePicker preference={preference} onChange={setPreference} />
      </div>

      <div className="my-auto flex w-full justify-center py-4 lg:py-3">
        <div className="auth-card w-full max-w-[640px] rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-soft backdrop-blur-xl sm:p-5 lg:p-5 xl:p-6 dark:border-slate-700/80 dark:bg-slate-900/90">
          <div className="mb-3 grid grid-cols-2 rounded-xl border border-slate-200 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-950/60">
            <button
              type="button"
              onClick={() => changeMode('register')}
              className={`flex h-9 items-center justify-center gap-2 rounded-lg text-[12px] font-bold transition ${mode === 'register' ? 'tab-active' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <UserRoundPlus size={16} /> Create Account
            </button>
            <button
              type="button"
              onClick={() => changeMode('login')}
              className={`flex h-9 items-center justify-center gap-2 rounded-lg text-[12px] font-bold transition ${mode === 'login' ? 'tab-active' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <UserRound size={16} /> Log In
            </button>
          </div>

          <div className="mb-3.5 px-1">
            <h2 className="text-[21px] font-bold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[23px] dark:text-white">
              {mode === 'register' ? <>Create your <span className="text-violet-700 dark:text-violet-300">CollectFlow</span> account</> : <>Welcome back to <span className="text-violet-700 dark:text-violet-300">CollectFlow</span></>}
            </h2>
            <p className="mt-1 text-[12px] leading-5 text-slate-600 dark:text-slate-400">
              {mode === 'register' ? 'Tell us how you’ll use the platform.' : 'Log in to continue to your secure workspace.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <AccountTypeSelector value={accountType} onChange={(next) => { setAccountType(next); setNotice(''); }} />
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field
                    label={<>Full Name <span className="text-rose-500">*</span></>}
                    icon={UserRound}
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />
                  <Field
                    label={<>Work Email <span className="text-rose-500">*</span></>}
                    icon={Mail}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </>
            )}

            {mode === 'login' && (
              <Field
                label="Email Address"
                icon={Mail}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            )}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <PasswordField
                label={<>Password <span className="text-rose-500">*</span></>}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? 'Create a strong password' : 'Enter your password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              {mode === 'register' ? (
                <PasswordField
                  label={<>Confirm Password <span className="text-rose-500">*</span></>}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              ) : (
                <div className="flex items-end justify-end pb-1">
                  <button type="button" onClick={() => setNotice('Connect this action to your password-reset endpoint.')} className="text-xs font-semibold text-violet-700 transition hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200">
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {notice && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs leading-5 text-violet-950 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100" role="status">
                {notice}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="primary-cta flex h-[40px] w-full items-center justify-center gap-2 rounded-lg px-5 text-[12px] font-bold text-white transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/25">
              {isSubmitting ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Log In'}
              {!isSubmitting && <ArrowRight size={16} />}
            </button>

            <div className="flex items-center gap-3 py-0.5">
              <span className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">or continue with</span>
              <span className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <button type="button" onClick={() => handleSocial('Google')} className="social-button flex h-[37px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-800 transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-violet-400/50 dark:hover:bg-slate-800">
                <GoogleMark /> Continue with Google
              </button>
              <button type="button" onClick={() => handleSocial('Microsoft')} className="social-button flex h-[37px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-800 transition hover:border-violet-400 hover:bg-violet-50/40 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:border-violet-400/50 dark:hover:bg-slate-800">
                <MicrosoftMark /> Continue with Microsoft
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-[9px] leading-4 text-slate-500 dark:text-slate-500">
            By creating an account, you agree to our <a href="#terms" className="font-bold text-violet-700 hover:underline dark:text-violet-300">Terms of Service</a> and <a href="#privacy" className="font-bold text-violet-700 hover:underline dark:text-violet-300">Privacy Policy</a>.
          </p>
        </div>
      </div>

            {showSetup && (
        <SetupDetailsModal
          accountType={accountType}
          value={setupValue}
          onChange={setSetupValue}
          onClose={() => setShowSetup(false)}
          onContinue={finishSetup}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.9 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.9 1.3-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#4A90E2" d="M12.8 27.8a12 12 0 0 1 0-7.6V15H5.9a20 20 0 0 0 0 18Z" />
      <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 15l6.9 5.2C14.4 15.5 18.8 12 24 12Z" />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="#F35325" d="M1 1h6.5v6.5H1z" />
      <path fill="#81BC06" d="M8.5 1H15v6.5H8.5z" />
      <path fill="#05A6F0" d="M1 8.5h6.5V15H1z" />
      <path fill="#FFBA08" d="M8.5 8.5H15V15H8.5z" />
    </svg>
  );
}

export default function App() {
  const [preference, setPreference] = useAppearance();
  return (
    <main className="min-h-screen bg-[#f5f5fb] font-sans text-slate-900 transition-colors duration-300 dark:bg-[#0b1020]">
      <div className="grid min-h-screen lg:grid-cols-[42.5%_57.5%]">
        <MarketingPanel />
        <AuthPanel preference={preference} setPreference={setPreference} />
      </div>
    </main>
  );
}
