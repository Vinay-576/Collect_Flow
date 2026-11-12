import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Handshake,
  Moon,
  ShieldCheck,
  Sun,
  UsersRound,
  WalletCards,
} from 'lucide-react';

function Logo({ dark }) {
  return (
    <a href="/" className="inline-flex items-center gap-2.5" aria-label="CollectFlow home">
      <img src="/collectflow-logo.png" alt="" className="h-9 w-10 object-contain" />
      <span className={`text-[1.45rem] font-extrabold tracking-[-0.06em] ${dark ? 'text-white' : 'text-[#211936]'}`}>
        Collect<span className="text-violet-600">Flow</span>
      </span>
    </a>
  );
}

function PreviewDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      <div className="absolute -inset-7 rounded-[3rem] bg-gradient-to-br from-violet-300/35 via-fuchsia-200/30 to-indigo-200/30 blur-3xl dark:from-violet-600/20 dark:via-fuchsia-600/10 dark:to-indigo-500/15" />
      <div className="relative rotate-[1deg] rounded-[1.7rem] border border-white/80 bg-white/90 p-3 shadow-[0_30px_90px_-30px_rgba(73,44,125,.35)] backdrop-blur-xl dark:border-white/10 dark:bg-[#161326]/95 sm:p-4">
        <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"><BarChart3 size={16} /></span>
            <div><p className="text-[11px] font-extrabold text-slate-900 dark:text-white">Recovery overview</p><p className="text-[9px] text-slate-500 dark:text-slate-400">Ricoz workspace · this month</p></div>
          </div>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />Sample dataset</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 py-3 sm:gap-3 sm:py-4">
          {[
            ['Open receivables', '₹18.4L', '+8.2% this month', 'violet'],
            ['Overdue balance', '₹6.1L', '12 invoices', 'orange'],
            ['Recovered this month', '₹4.2L', '+15.4% this month', 'green'],
          ].map(([label, amount, detail, color]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-2.5 dark:border-white/[.07] dark:bg-white/[.035] sm:p-3.5">
              <p className="truncate text-[8px] font-semibold text-slate-500 dark:text-slate-400 sm:text-[9px]">{label}</p>
              <p className="mt-1 text-[clamp(.9rem,2.4vw,1.3rem)] font-extrabold tracking-tight text-slate-900 dark:text-white">{amount}</p>
              <p className={`mt-1 truncate text-[8px] font-semibold sm:text-[9px] ${color === 'orange' ? 'text-orange-600 dark:text-orange-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.35fr_.9fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-white/[.07] dark:bg-white/[.035] sm:p-4">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold text-slate-800 dark:text-slate-100">Recovery progress</p><p className="mt-0.5 text-[8px] text-slate-500 dark:text-slate-400">Collected against monthly target</p></div><span className="text-xs font-extrabold text-violet-700 dark:text-violet-200">68%</span></div>
            <svg className="mt-2.5 h-[112px] w-full" viewBox="0 0 440 125" role="img" aria-label="Illustrative recovery trend chart">
              <defs><linearGradient id="landing-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".22" /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
              {[22, 52, 82, 112].map((y) => <line key={y} x1="4" x2="436" y1={y} y2={y} stroke="currentColor" className="text-slate-100 dark:text-white/[.07]" strokeDasharray="3 5" />)}
              <path d="M8 103 C54 96 64 78 103 82 S154 75 190 66 S251 62 286 47 S347 50 382 30 S415 27 432 15 L432 120 L8 120 Z" fill="url(#landing-chart-fill)" />
              <path d="M8 103 C54 96 64 78 103 82 S154 75 190 66 S251 62 286 47 S347 50 382 30 S415 27 432 15" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
              {[[8,103],[103,82],[190,66],[286,47],[382,30],[432,15]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="white" stroke="#7c3aed" strokeWidth="2" />)}
            </svg>
            <div className="flex justify-between px-1 text-[7px] font-semibold text-slate-400"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-white/[.07] dark:bg-white/[.035] sm:p-4">
            <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-extrabold text-slate-800 dark:text-slate-100">Priority follow-ups</p><span className="rounded-full bg-violet-50 px-2 py-1 text-[8px] font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200">3 today</span></div>
            {[
              ['AR', 'Aster Retail', 'Promise due · 11:30 AM', 'violet'],
              ['NP', 'Northstar Parts', 'Invoice review · 1:00 PM', 'orange'],
              ['MC', 'Meadow Craft', 'Dispute response · 3:15 PM', 'blue'],
            ].map(([initials, name, action, tone]) => <div key={name} className="flex items-center gap-2 border-t border-slate-100 py-2.5 first:border-0 dark:border-white/[.07]"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[8px] font-extrabold ${tone === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-400/10 dark:text-orange-200' : tone === 'blue' ? 'bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200' : 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200'}`}>{initials}</span><div className="min-w-0"><p className="truncate text-[9px] font-bold text-slate-800 dark:text-slate-100">{name}</p><p className="truncate text-[8px] text-slate-500 dark:text-slate-400">{action}</p></div><ChevronRight size={12} className="ml-auto shrink-0 text-slate-400" /></div>)}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-violet-50/80 px-3 py-2 dark:bg-violet-500/[.08]"><span className="text-[8px] font-semibold text-violet-900 dark:text-violet-100">Illustrative dashboard preview · sample figures</span><span className="inline-flex items-center gap-1 text-[8px] font-bold text-violet-700 dark:text-violet-200"><BadgeCheck size={11} />Secure workspace</span></div>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3 py-2.5 shadow-xl dark:border-white/10 dark:bg-[#1c1930] sm:flex"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"><Check size={16} /></span><span><strong className="block text-[10px] text-slate-900 dark:text-white">Payment confirmed</strong><small className="text-[8px] text-slate-500 dark:text-slate-400">Aster Retail · ₹45,000</small></span></div>
      <div className="absolute -right-2 -top-5 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3 py-2.5 shadow-xl dark:border-white/10 dark:bg-[#1c1930] sm:flex"><span className="grid h-8 w-8 place-items-center rounded-xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-200"><ShieldCheck size={16} /></span><span><strong className="block text-[10px] text-slate-900 dark:text-white">Clear audit trail</strong><small className="text-[8px] text-slate-500 dark:text-slate-400">Every update accounted for</small></span></div>
    </div>
  );
}

