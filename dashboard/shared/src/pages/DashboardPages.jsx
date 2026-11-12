import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  CalendarCheck,
  Check,
  Clock,
  CreditCard,
  Download,
  FileText,
  HeartHandshake,
  LogOut,
  RefreshCw,
  Settings,
  Wallet,
  Users,
  X,
} from 'lucide-react';
import { PeekingCatIllustration } from '../components/CatCompanion';
import { DogCompanion, OctopusCompanion, PandaCompanion } from '../components/RoleCompanions';
import { apiRequest, useApiData } from '../lib/api';
import { formatDate, formatMoney, formatMoneyMap } from '../lib/format';

const panelClass = (dark) => dark
  ? 'border border-[#302744] bg-[#19152a]'
  : 'border border-[#e8e2f2] bg-white shadow-[0_8px_30px_rgba(50,34,89,.04)]';
const headingClass = (dark) => dark ? 'text-white' : 'text-[#241a35]';
const mutedClass = (dark) => dark ? 'text-[#aaa2bd]' : 'text-[#746b83]';

function PageHeading({ dark, eyebrow, title, description, showCompanion = false, companion = 'cat', companionsHidden, onToggleCompanions }) {
  return (
    <div className="mb-6 flex min-h-[92px] items-center justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-violet-500">{eyebrow}</p>}
        <h1 className={`text-[25px] font-bold tracking-tight sm:text-[30px] ${headingClass(dark)}`}>{title}</h1>
        {description && <p className={`mt-1 max-w-2xl text-sm ${mutedClass(dark)}`}>{description}</p>}
      </div>
      {showCompanion && <div className="hidden items-center gap-2 md:flex">
        {companionsHidden
          ? <button type="button" onClick={onToggleCompanions} className={`rounded-full border px-3 py-2 text-xs font-semibold ${dark ? 'border-[#3a3150] text-violet-200 hover:bg-violet-500/10' : 'border-[#e2d9f2] text-violet-700 hover:bg-violet-50'}`}>Show {companion}</button>
          : <div className="relative max-w-[260px]">{companion === 'panda' ? <PandaCompanion isDark={dark} /> : companion === 'octopus' ? <OctopusCompanion isDark={dark} /> : <PeekingCatIllustration isDark={dark} />}<button type="button" onClick={onToggleCompanions} aria-label={`Hide ${companion} companion`} className={`absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-full border text-xs shadow-sm ${dark ? 'border-[#44395d] bg-[#211b34] text-slate-300' : 'border-[#e5def4] bg-white text-slate-500'}`}><X size={13} /></button></div>}
      </div>}
    </div>
  );
}

function EmptyState({ dark, title, detail, icon: Icon = FileText }) {
  return <div className={`grid min-h-44 place-items-center rounded-xl border border-dashed px-5 py-8 text-center ${dark ? 'border-[#3a3150] bg-[#171326]' : 'border-[#e5def4] bg-[#fbfaff]'}`}><div><span className={`mx-auto grid h-11 w-11 place-items-center rounded-2xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'}`}><Icon size={19} /></span><h3 className={`mt-3 text-sm font-semibold ${headingClass(dark)}`}>{title}</h3><p className={`mx-auto mt-1 max-w-md text-xs leading-relaxed ${mutedClass(dark)}`}>{detail}</p></div></div>;
}

