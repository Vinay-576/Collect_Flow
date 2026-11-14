import React, { useDeferredValue, useMemo, useState } from 'react';
import { AlertCircle, Briefcase, CalendarClock, FileText, HeartHandshake, RefreshCw, Search, Users } from 'lucide-react';
import { formatDate, formatMoney, formatMoneyMap } from '../../../shared/src/lib/format';
import { useApiData } from '../../../shared/src/lib/api';

const panelClass = (dark) => dark
  ? 'border border-[#302744] bg-[#19152a]'
  : 'border border-[#e8e2f2] bg-white shadow-[0_8px_30px_rgba(50,34,89,.04)]';
const titleClass = (dark) => dark ? 'text-white' : 'text-[#241a35]';
const mutedClass = (dark) => dark ? 'text-[#aaa2bd]' : 'text-[#746b83]';

function Heading({ dark, title, detail, icon: Icon }) {
  return <div className="mb-5 flex items-center gap-3">
    {Icon && <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}><Icon size={19} /></span>}
    <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-500">Agency workspace</p><h1 className={`mt-1 text-2xl font-bold tracking-tight ${titleClass(dark)}`}>{title}</h1><p className={`mt-1 text-xs ${mutedClass(dark)}`}>{detail}</p></div>
  </div>;
}

function DataState({ dark, loading, error, onRetry, empty, children }) {
  if (loading) return <div className={`flex items-center gap-2 rounded-2xl border p-5 text-xs ${panelClass(dark)} ${mutedClass(dark)}`}><RefreshCw size={14} className="animate-spin text-violet-500" />Loading authorised workspace data…</div>;
  if (error) return <div className={`flex items-center justify-between gap-3 rounded-2xl border p-5 text-xs ${dark ? 'border-rose-900/60 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span className="flex items-center gap-2"><AlertCircle size={15} />{error}</span><button onClick={onRetry} type="button" className="font-bold underline underline-offset-2">Retry</button></div>;
  if (empty) return <div className={`rounded-2xl border border-dashed p-10 text-center ${dark ? 'border-[#3a3150] bg-[#171326]' : 'border-[#e5def4] bg-[#fbfaff]'}`}><p className={`text-sm font-semibold ${titleClass(dark)}`}>Nothing to show yet</p><p className={`mt-1 text-xs ${mutedClass(dark)}`}>Records shared with this agency will appear here when they are added.</p></div>;
  return children;
}

function Metric({ dark, label, value, detail, icon: Icon }) {
  return <section className={`rounded-2xl border p-4 ${panelClass(dark)}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[11px] ${mutedClass(dark)}`}>{label}</p><p className={`mt-2 text-xl font-bold ${titleClass(dark)}`}>{value}</p><p className={`mt-1 text-[10px] ${mutedClass(dark)}`}>{detail}</p></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}><Icon size={16} /></span></div></section>;
}

function Table({ dark, columns, rows, emptyLabel = 'No matching records' }) {
  if (!rows.length) return <DataState dark={dark} empty />;
  return <div className={`overflow-hidden rounded-2xl border ${panelClass(dark)}`}><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className={dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}><tr className={`text-[10px] uppercase tracking-wider ${mutedClass(dark)}`}>{columns.map((column) => <th key={column.key} className={`px-4 py-3 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id} className={`border-t ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}>{columns.map((column) => <td key={column.key} className={`px-4 py-3 text-xs ${column.align === 'right' ? 'text-right' : ''} ${column.strong ? `font-semibold ${titleClass(dark)}` : mutedClass(dark)}`}>{column.render ? column.render(row) : row[column.key] || '—'}</td>)}</tr>) : <tr><td colSpan={columns.length} className={`px-4 py-8 text-center text-xs ${mutedClass(dark)}`}>{emptyLabel}</td></tr>}</tbody></table></div></div>;
}

function SearchBox({ dark, value, onChange, label }) {
  return <label className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 ${dark ? 'border-[#3a3150] bg-[#171326]' : 'border-[#e5def4] bg-white'}`}><Search size={15} className={mutedClass(dark)} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} aria-label={label} className={`w-full bg-transparent text-xs outline-none ${dark ? 'text-white placeholder:text-slate-500' : 'text-[#352747] placeholder:text-[#9a92a5]'}`} /></label>;
}