const solutions = [
  { icon: Building2, eyebrow: 'For businesses', title: 'Know what’s owed. See what’s moving.', description: 'Manage invoices, follow-ups and agency relationships from one clear workspace.', href: '/signup', tone: 'violet' },
  { icon: Handshake, eyebrow: 'For agencies', title: 'Keep every client case on track.', description: 'Coordinate portfolios, collectors and next steps with a shared view of each case.', href: '/signup?account=agency', tone: 'blue' },
  { icon: WalletCards, eyebrow: 'For customers', title: 'Resolve payments with confidence.', description: 'Review balances, discuss a plan and share payment proof in one secure portal.', href: '/signup?account=debtor', tone: 'pink' },
];

export default function LandingPage({ preference, setPreference }) {
  const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setPreference(dark ? 'light' : 'dark');

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaff] font-sans text-slate-900 transition-colors dark:bg-[#0b0a13] dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-violet-100/70 bg-white/85 backdrop-blur-xl dark:border-white/[.07] dark:bg-[#100e19]/85">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <Logo dark={dark} />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a href="#product" className="text-xs font-semibold text-slate-600 transition hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-200">Platform</a>
            <a href="#solutions" className="text-xs font-semibold text-slate-600 transition hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-200">Who it’s for</a>
            <a href="#how-it-works" className="text-xs font-semibold text-slate-600 transition hover:text-violet-700 dark:text-slate-300 dark:hover:text-violet-200">How it works</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={toggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[.06]">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <a href="/login" className="hidden rounded-full px-3 py-2 text-xs font-bold text-slate-700 transition hover:text-violet-700 dark:text-slate-200 dark:hover:text-violet-200 sm:inline-flex">Log in</a>
            <a href="/signup" className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-[11px] font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700 sm:px-5 sm:text-xs">Get started <ArrowRight size={14} /></a>
          </div>
        </div>
      </header>

      <section className="relative isolate px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:pb-28 lg:pt-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_10%,rgba(196,181,253,.32),transparent_35%),radial-gradient(ellipse_at_85%_34%,rgba(244,208,255,.28),transparent_34%)] dark:bg-[radial-gradient(ellipse_at_18%_10%,rgba(111,73,190,.2),transparent_34%),radial-gradient(ellipse_at_86%_34%,rgba(103,43,140,.12),transparent_34%)]" />
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[.92fr_1.08fr] lg:gap-10">
          <div className="max-w-[570px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/75 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-violet-400/[.07] dark:text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />A clearer path to resolution</div>
            <h1 className="mt-6 max-w-[560px] text-[clamp(2.75rem,6.3vw,5.25rem)] font-extrabold leading-[.99] tracking-[-.065em] text-[#1e1930] dark:text-white">Recover what’s owed. <span className="bg-gradient-to-r from-violet-700 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent dark:from-violet-300 dark:via-fuchsia-300 dark:to-violet-400">Keep trust intact.</span></h1>
            <p className="mt-6 max-w-[490px] text-[15px] leading-7 text-slate-600 dark:text-slate-300 sm:text-base">CollectFlow brings businesses, collection teams and customers into one calmer workspace for invoices, follow-ups and payment resolution.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/signup" className="group inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-6 text-sm font-bold text-white shadow-xl shadow-violet-600/25 transition hover:-translate-y-0.5 hover:bg-violet-700">Explore CollectFlow <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></a>
              <a href="/login" className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-6 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-white/[.04] dark:text-slate-100 dark:hover:text-violet-200">Log in to workspace <ArrowUpRight size={15} /></a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:text-[11px]">
              {['Shared case visibility', 'Secure payment records', 'Clear next steps'].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><Check size={13} className="text-emerald-600 dark:text-emerald-300" />{item}</span>)}
            </div>
          </div>
          <div className="px-1 py-4 sm:px-4 lg:px-0"><PreviewDashboard /></div>
        </div>
        <div className="mx-auto mt-16 max-w-[1240px] border-t border-violet-100/80 pt-6 dark:border-white/[.08]">
          <p className="text-center text-[9px] font-bold uppercase tracking-[.2em] text-slate-400 dark:text-slate-500">One connected space for every side of the payment journey</p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-10 gap-y-3 text-xs font-bold text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-2"><Building2 size={15} className="text-violet-500" />Businesses</span><span className="inline-flex items-center gap-2"><Handshake size={15} className="text-violet-500" />Collection agencies</span><span className="inline-flex items-center gap-2"><UsersRound size={15} className="text-violet-500" />Customers</span></div>
        </div>
      </section>

      <section id="product" className="border-y border-violet-100/70 bg-white/70 px-5 py-16 dark:border-white/[.07] dark:bg-white/[.02] sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1240px]">
          <div className="mx-auto max-w-[670px] text-center"><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-700 dark:text-violet-300">Less chasing. More clarity.</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.045em] text-[#211936] dark:text-white sm:text-4xl">A collection process that feels connected.</h2><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Bring the right records, people and next actions together, so every conversation starts with context.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: FileText, title: 'Invoice clarity', copy: 'See balances, payment history and due dates together, with every account grounded in live records.' },
              { icon: CircleDollarSign, title: 'Useful follow-ups', copy: 'Keep promises, tasks and next steps visible so teams can act at the right time.' },
              { icon: ShieldCheck, title: 'Respectful resolution', copy: 'Give customers a clear way to ask questions, share proof and work toward a plan.' },
            ].map(({ icon: Icon, title, copy }, index) => <article key={title} className="group rounded-[1.4rem] border border-slate-100 bg-white p-6 shadow-[0_12px_40px_-32px_rgba(44,32,75,.3)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl dark:border-white/[.08] dark:bg-[#151321] dark:hover:border-violet-400/20">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${index === 0 ? 'bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200' : index === 1 ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/10 dark:text-fuchsia-200' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-200'}`}><Icon size={20} /></span>
              <h3 className="mt-5 text-base font-extrabold tracking-tight text-[#241c36] dark:text-white">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{copy}</p><a href="/signup" className="mt-5 inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 dark:text-violet-300">See how it works <ChevronRight size={13} className="transition group-hover:translate-x-0.5" /></a>
            </article>)}
          </div>
        </div>
      </section>

      <section id="solutions" className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1240px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-700 dark:text-violet-300">Built around real relationships</p><h2 className="mt-3 max-w-[650px] text-3xl font-extrabold tracking-[-.045em] text-[#211936] dark:text-white sm:text-4xl">One platform. Different perspectives.</h2></div><p className="max-w-[390px] text-xs leading-6 text-slate-600 dark:text-slate-300">Each person gets a workspace that fits their role, with shared context and clear permissions.</p></div>
          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {solutions.map(({ icon: Icon, eyebrow, title, description, href, tone }) => <article key={eyebrow} className="relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-6 dark:border-white/[.08] dark:bg-[#151321] sm:p-7"><div className={`absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl ${tone === 'violet' ? 'bg-violet-200/70 dark:bg-violet-600/15' : tone === 'blue' ? 'bg-sky-200/70 dark:bg-sky-600/15' : 'bg-pink-200/70 dark:bg-pink-600/15'}`} /><span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200"><Icon size={20} /></span><p className="relative mt-5 text-[9px] font-extrabold uppercase tracking-[.16em] text-violet-700 dark:text-violet-300">{eyebrow}</p><h3 className="relative mt-2 text-xl font-extrabold leading-snug tracking-[-.03em] text-[#241c36] dark:text-white">{title}</h3><p className="relative mt-3 min-h-[48px] text-xs leading-6 text-slate-600 dark:text-slate-300">{description}</p><a href={href} className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-[10px] font-bold text-violet-700 transition hover:bg-violet-600 hover:text-white dark:border-violet-300/20 dark:bg-white/[.03] dark:text-violet-200 dark:hover:bg-violet-600 dark:hover:text-white">Open {eyebrow.toLowerCase()} portal <ArrowUpRight size={13} /></a></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto grid max-w-[1240px] gap-8 rounded-[2rem] bg-gradient-to-br from-[#21173d] via-[#35216a] to-[#5836a8] p-7 text-white shadow-[0_28px_80px_-40px_rgba(73,44,125,.7)] sm:p-10 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:p-12">
          <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-violet-200">From balance to next step</p><h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-.045em] sm:text-4xl">A better conversation starts with a shared view.</h2><p className="mt-4 max-w-[450px] text-sm leading-6 text-violet-100/80">Connect the invoice, the follow-up and the resolution in a single workflow designed for people on both sides.</p><a href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-extrabold text-violet-800 transition hover:-translate-y-0.5">Start with CollectFlow <ArrowRight size={15} /></a></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['01', 'Bring work together', 'Invoices and cases in one place.'],
              ['02', 'Coordinate next steps', 'People know what happens next.'],
              ['03', 'Close the loop', 'Record outcomes and proof.'],
            ].map(([number, title, copy]) => <div key={number} className="rounded-2xl border border-white/15 bg-white/[.07] p-4 backdrop-blur-sm"><span className="text-[10px] font-extrabold tracking-[.15em] text-violet-200">{number}</span><h3 className="mt-5 text-sm font-extrabold">{title}</h3><p className="mt-2 text-[10px] leading-5 text-violet-100/75">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-violet-100/70 bg-white px-5 py-7 dark:border-white/[.07] dark:bg-[#100e19] sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><Logo dark={dark} /><p className="text-[10px] text-slate-500 dark:text-slate-400">Receivables. Recoveries. Resolutions.</p><div className="flex gap-5 text-[10px] font-semibold text-slate-500 dark:text-slate-400"><a href="/login" className="hover:text-violet-700 dark:hover:text-violet-200">Log in</a><a href="/signup" className="inline-flex items-center gap-1 hover:text-violet-700 dark:hover:text-violet-200">Create account <ArrowUpRight size={12} /></a></div></div>
      </footer>
    </main>
  );
}