function RequestState({ dark, loading, error, onRetry }) {
  if (loading) return <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${mutedClass(dark)}`}><RefreshCw size={14} className="animate-spin text-violet-500" /> Loading workspace data…</div>;
  if (error) return <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${dark ? 'border-rose-900/60 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span className="flex items-center gap-2"><AlertCircle size={15} />{error}</span><button type="button" onClick={onRetry} className="font-bold underline underline-offset-2">Retry</button></div>;
  return null;
}

function MetricCard({ dark, icon: Icon, label, value, detail, tone = 'violet' }) {
  const tones = {
    violet: dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700',
    indigo: dark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700',
    blue: dark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700',
    rose: dark ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-fuchsia-50 text-fuchsia-700',
  };
  return <section className={`rounded-2xl p-4 sm:p-5 ${panelClass(dark)}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-xs font-medium ${mutedClass(dark)}`}>{label}</p><p className={`mt-2 text-[23px] font-bold tracking-tight ${headingClass(dark)}`}>{value}</p><p className={`mt-1 text-[11px] ${mutedClass(dark)}`}>{detail}</p></div><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span></div></section>;
}

function RecoveryChart({ dark, series = [] }) {
  const currencies = useMemo(() => [...new Set(series.flatMap((item) => Object.keys(item.amount || {})))], [series]);
  const [currency, setCurrency] = useState('');
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies[0]); }, [currencies, currency]);
  const selected = currency || currencies[0] || 'INR';
  const values = series.map((item) => Number(item.amount?.[selected] || 0));
  const max = Math.max(...values, 0) * 1.12;
  const hasPayments = values.some((value) => value > 0);
  const plot = { left: 68, right: 630, top: 22, bottom: 164 };
  const points = values.map((value, index) => ({
    x: plot.left + (series.length <= 1 ? (plot.right - plot.left) / 2 : (index / (series.length - 1)) * (plot.right - plot.left)),
    y: plot.bottom - (value / (max || 1)) * (plot.bottom - plot.top),
    value,
    label: series[index]?.label || '',
  }));
  const linePath = points.map(({ x, y }, index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');
  const areaPath = points.length ? `${linePath} L ${points.at(-1).x} ${plot.bottom} L ${points[0].x} ${plot.bottom} Z` : '';
  const compactMoney = (value) => {
    try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: selected, notation: 'compact', maximumFractionDigits: 1 }).format(value); }
    catch { return `${selected} ${Number(value).toLocaleString('en-IN', { notation: 'compact', maximumFractionDigits: 1 })}`; }
  };
  const latest = series.at(-1);

  return <section className={`rounded-2xl p-5 ${panelClass(dark)}`}>
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Recovery trend</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Verified payment allocations by month · {selected}</p></div><div className="flex items-center gap-3">{latest && hasPayments && <div className="hidden text-right sm:block"><p className={`text-[10px] ${mutedClass(dark)}`}>{latest.label}</p><p className={`text-sm font-bold ${headingClass(dark)}`}>{formatMoney(latest.amount?.[selected] || 0, selected)}</p></div>}{currencies.length > 1 && <select value={selected} onChange={(event) => setCurrency(event.target.value)} aria-label="Chart currency" className={`rounded-lg border px-2.5 py-1.5 text-xs ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#352747]'}`}>{currencies.map((code) => <option key={code}>{code}</option>)}</select>}</div></div>
    {!hasPayments ? <EmptyState dark={dark} title="No verified payments yet" detail="Once payments are verified and allocated to invoices, their monthly recovery trend will appear here." icon={BarChart2} /> : <div className={`overflow-hidden rounded-xl border px-2 pt-1 sm:px-3 ${dark ? 'border-[#302744] bg-[#171326]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}>
      <svg className="h-[218px] w-full overflow-visible" viewBox="0 0 650 210" role="img" aria-label={`Monthly verified recoveries in ${selected}`}>
        <defs><linearGradient id="recoveryAreaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity={dark ? '.3' : '.2'} /><stop offset="1" stopColor="#8b5cf6" stopOpacity="0" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = plot.top + (tick / 4) * (plot.bottom - plot.top);
          const value = max * (1 - tick / 4);
          return <g key={tick}><line x1={plot.left} x2={plot.right} y1={y} y2={y} stroke={dark ? '#382e4b' : '#eee8f6'} strokeDasharray={tick === 4 ? '0' : '3 5'} /><text x={plot.left - 9} y={y + 3} textAnchor="end" fontSize="9" fill={dark ? '#938aa4' : '#8a8198'}>{compactMoney(value)}</text></g>;
        })}
        {points.length > 1 && <path d={areaPath} fill="url(#recoveryAreaFill)" />}
        {points.length > 1 && <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {points.map((point, index) => <g key={`${series[index]?.month || point.label}-${index}`}><circle cx={point.x} cy={point.y} r="5.5" fill={dark ? '#19152a' : 'white'} stroke="#8b5cf6" strokeWidth="2.5" vectorEffect="non-scaling-stroke"><title>{point.label}: {formatMoney(point.value, selected)}</title></circle><text x={point.x} y="197" textAnchor="middle" fontSize="10" fill={dark ? '#aaa2bd' : '#746b83'}>{point.label}</text></g>)}
      </svg>
    </div>}
  </section>;
}

function InvoiceMixChart({ dark, invoices = [], loading = false, error, onRetry }) {
  const categories = [
    { label: 'Overdue', color: '#e87972', test: (status) => status === 'overdue' },
    { label: 'Awaiting payment', color: '#8b5cf6', test: (status) => !['overdue', 'settled', 'paid', 'cancelled', 'written off', 'draft'].includes(status) },
    { label: 'Settled', color: '#39a982', test: (status) => status === 'settled' || status === 'paid' },
    { label: 'Other', color: dark ? '#625a71' : '#b8aec7', test: (status) => ['cancelled', 'written off', 'draft'].includes(status) },
  ];
  const counts = categories.map((category) => invoices.filter((invoice) => category.test(String(invoice.status || '').trim().toLowerCase())).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return <section className={`rounded-2xl p-5 ${panelClass(dark)}`}>
    <div className="mb-3"><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Invoice status mix</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Share of invoices by current status</p></div>
    {error ? <RequestState dark={dark} error={error} onRetry={onRetry} /> : loading ? <div className={`grid min-h-[210px] place-items-center text-xs ${mutedClass(dark)}`}>Loading invoice data…</div> : !total ? <EmptyState dark={dark} title="No invoices to chart" detail="Invoice status distribution will appear when invoices are available in this workspace." icon={FileText} /> : <div className="grid items-center gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
      <div className="relative mx-auto h-40 w-40">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" role="img" aria-label={`Invoice status distribution for ${total} invoices`}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke={dark ? '#302744' : '#f0ebf7'} strokeWidth="17" />
          {categories.map((category, index) => {
            const length = total ? (counts[index] / total) * circumference : 0;
            const currentOffset = offset;
            offset += length;
            return counts[index] ? <circle key={category.label} cx="70" cy="70" r={radius} fill="none" stroke={category.color} strokeWidth="17" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-currentOffset} strokeLinecap="butt"><title>{category.label}: {counts[index]}</title></circle> : null;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className={`text-[26px] font-bold tracking-tight ${headingClass(dark)}`}>{total}</span><span className={`text-[10px] ${mutedClass(dark)}`}>invoices</span></div>
      </div>
      <div className="space-y-3">{categories.filter((category, index) => counts[index] > 0).map((category) => {
        const index = categories.indexOf(category);
        const percent = Math.round((counts[index] / total) * 100);
        return <div key={category.label} className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span className={`truncate text-xs ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{category.label}</span></div><span className={`shrink-0 text-xs font-semibold ${headingClass(dark)}`}>{counts[index]} <span className={`font-normal ${mutedClass(dark)}`}>· {percent}%</span></span></div>;
      })}</div>
    </div>}
  </section>;
}

function MomentumCard({ dark, recovered }) {
  return <section className={`flex min-h-[188px] items-center justify-between gap-3 overflow-hidden rounded-2xl border p-5 ${dark ? 'border-[#37404a] bg-gradient-to-br from-[#20252e] to-[#262135]' : 'border-[#e0e9df] bg-gradient-to-br from-[#f0f6ed] to-[#f4f0fb]'}`}>
    <div className="min-w-0"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${dark ? 'bg-emerald-400/10 text-emerald-200' : 'bg-emerald-100 text-emerald-800'}`}>Monthly momentum</span><h2 className={`mt-2 text-base font-bold ${headingClass(dark)}`}>Small steps add up</h2><p className={`mt-1 max-w-[240px] text-xs leading-relaxed ${mutedClass(dark)}`}>Verified payments this month</p><p className={`mt-1 text-sm font-bold ${dark ? 'text-emerald-200' : 'text-emerald-800'}`}>{formatMoneyMap(recovered)}</p></div>
    <div className="mr-1 shrink-0"><DogCompanion isDark={dark} compact /></div>
  </section>;
}

function CasesTable({ dark, rows = [] }) {
  if (!rows.length) return <EmptyState dark={dark} title="No recovery cases yet" detail="Cases appear here when invoices have been moved into recovery workflows." icon={HeartHandshake} />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className={`border-b text-[10px] uppercase tracking-wider ${dark ? 'border-[#302744] text-slate-400' : 'border-[#eee9f5] text-slate-500'}`}><th className="pb-3 font-semibold">Case</th><th className="pb-3 font-semibold">Debtor</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Priority</th><th className="pb-3 text-right font-semibold">Outstanding</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={`border-b last:border-0 ${dark ? 'border-[#29223b]' : 'border-[#f1edf6]'}`}><td className={`py-3 text-xs font-semibold ${headingClass(dark)}`}>{row.case_reference || 'Unnumbered case'}</td><td className={`py-3 text-xs ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{row.debtor}</td><td className="py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}>{row.status}</span></td><td className={`py-3 text-xs capitalize ${mutedClass(dark)}`}>{String(row.priority || 'normal').toLowerCase()}</td><td className={`py-3 text-right text-xs font-semibold ${headingClass(dark)}`}>{formatMoneyMap(row.outstanding_amount)}</td></tr>)}</tbody></table></div>;
}