export function AgencyClientsPage({ dark, onNavigate }) {
  const clients = useApiData('/api/dashboard/agency/clients');
  const summary = useApiData('/api/dashboard/summary');
  const rows = clients.data?.items || [];
  return <>
    <Heading dark={dark} title="Clients & Portfolios" detail="Authorised client engagements, portfolios and current recovery exposure." icon={Briefcase} />
    <div className="mb-4 grid gap-3 sm:grid-cols-3"><Metric dark={dark} label="Active clients" value={summary.data?.metrics?.active_clients ?? '—'} detail="Current agency mandates" icon={Users} /><Metric dark={dark} label="Active portfolios" value={summary.data?.metrics?.active_portfolios ?? '—'} detail="Within your engagement scope" icon={Briefcase} /><Metric dark={dark} label="Active cases" value={summary.data?.metrics?.active_cases ?? '—'} detail="Open and in progress" icon={HeartHandshake} /></div>
    <DataState dark={dark} loading={clients.loading} error={clients.error} onRetry={clients.reload} empty={!clients.loading && !clients.error && !rows.length}>
      <div className={`overflow-hidden rounded-2xl border ${panelClass(dark)}`}><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className={dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}><tr className={`text-[10px] uppercase tracking-wider ${mutedClass(dark)}`}><th className="px-4 py-3 font-semibold">Client</th><th className="px-4 py-3 font-semibold">Portfolios</th><th className="px-4 py-3 text-right font-semibold">Active cases</th><th className="px-4 py-3 text-right font-semibold">Outstanding</th><th className="px-4 py-3 font-semibold">Engagement</th><th className="px-4 py-3" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={`border-t ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}><td className={`px-4 py-4 text-xs font-bold ${titleClass(dark)}`}>{row.name}</td><td className={`px-4 py-4 text-xs ${mutedClass(dark)}`}>{row.portfolios?.length ? row.portfolios.map((portfolio) => portfolio.name).join(', ') : 'No active portfolio'}</td><td className={`px-4 py-4 text-right text-xs font-semibold ${titleClass(dark)}`}>{row.active_cases}</td><td className={`px-4 py-4 text-right text-xs font-semibold ${titleClass(dark)}`}>{formatMoneyMap(row.outstanding_amount)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${dark ? 'bg-emerald-500/10 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}`}>{row.status}</span></td><td className="px-4 py-4 text-right"><button type="button" onClick={() => onNavigate('cases')} className="text-[10px] font-bold text-violet-500 hover:text-violet-400">View cases</button></td></tr>)}</tbody></table></div></div>
    </DataState>
  </>;
}

export function AgencyCasesPage({ dark }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const data = useApiData('/api/dashboard/cases?limit=250');
  const rows = useMemo(() => (data.data?.items || []).filter((row) => !deferredQuery || `${row.case_reference} ${row.client} ${row.debtor} ${row.status} ${row.assigned_collector}`.toLowerCase().includes(deferredQuery)), [data.data, deferredQuery]);
  return <>
    <Heading dark={dark} title="Recovery Cases" detail="Review case ownership, status, client and outstanding balances." icon={HeartHandshake} />
    <SearchBox dark={dark} value={query} onChange={setQuery} label="Search cases, clients or debtors" />
    <DataState dark={dark} loading={data.loading} error={data.error} onRetry={data.reload} empty={!data.loading && !data.error && !rows.length}>
      <Table dark={dark} rows={rows} columns={[
        { key: 'case_reference', label: 'Case', strong: true }, { key: 'client', label: 'Client' }, { key: 'debtor', label: 'Debtor' },
        { key: 'assigned_collector', label: 'Collector' }, { key: 'status', label: 'Status' }, { key: 'outstanding_amount', label: 'Outstanding', align: 'right', render: (row) => formatMoneyMap(row.outstanding_amount) },
      ]} />
    </DataState>
  </>;
}