export function OverviewPage({ dark, user, companionsHidden, onToggleCompanions, onNavigate }) {
  const { data, loading, error, reload } = useApiData('/api/dashboard/summary');
  const invoiceData = useApiData('/api/dashboard/invoices?limit=250');
  const metrics = data?.metrics || {};
  const cards = user.account_type === 'agency' ? [
    { label: 'Client receivables', value: formatMoneyMap(metrics.receivables), detail: 'Across active mandates', icon: Wallet, tone: 'violet' },
    { label: 'Recovered this month', value: formatMoneyMap(metrics.recovered_this_month), detail: 'Verified and allocated', icon: ArrowUpRight, tone: 'indigo' },
    { label: 'Active cases', value: metrics.active_cases ?? '—', detail: 'In authorised portfolios', icon: HeartHandshake, tone: 'blue' },
    { label: 'Active clients', value: metrics.active_clients ?? '—', detail: 'With an active engagement', icon: Users, tone: 'rose' },
  ] : [
    { label: 'Outstanding receivables', value: formatMoneyMap(metrics.receivables), detail: 'Open invoice balances', icon: Wallet, tone: 'violet' },
    { label: 'Overdue amount', value: formatMoneyMap(metrics.overdue_amount), detail: `${metrics.overdue_invoices ?? 0} overdue invoices`, icon: Clock, tone: 'rose' },
    { label: 'Recovered this month', value: formatMoneyMap(metrics.recovered_this_month), detail: 'Verified and allocated', icon: ArrowUpRight, tone: 'indigo' },
    { label: 'Active recovery cases', value: metrics.active_cases ?? '—', detail: `${metrics.open_disputes ?? 0} open disputes`, icon: HeartHandshake, tone: 'blue' },
  ];

  return <>
    <PageHeading dark={dark} eyebrow={user.account_type === 'agency' ? 'Agency workspace' : 'Creditor workspace'} title="Overview" description={`Live receivables and recovery work for ${user.organization_name || (user.account_type === 'agency' ? 'your agency' : 'your business')}.`} showCompanion companion={user.account_type === 'agency' ? 'octopus' : 'cat'} companionsHidden={companionsHidden} onToggleCompanions={onToggleCompanions} />
    <RequestState dark={dark} loading={loading} error={error} onRetry={reload} />
    {data && !error && <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <MetricCard key={card.label} dark={dark} {...card} />)}</div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,.9fr)]">
        <RecoveryChart dark={dark} series={data?.recovery_series || []} />
        <InvoiceMixChart dark={dark} invoices={invoiceData.data?.items || []} loading={invoiceData.loading} error={invoiceData.error} onRetry={invoiceData.reload} />
      </div>
      <div className={`mt-4 grid gap-4 ${user.account_type === 'creditor' ? 'xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]' : ''}`}>
        <section className={`rounded-2xl p-5 ${panelClass(dark)}`}><div className="mb-4 flex items-start justify-between"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Needs attention</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Tasks due today or earlier</p></div><button type="button" onClick={() => onNavigate('pulse')} className="text-xs font-semibold text-violet-500 hover:text-violet-400">View all</button></div>{data?.priority_tasks?.length ? <div className="space-y-2">{data.priority_tasks.slice(0, 5).map((task) => <div key={task.id} className={`flex items-start gap-3 rounded-xl p-3 ${dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}`}><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-600'}`}><CalendarCheck size={14} /></span><div className="min-w-0"><p className={`truncate text-xs font-semibold ${headingClass(dark)}`}>{task.title}</p><p className={`mt-1 text-[10px] ${mutedClass(dark)}`}>{task.case_reference || 'Linked case'} · due {formatDate(task.due_at, { day: 'numeric', month: 'short' })}</p></div></div>)}</div> : <EmptyState dark={dark} title="You’re up to date" detail="No assigned tasks are currently due." icon={Check} />}</section>
        {user.account_type === 'creditor' && <MomentumCard dark={dark} recovered={metrics.recovered_this_month} />}
      </div>
      <section className={`mt-4 rounded-2xl p-5 ${panelClass(dark)}`}><div className="mb-4 flex items-center justify-between"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Recent recovery cases</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Latest cases available in this workspace</p></div><button type="button" onClick={() => onNavigate('pulse')} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${dark ? 'border-[#3a3150] text-violet-200 hover:bg-violet-500/10' : 'border-[#e5def4] text-violet-700 hover:bg-violet-50'}`}>Daily Pulse</button></div>{loading ? null : <CasesTable dark={dark} rows={data?.recent_cases || []} />}</section>
    </>}
  </>;
}

export function DebtorOverviewPage({ dark, user, companionsHidden, onToggleCompanions, onNavigate }) {
  const summary = useApiData('/api/dashboard/summary');
  const invoices = useApiData('/api/dashboard/invoices?limit=250');
  const payments = useApiData('/api/dashboard/payments?limit=5');
  const metrics = summary.data?.metrics || {};
  const invoiceRows = invoices.data?.items || [];
  const openInvoices = invoiceRows.filter((invoice) => !['Settled', 'Cancelled', 'Written off', 'Draft'].includes(invoice.status));

  return <>
    <PageHeading dark={dark} eyebrow="Debtor portal" title={`Welcome back, ${user.full_name?.split(/\s+/)[0] || 'there'}`} description={`Invoices and payment activity shared by ${user.organization_name || 'your creditor'}.`} />
    <RequestState dark={dark} loading={summary.loading} error={summary.error} onRetry={summary.reload} />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard dark={dark} icon={Wallet} label="Outstanding balance" value={formatMoneyMap(metrics.receivables)} detail="Across active invoices" tone="violet" />
      <MetricCard dark={dark} icon={Clock} label="Past due" value={formatMoneyMap(metrics.overdue_amount)} detail={`${metrics.overdue_invoices ?? 0} overdue invoices`} tone="rose" />
      <MetricCard dark={dark} icon={ArrowUpRight} label="Paid this month" value={formatMoneyMap(metrics.recovered_this_month)} detail="Verified payments" tone="indigo" />
      <MetricCard dark={dark} icon={FileText} label="Open invoices" value={metrics.open_invoices ?? openInvoices.length} detail="Awaiting payment or overdue" tone="blue" />
    </div>
    <div className="mb-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,.9fr)]">
      <RecoveryChart dark={dark} series={summary.data?.recovery_series || []} />
      <InvoiceMixChart dark={dark} invoices={invoiceRows} loading={invoices.loading} error={invoices.error} onRetry={invoices.reload} />
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)]">
      <section className={`rounded-2xl p-5 ${panelClass(dark)}`}>
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Invoices to review</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Live balances from your linked account</p></div><button type="button" onClick={() => onNavigate('invoices')} className="text-xs font-semibold text-violet-500 hover:text-violet-400">All invoices</button></div>
        <RequestState dark={dark} loading={invoices.loading} error={invoices.error} onRetry={invoices.reload} />
        {invoices.data && !invoices.error && (openInvoices.length ? <div className="space-y-2">{openInvoices.slice(0, 6).map((invoice) => <div key={invoice.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="min-w-0"><p className={`truncate text-xs font-bold ${headingClass(dark)}`}>{invoice.invoice_number || 'Invoice'} <span className={`ml-1 font-normal ${mutedClass(dark)}`}>· due {formatDate(invoice.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></p><p className={`mt-1 text-[10px] ${mutedClass(dark)}`}>{invoice.status}</p></div><p className={`text-right text-xs font-bold ${headingClass(dark)}`}>{formatMoney(invoice.outstanding_amount, invoice.currency)}</p></div>)}</div> : <EmptyState dark={dark} title="No open invoices" detail="Your account has no unpaid invoices right now." icon={Check} />)}
      </section>
      <section className={`rounded-2xl p-5 ${panelClass(dark)}`}>
        <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Recent payments</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Verified payments applied to invoices</p></div><button type="button" onClick={() => onNavigate('payments')} className="text-xs font-semibold text-violet-500 hover:text-violet-400">History</button></div>
        <RequestState dark={dark} loading={payments.loading} error={payments.error} onRetry={payments.reload} />
        {payments.data && !payments.error && (payments.data.items.length ? <div className="space-y-2">{payments.data.items.map((payment) => <div key={payment.id} className={`flex items-center justify-between gap-3 rounded-xl p-3 ${dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}`}><div className="min-w-0"><p className={`text-xs font-semibold ${headingClass(dark)}`}>{payment.invoice_number || 'Invoice payment'}</p><p className={`mt-1 truncate text-[10px] ${mutedClass(dark)}`}>{formatDate(payment.date)}{payment.reference ? ` · ${payment.reference}` : ''}</p></div><p className={`shrink-0 text-xs font-bold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{formatMoney(payment.amount, payment.currency)}</p></div>)}</div> : <EmptyState dark={dark} title="No payments recorded" detail="Verified payments applied to your invoices will appear here." icon={CreditCard} />)}
      </section>
    </div>
    {!summary.loading && !summary.error && <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${dark ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-100 bg-violet-50/60'}`}><div><p className={`text-xs font-bold ${headingClass(dark)}`}>Need help with an invoice?</p><p className={`mt-1 text-[11px] ${mutedClass(dark)}`}>Contact {user.organization_name || 'your creditor'} using the details on your invoice.</p></div><button type="button" onClick={() => onNavigate('documents')} className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">View documents</button></div>}
  </>;
}

export function PaymentsPage({ dark }) {
  const { data, loading, error, reload } = useApiData('/api/dashboard/payments?limit=250');
  return <>
    <PageHeading dark={dark} eyebrow="Account activity" title="Payments" description="Verified payments applied to invoices in this account." />
    <RequestState dark={dark} loading={loading} error={error} onRetry={reload} />
    {data && !error && <section className={`overflow-hidden rounded-2xl ${panelClass(dark)}`}>
      <div className={`border-b px-5 py-4 ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Payment history</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>{data.total} verified allocations</p></div>
      {data.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className={dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}><tr className={`text-[10px] uppercase tracking-wider ${mutedClass(dark)}`}><th className="px-5 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Invoice</th><th className="px-4 py-3 font-semibold">Reference</th><th className="px-4 py-3 font-semibold">Method</th><th className="px-5 py-3 text-right font-semibold">Amount</th></tr></thead><tbody>{data.items.map((payment) => <tr key={payment.id} className={`border-t ${dark ? 'border-[#302744]' : 'border-[#f0edf6]'}`}><td className={`px-5 py-4 text-xs ${mutedClass(dark)}`}>{formatDate(payment.date)}</td><td className={`px-4 py-4 text-xs font-semibold ${headingClass(dark)}`}>{payment.invoice_number || '—'}</td><td className={`px-4 py-4 text-xs ${mutedClass(dark)}`}>{payment.reference || '—'}</td><td className={`px-4 py-4 text-xs capitalize ${mutedClass(dark)}`}>{payment.method || '—'}</td><td className={`px-5 py-4 text-right text-xs font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{formatMoney(payment.amount, payment.currency)}</td></tr>)}</tbody></table></div> : <div className="p-4"><EmptyState dark={dark} title="No verified payments" detail="Verified payments allocated to invoices will appear here." icon={CreditCard} /></div>}
    </section>}
  </>;
}

export function DailyPulsePage({ dark, user, companionsHidden, onToggleCompanions }) {
  const { data, loading, error, reload } = useApiData('/api/dashboard/tasks?limit=200');
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const tasks = data?.items || [];
  const readOnlyAdmin = user.platform_admin === true;
  const completedCount = tasks.filter((task) => ['completed', 'complete', 'done'].includes(task.status)).length;
  const openCount = tasks.filter((task) => !['completed', 'complete', 'done', 'cancelled'].includes(task.status)).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const act = async (task, action) => {
    setBusyId(task.id);
    setActionError('');
    try {
      await apiRequest(`/api/dashboard/tasks/${encodeURIComponent(task.id)}`, { method: 'PATCH', body: JSON.stringify({ action }) });
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Could not update this task.');
    } finally { setBusyId(''); }
  };

  return <>
    <PageHeading dark={dark} eyebrow="Daily Pulse" title="Your work queue" description="Tasks and follow-ups assigned to your authorised workspace." showCompanion companion={user.account_type === 'agency' ? 'octopus' : 'cat'} companionsHidden={companionsHidden} onToggleCompanions={onToggleCompanions} />
    <RequestState dark={dark} loading={loading} error={error} onRetry={reload} />
    {data && !error && <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><MetricCard dark={dark} icon={CalendarCheck} label="Open tasks" value={openCount} detail="Assigned and not completed" /><MetricCard dark={dark} icon={Check} label="Completed" value={completedCount} detail="In this task list" tone="indigo" /><MetricCard dark={dark} icon={BarChart2} label="Progress" value={`${progress}%`} detail="Completed tasks" tone="blue" /></div>
      {actionError && <div className={`mb-4 rounded-xl border px-4 py-3 text-xs ${dark ? 'border-rose-900/60 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{actionError}</div>}
      <section className={`rounded-2xl p-5 ${panelClass(dark)}`}><div className="mb-4"><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Assigned tasks</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Complete or defer updates the task record.</p></div>{tasks.length ? <div className="space-y-2">{tasks.map((task) => {
        const closed = ['completed', 'complete', 'done', 'cancelled'].includes(task.status);
        const overdue = task.due_at && new Date(task.due_at) < new Date() && !closed;
        return <div key={task.id} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-center ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className={`text-xs ${headingClass(dark)}`}>{task.title}</strong><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${overdue ? (dark ? 'bg-fuchsia-500/15 text-fuchsia-200' : 'bg-fuchsia-50 text-fuchsia-700') : (dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700')}`}>{overdue ? 'Overdue' : task.priority}</span></div><p className={`mt-1 text-[10px] ${mutedClass(dark)}`}>{task.case_reference || 'Case'} · {task.case_id}</p></div><div className={`text-[11px] ${mutedClass(dark)}`}><span className="block font-semibold">Due {formatDate(task.due_at)}</span><span className="mt-0.5 block capitalize">{task.status}</span></div><div className="flex gap-2 sm:justify-end">{closed || readOnlyAdmin ? <span className={`rounded-lg px-3 py-2 text-[10px] font-semibold ${dark ? 'text-violet-200' : 'text-violet-700'}`}>{closed ? task.status : 'Read-only'}</span> : <><button type="button" disabled={busyId === task.id} onClick={() => act(task, 'complete')} className="rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-violet-700 disabled:opacity-60">{busyId === task.id ? 'Saving…' : 'Complete'}</button><button type="button" disabled={busyId === task.id} onClick={() => act(task, 'defer')} className={`rounded-lg border px-3 py-2 text-[10px] font-semibold disabled:opacity-60 ${dark ? 'border-[#44395d] text-violet-200 hover:bg-violet-500/10' : 'border-[#e1d8ef] text-[#5b4778] hover:bg-violet-50'}`}>Defer 1 day</button></>}</div></div>;
      })}</div> : <EmptyState dark={dark} title="No tasks assigned" detail="New tasks assigned to this workspace will appear here." icon={CalendarCheck} />}</section>
    </>}
  </>;
}