export function AgencyDebtorsPage({ dark }) {
  const data = useApiData('/api/dashboard/debtors');
  const rows = data.data?.items || [];
  return <>
    <Heading dark={dark} title="Debtors" detail="Debtor accounts associated with your authorised recovery cases." icon={Users} />
    <DataState dark={dark} loading={data.loading} error={data.error} onRetry={data.reload} empty={!data.loading && !data.error && !rows.length}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article key={row.id} className={`rounded-2xl border p-4 ${panelClass(dark)}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className={`truncate text-sm font-bold ${titleClass(dark)}`}>{row.name}</h2><p className={`mt-1 truncate text-[10px] ${mutedClass(dark)}`}>{row.client}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}>{row.case_count} cases</span></div><p className={`mt-4 text-[10px] ${mutedClass(dark)}`}>Outstanding balance</p><p className={`mt-1 text-lg font-bold ${titleClass(dark)}`}>{formatMoneyMap(row.outstanding_amount)}</p><p className={`mt-2 truncate text-[10px] ${mutedClass(dark)}`}>{row.email || 'Contact details not shared'}</p></article>)}</div>
    </DataState>
  </>;
}

export function AgencyPromisesPage({ dark }) {
  const data = useApiData('/api/dashboard/promises');
  const rows = data.data?.items || [];
  return <>
    <Heading dark={dark} title="Promises to Pay" detail="Track agreed amounts, due dates and missed commitments across authorised cases." icon={CalendarClock} />
    <DataState dark={dark} loading={data.loading} error={data.error} onRetry={data.reload} empty={!data.loading && !data.error && !rows.length}>
      <Table dark={dark} rows={rows} columns={[
        { key: 'case_reference', label: 'Case', strong: true }, { key: 'client', label: 'Client' }, { key: 'debtor', label: 'Debtor' },
        { key: 'due_date', label: 'Promise date', render: (row) => formatDate(row.due_date) }, { key: 'amount', label: 'Promised amount', align: 'right', render: (row) => formatMoney(row.amount, row.currency) },
        { key: 'status', label: 'Status' },
      ]} />
    </DataState>
  </>;
}

export function AgencyDisputesPage({ dark }) {
  const data = useApiData('/api/dashboard/disputes');
  const rows = data.data?.items || [];
  return <>
    <Heading dark={dark} title="Disputes" detail="Review debtor disputes linked to cases in your authorised portfolio." icon={FileText} />
    <DataState dark={dark} loading={data.loading} error={data.error} onRetry={data.reload} empty={!data.loading && !data.error && !rows.length}>
      <Table dark={dark} rows={rows} columns={[
        { key: 'reference', label: 'Dispute', strong: true }, { key: 'client', label: 'Client' }, { key: 'debtor', label: 'Debtor' },
        { key: 'case_reference', label: 'Case' }, { key: 'opened_at', label: 'Opened', render: (row) => formatDate(row.opened_at) }, { key: 'status', label: 'Status' },
      ]} />
    </DataState>
  </>;
}

export function AgencyTeamPage({ dark }) {
  const data = useApiData('/api/dashboard/agency/team');
  const rows = data.data?.items || [];
  return <>
    <Heading dark={dark} title="Team & Collectors" detail="Collector workload based on case assignments in this workspace." icon={Users} />
    <p className={`mb-4 text-[11px] ${mutedClass(dark)}`}>This view reflects names and assignments recorded on cases. Workspace permissions remain managed by your agency administrator.</p>
    <DataState dark={dark} loading={data.loading} error={data.error} onRetry={data.reload} empty={!data.loading && !data.error && !rows.length}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((row) => <article key={row.id} className={`rounded-2xl border p-4 ${panelClass(dark)}`}><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-full ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}><Users size={17} /></span><div className="min-w-0"><h2 className={`truncate text-sm font-bold ${titleClass(dark)}`}>{row.name}</h2><p className={`mt-1 text-[10px] ${mutedClass(dark)}`}>Assigned collector</p></div></div><div className={`mt-4 grid grid-cols-2 gap-3 border-t pt-3 ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}><div><p className={`text-[10px] ${mutedClass(dark)}`}>Active cases</p><p className={`mt-1 text-lg font-bold ${titleClass(dark)}`}>{row.active_cases}</p></div><div><p className={`text-[10px] ${mutedClass(dark)}`}>Open exposure</p><p className={`mt-1 truncate text-sm font-bold ${titleClass(dark)}`}>{formatMoneyMap(row.outstanding_amount)}</p></div></div></article>)}</div>
    </DataState>
  </>;
}