export function InvoicesPage({ dark, user, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query.trim());
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const invoicePath = `/api/dashboard/invoices?limit=250${deferredQuery ? `&query=${encodeURIComponent(deferredQuery)}` : ''}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}`;
  const { data, loading, error, reload } = useApiData(invoicePath);
  const { data: debtorData } = useApiData('/api/dashboard/debtors');
  useEffect(() => { if (initialQuery) setQuery(initialQuery); }, [initialQuery]);
  const canCreate = Boolean(data?.can_create);
  const createInvoice = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const payload = {
      debtor_id: form.get('debtor_id'),
      invoice_number: form.get('invoice_number'),
      issue_date: form.get('issue_date'),
      due_date: form.get('due_date'),
      currency: form.get('currency'),
      original_amount: form.get('original_amount'),
    };
    try {
      await apiRequest('/api/dashboard/invoices', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false);
      setNotice('Invoice saved to your creditor workspace.');
      reload();
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : 'Could not save this invoice.');
    } finally { setSaving(false); }
  };

  return <>
    <PageHeading dark={dark} eyebrow={user.account_type === 'debtor' ? 'Your account' : 'Receivables'} title={user.account_type === 'debtor' ? 'My Invoices' : 'Invoices'} description={user.account_type === 'debtor' ? 'View outstanding and paid invoices shared with your linked account.' : 'Invoices from your authorised creditor workspace.'} />
    <RequestState dark={dark} loading={loading} error={error} onRetry={reload} />
    {data && !error && <>
      <section className={`mb-4 rounded-2xl p-4 sm:p-5 ${panelClass(dark)}`}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Invoice register</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>{data?.total ?? 0} records in the current result</p></div><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice or debtor" aria-label="Search invoices" className={`min-w-0 rounded-xl border px-3 py-2 text-xs outline-none focus:border-violet-400 sm:w-60 ${dark ? 'border-[#3a3150] bg-[#171326] text-white placeholder:text-slate-500' : 'border-[#e5def4] bg-[#fbfaff] text-[#241a35]'}`} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter invoices" className={`rounded-xl border px-3 py-2 text-xs ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-[#fbfaff] text-[#241a35]'}`}><option value="">All statuses</option><option>Awaiting payment</option><option>Overdue</option><option>Settled</option><option>Draft</option><option>Cancelled</option></select>{canCreate && <button type="button" onClick={() => setShowForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">{showForm ? <X size={15} /> : <span className="text-base leading-none">+</span>}{showForm ? 'Close' : 'New invoice'}</button>}</div></div>
        {notice && <p className="mt-3 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">{notice}</p>}
        {showForm && <form onSubmit={createInvoice} className={`mt-4 rounded-xl border p-4 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#eee8f6] bg-[#fbfaff]'}`}><h3 className={`mb-3 text-xs font-bold ${headingClass(dark)}`}>Create an invoice record</h3>{formError && <p className="mb-3 text-xs text-rose-500">{formError}</p>}{debtorData?.items?.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><label className={`text-[11px] font-semibold ${mutedClass(dark)}`}>Debtor<select name="debtor_id" required className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#44395d] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`}><option value="">Select a debtor</option>{debtorData.items.map((debtor) => <option key={debtor.id} value={debtor.id}>{debtor.name}</option>)}</select></label><label className={`text-[11px] font-semibold ${mutedClass(dark)}`}>Invoice number<input name="invoice_number" required maxLength="80" className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#44395d] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`} /></label><label className={`text-[11px] font-semibold ${mutedClass(dark)}`}>Original amount<input name="original_amount" required type="number" min="0.01" step="0.01" className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#44395d] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`} /></label><label className={`text-[11px] font-semibold ${mutedClass(dark)}`}>Currency<select name="currency" className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#44395d] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label className={`text-[11px] font-semibold ${mutedClass(dark)}`}>Invoice date<input name="issue_date" type="date" required className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#44395d] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`} /></label><label className={`text-[11px] font-semibold ${mutedClass(dark)}`}>Due date<input name="due_date" type="date" required className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#44395d] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`} /></label></div> : <EmptyState dark={dark} title="Add a debtor first" detail="Invoices must be attached to a real debtor record. Create or import a debtor before adding an invoice." />}<div className="mt-4 flex justify-end"><button type="submit" disabled={saving || !debtorData?.items?.length} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Save invoice'}</button></div></form>}
      </section>
      {data?.items?.length ? <section className={`overflow-hidden rounded-2xl ${panelClass(dark)}`}><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className={dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}><tr className={`text-[10px] uppercase tracking-wider ${mutedClass(dark)}`}><th className="px-5 py-3 font-semibold">Invoice</th><th className="px-4 py-3 font-semibold">{user.account_type === 'debtor' ? 'Account' : 'Debtor'}</th><th className="px-4 py-3 font-semibold">Invoice date</th><th className="px-4 py-3 font-semibold">Due date</th><th className="px-4 py-3 text-right font-semibold">Amount</th><th className="px-4 py-3 text-right font-semibold">Outstanding</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody>{data.items.map((invoice) => <tr key={invoice.id} className={`border-t ${dark ? 'border-[#302744]' : 'border-[#f0edf6]'}`}><td className={`px-5 py-4 text-xs font-bold ${headingClass(dark)}`}>{invoice.invoice_number || '—'}</td><td className={`px-4 py-4 text-xs ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{invoice.client}</td><td className={`px-4 py-4 text-xs ${mutedClass(dark)}`}>{formatDate(invoice.issue_date)}</td><td className={`px-4 py-4 text-xs ${mutedClass(dark)}`}>{formatDate(invoice.due_date)}</td><td className={`px-4 py-4 text-right text-xs ${headingClass(dark)}`}>{formatMoney(invoice.amount, invoice.currency)}</td><td className={`px-4 py-4 text-right text-xs font-semibold ${headingClass(dark)}`}>{formatMoney(invoice.outstanding_amount, invoice.currency)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${invoice.status === 'Overdue' ? (dark ? 'bg-fuchsia-500/15 text-fuchsia-200' : 'bg-fuchsia-50 text-fuchsia-700') : (dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700')}`}>{invoice.status}</span></td></tr>)}</tbody></table></div></section> : !loading && <EmptyState dark={dark} title="No invoices found" detail={query || statusFilter ? 'Try a different search or status filter.' : 'Invoices from this workspace will appear here once they are recorded.'} icon={Wallet} />}
    </>}
  </>;
}

export function ReportsPage({ dark }) {
  const [months, setMonths] = useState(6);
  const { data, loading, error, reload } = useApiData(`/api/dashboard/reports/recovery?months=${months}`);
  const series = data?.series || [];
  const currencies = [...new Set(series.flatMap((item) => Object.keys(item.recovered || {})))];
  const [currency, setCurrency] = useState('');
  useEffect(() => { if (currencies.length && !currencies.includes(currency)) setCurrency(currencies[0]); }, [currencies.join('|'), currency]);
  const selectedCurrency = currency || currencies[0] || 'INR';
  const values = series.map((item) => Number(item.recovered?.[selectedCurrency] || 0));
  const max = Math.max(...values, 0);
  const hasPayments = values.some((value) => value > 0);
  const exportReport = () => {
    const lines = [['Month', 'Currency', 'Verified amount']];
    series.forEach((item) => Object.entries(item.recovered || {}).forEach(([code, amount]) => lines.push([item.label, code, amount])));
    const csv = lines.map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'collectflow-recovery-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <>
    <PageHeading dark={dark} eyebrow="Analytics" title="Reports" description="Recovery totals from verified payments allocated to invoices." />
    <RequestState dark={dark} loading={loading} error={error} onRetry={reload} />
    {data && !error && <>
      <section className={`mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl p-5 ${panelClass(dark)}`}><div><p className={`text-xs ${mutedClass(dark)}`}>Recovered in this period</p><p className={`mt-1 text-3xl font-bold ${headingClass(dark)}`}>{formatMoneyMap(data?.total_recovered)}</p><p className={`mt-1 text-[11px] ${mutedClass(dark)}`}>Only verified and allocated payments are included.</p></div><div className="flex gap-2">{currencies.length > 1 && <select value={selectedCurrency} onChange={(event) => setCurrency(event.target.value)} aria-label="Report currency" className={`rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`}>{currencies.map((code) => <option key={code}>{code}</option>)}</select>}<select value={months} onChange={(event) => setMonths(Number(event.target.value))} aria-label="Report range" className={`rounded-lg border px-3 py-2 text-xs ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`}><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></select><button type="button" disabled={!hasPayments} onClick={exportReport} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${dark ? 'border-[#44395d] text-violet-200 hover:bg-violet-500/10' : 'border-[#e1d8ef] text-violet-700 hover:bg-violet-50'}`}><Download size={14} />Export CSV</button></div></section>
      <section className={`rounded-2xl p-5 ${panelClass(dark)}`}><div className="mb-5"><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Monthly recovery</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Allocated payment amounts, grouped by payment date.</p></div>{hasPayments ? <div className={`grid h-[280px] grid-cols-3 items-end gap-3 rounded-xl border px-4 pb-4 pt-5 sm:grid-cols-6 sm:gap-5 ${dark ? 'border-[#302744] bg-[#171326]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}>{series.map((item, index) => <div key={item.month} className="flex h-full flex-col items-center justify-end gap-2"><span className={`text-[9px] font-semibold sm:text-[10px] ${mutedClass(dark)}`}>{formatMoney(item.recovered?.[selectedCurrency] || 0, selectedCurrency)}</span><div className="flex w-full flex-1 items-end"><div className={`w-full rounded-t-lg bg-gradient-to-t from-violet-700 to-violet-300 ${index === series.length - 1 ? '' : 'opacity-70'}`} style={{ height: `${max ? Math.max(4, (values[index] / max) * 100) : 0}%` }} /></div><span className={`text-[9px] sm:text-[10px] ${mutedClass(dark)}`}>{item.label}</span></div>)}</div> : <EmptyState dark={dark} title="No verified recoveries in this period" detail="When verified payments are allocated to invoices, this report will show the monthly totals." icon={BarChart2} />}</section>
    </>}
  </>;
}

export function DocumentsPage({ dark }) {
  const [query, setQuery] = useState('');
  const search = useDeferredValue(query.trim());
  const path = `/api/dashboard/documents?limit=250${search ? `&query=${encodeURIComponent(search)}` : ''}`;
  const { data, loading, error, reload } = useApiData(path);
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (selected && !data?.items?.some((item) => item.id === selected.id)) setSelected(null); }, [data, selected]);

  return <>
    <PageHeading dark={dark} eyebrow="Evidence" title="Documents" description="Document records attached to invoices and recovery cases you can access." />
    <RequestState dark={dark} loading={loading} error={error} onRetry={reload} />
    {data && !error && <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,.7fr)]"><section className={`rounded-2xl p-4 sm:p-5 ${panelClass(dark)}`}><div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Document records</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>{data?.total ?? 0} accessible records</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search documents" placeholder="Search file, type or case" className={`rounded-xl border px-3 py-2 text-xs outline-none focus:border-violet-400 sm:w-64 ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-[#fbfaff] text-[#241a35]'}`} /></div>{data?.items?.length ? <div className="space-y-2">{data.items.map((document) => <button type="button" key={document.id} onClick={() => setSelected(document)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selected?.id === document.id ? (dark ? 'border-violet-500/60 bg-violet-500/10' : 'border-violet-300 bg-violet-50/70') : (dark ? 'border-[#302744] bg-[#211b34] hover:border-[#51416e]' : 'border-[#f0ebf7] bg-[#fcfbff] hover:border-[#d8c9f2]')}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><FileText size={16} /></span><span className="min-w-0 flex-1"><strong className={`block truncate text-xs ${headingClass(dark)}`}>{document.file_name}</strong><span className={`mt-1 block truncate text-[10px] ${mutedClass(dark)}`}>{document.document_type} · {document.case_reference || 'No case reference'}</span></span><span className={`hidden text-[10px] sm:block ${mutedClass(dark)}`}>{formatDate(document.uploaded_at)}</span></button>)}</div> : !loading && <EmptyState dark={dark} title="No documents found" detail={query ? 'Try another search term.' : 'Documents uploaded to accessible cases will appear here.'} icon={FileText} />}</section>
      <aside className={`h-fit rounded-2xl p-5 ${panelClass(dark)}`}><h2 className={`text-sm font-bold ${headingClass(dark)}`}>{selected ? 'Document details' : 'Secure file access'}</h2>{selected ? <><p className={`mt-3 break-words text-xs font-semibold ${dark ? 'text-violet-200' : 'text-violet-800'}`}>{selected.file_name}</p><dl className={`mt-4 space-y-3 text-xs ${mutedClass(dark)}`}><div><dt className="font-semibold">Type</dt><dd className="mt-0.5">{selected.document_type}</dd></div><div><dt className="font-semibold">Case</dt><dd className="mt-0.5">{selected.case_reference || '—'}</dd></div><div><dt className="font-semibold">Uploaded</dt><dd className="mt-0.5">{formatDate(selected.uploaded_at)}</dd></div><div><dt className="font-semibold">Scan status</dt><dd className="mt-0.5 capitalize">{selected.scan_status}</dd></div></dl><p className={`mt-4 rounded-xl p-3 text-[10px] leading-relaxed ${dark ? 'bg-[#211b34] text-slate-400' : 'bg-[#faf8fd] text-slate-500'}`}>File contents stay behind the storage service. This screen displays the authorised metadata record.</p></> : <p className={`mt-2 text-xs leading-relaxed ${mutedClass(dark)}`}>Select a record to inspect its metadata. Document file access remains governed by the case permissions.</p>}</aside></div>}
  </>;
}

export function SettingsPage({ dark, user, themePreference, onThemeChange, companionsHidden, onToggleCompanions, onSignOut }) {
  const options = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }];
  const companionName = user.account_type === 'debtor' ? 'Jellyfish' : user.account_type === 'agency' ? 'Octopus' : 'Cat';
  return <>
    <PageHeading dark={dark} eyebrow={user.account_type === 'debtor' ? 'Your account' : 'Preferences'} title={user.account_type === 'debtor' ? 'My Profile' : 'Settings'} description={user.account_type === 'debtor' ? 'Review your personal details, portal access and dashboard preferences.' : 'Manage your dashboard appearance and review your signed-in workspace.'} />
    <div className="grid gap-4 xl:grid-cols-2">
      <section className={`rounded-2xl p-5 ${panelClass(dark)}`}><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Appearance</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Your choice is shared with the login screen on this device.</p><div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Color theme">{options.map((option) => <button type="button" key={option.value} aria-pressed={themePreference === option.value} onClick={() => onThemeChange(option.value)} className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${themePreference === option.value ? 'border-violet-600 bg-violet-600 text-white' : dark ? 'border-[#3a3150] text-slate-300 hover:border-violet-400' : 'border-[#e5def4] bg-[#fbfaff] text-[#5b4a70] hover:border-violet-400'}`}>{option.label}</button>)}</div><p className={`mt-3 text-[10px] ${mutedClass(dark)}`}>Currently displaying {dark ? 'dark' : 'light'} mode.</p></section>
      <section className={`rounded-2xl p-5 ${panelClass(dark)}`}><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Account</h2><dl className={`mt-4 space-y-3 text-xs ${mutedClass(dark)}`}><div className="flex justify-between gap-4"><dt>Name</dt><dd className={`text-right font-semibold ${headingClass(dark)}`}>{user.full_name || '—'}</dd></div><div className="flex justify-between gap-4"><dt>Email</dt><dd className={`truncate text-right font-semibold ${headingClass(dark)}`}>{user.email || '—'}</dd></div><div className="flex justify-between gap-4"><dt>{user.account_type === 'debtor' ? 'Creditor' : 'Organisation ID'}</dt><dd className={`text-right font-semibold ${headingClass(dark)}`}>{user.account_type === 'debtor' ? (user.organization_name || '—') : (user.organization_id || '—')}</dd></div><div className="flex justify-between gap-4"><dt>Account type</dt><dd className={`text-right font-semibold capitalize ${headingClass(dark)}`}>{user.account_type}</dd></div></dl></section>
      <section className={`rounded-2xl p-5 xl:col-span-2 ${panelClass(dark)}`}><div className="flex items-center justify-between gap-4"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>{companionName} companion</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>{user.account_type === 'debtor' ? 'Show your movable jellyfish on every dashboard page.' : 'Keep your workspace mascot visible on overview pages.'}</p></div><button type="button" role="switch" aria-label={companionsHidden ? `Show ${companionName.toLowerCase()} companion` : `Hide ${companionName.toLowerCase()} companion`} aria-checked={!companionsHidden} onClick={onToggleCompanions} className={`relative h-7 w-12 rounded-full transition ${companionsHidden ? (dark ? 'bg-slate-700' : 'bg-slate-300') : 'bg-violet-600'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${companionsHidden ? 'left-1' : 'left-6'}`} /></button></div></section>
      {user.account_type === 'debtor' && <section className={`rounded-2xl p-5 xl:col-span-2 ${panelClass(dark)}`}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className={`text-sm font-bold ${headingClass(dark)}`}>Security & sign-in</h2><p className={`mt-1 text-xs ${mutedClass(dark)}`}>This portal is signed in as {user.email || 'your linked account'}. Sign out when you finish using a shared device.</p></div><button type="button" onClick={onSignOut} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold ${dark ? 'border-rose-500/30 text-rose-200 hover:bg-rose-500/10' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}><LogOut size={14} />Sign out of portal</button></div></section>}
    </div>
  </>;
}

export function AdminAccessPage({ dark, user, onOpenWorkspace, onOpenOwnAccount }) {
  const [accountType, setAccountType] = useState('creditor');
  const [selectedCreditorId, setSelectedCreditorId] = useState('');
  const workspacePath = `/api/dashboard/admin/workspaces?type=${accountType === 'debtor' ? 'creditor' : accountType}`;
  const workspaces = useApiData(workspacePath);
  const expectedWorkspaceType = accountType === 'debtor' ? 'creditor' : accountType;
  const workspaceItems = (workspaces.data?.items || []).filter((item) => item.account_type === expectedWorkspaceType);
  const selectedCreditor = workspaceItems.find((item) => item.id === selectedCreditorId) || workspaceItems[0];
  const debtorPath = accountType === 'debtor' && selectedCreditor ? `/api/dashboard/admin/debtors?organization_id=${encodeURIComponent(selectedCreditor.id)}` : '';
  const debtors = useApiData(debtorPath);
  useEffect(() => {
    if (workspaceItems.length && !workspaceItems.some((item) => item.id === selectedCreditorId)) setSelectedCreditorId(workspaceItems[0].id);
    if (!workspaceItems.length) setSelectedCreditorId('');
  }, [workspacePath, workspaceItems, selectedCreditorId]);

  const openOrganization = (workspace) => onOpenWorkspace({
    account_type: workspace.account_type,
    organization_id: workspace.id,
    workspace_name: workspace.name,
  });
  const tabs = [
    { id: 'creditor', label: 'Creditor accounts', icon: Wallet },
    { id: 'agency', label: 'Collection agencies', icon: HeartHandshake },
    { id: 'debtor', label: 'Debtor accounts', icon: Users },
  ];

  return <>
    <PageHeading dark={dark} eyebrow="Platform admin" title={`Welcome, ${user.full_name?.split(/\s+/)[0] || 'Admin'}`} description="Choose an account type and workspace to inspect its live dashboard." />
    {user.account_type === 'creditor' && user.organization_id && <section className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${dark ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-100 bg-violet-50/70'}`}><div><h2 className={`text-xs font-bold ${headingClass(dark)}`}>Your creditor account</h2><p className={`mt-1 text-[11px] ${mutedClass(dark)}`}>Open your own workspace with its normal creditor permissions.</p></div><button type="button" onClick={onOpenOwnAccount} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700">Open my creditor dashboard</button></section>}
    <section className={`mb-5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${dark ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-100 bg-violet-50/70'}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-100 text-violet-700'}`}><Settings size={18} /></span><div><h2 className={`text-xs font-bold ${headingClass(dark)}`}>Read-only account access</h2><p className={`mt-1 text-[11px] leading-relaxed ${mutedClass(dark)}`}>Dashboard reads are recorded in the audit log. Invoice creation and task updates are disabled in admin view.</p></div></section>
    <div className={`mb-4 flex w-max max-w-full gap-1 overflow-x-auto rounded-full border p-1.5 ${dark ? 'border-[#302744] bg-[#171326]' : 'border-[#e8e2f2] bg-white'}`} role="tablist" aria-label="Account type">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={accountType === id} onClick={() => setAccountType(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold sm:px-4 sm:text-xs ${accountType === id ? 'bg-violet-600 text-white' : dark ? 'text-[#b9b0c9] hover:bg-white/5' : 'text-[#766d83] hover:bg-violet-50'}`}><Icon size={15} />{label}</button>)}
    </div>
    <RequestState dark={dark} loading={workspaces.loading} error={workspaces.error} onRetry={workspaces.reload} />
    {accountType === 'debtor' && workspaces.data && <section className={`mb-4 rounded-2xl p-4 ${panelClass(dark)}`}><label className={`block text-xs font-semibold ${mutedClass(dark)}`}>Creditor workspace<select value={selectedCreditor?.id || ''} onChange={(event) => setSelectedCreditorId(event.target.value)} className={`mt-2 block w-full max-w-xl rounded-xl border px-3 py-2.5 text-xs ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-white text-[#241a35]'}`}><option value="">Select a creditor workspace</option>{workspaceItems.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select></label></section>}
    {accountType === 'debtor' && <RequestState dark={dark} loading={debtors.loading} error={debtors.error} onRetry={debtors.reload} />}
    {workspaces.data && !workspaces.loading && accountType !== 'debtor' && (workspaceItems.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{workspaceItems.map((workspace) => <button key={workspace.id} type="button" onClick={() => openOrganization(workspace)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400 ${panelClass(dark)}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}><Wallet size={17} /></span><strong className={`mt-3 block text-sm ${headingClass(dark)}`}>{workspace.name}</strong><span className={`mt-1 block text-[10px] capitalize ${mutedClass(dark)}`}>{workspace.account_type} workspace</span><span className="mt-4 inline-flex rounded-full bg-violet-600 px-3 py-1.5 text-[10px] font-bold text-white">Open dashboard</span></button>)}</div> : <EmptyState dark={dark} title="No active workspaces" detail="Active workspaces of this account type will appear here." icon={Wallet} />)}
    {accountType === 'debtor' && debtors.data && !debtors.loading && (debtors.data.items.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{debtors.data.items.map((debtor) => <button key={debtor.id} type="button" onClick={() => onOpenWorkspace({ account_type: 'debtor', organization_id: selectedCreditor.id, workspace_name: selectedCreditor.name, debtor_id: debtor.id })} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400 ${panelClass(dark)}`}><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}><Users size={17} /></span><strong className={`mt-3 block text-sm ${headingClass(dark)}`}>{debtor.name}</strong><span className={`mt-1 block truncate text-[10px] ${mutedClass(dark)}`}>{debtor.email || 'Active portal account'}</span><span className="mt-4 inline-flex rounded-full bg-violet-600 px-3 py-1.5 text-[10px] font-bold text-white">Open debtor portal</span></button>)}</div> : <EmptyState dark={dark} title="No active debtor accounts" detail="Debtors with an accepted portal invitation will appear under their creditor workspace." icon={Users} />)}
  </>;
}

