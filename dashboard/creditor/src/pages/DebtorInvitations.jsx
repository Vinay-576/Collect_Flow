import React, { useState } from 'react';
import { Check, Clipboard, Mail, RefreshCw, UserPlus, Users } from 'lucide-react';
import { apiRequest, useApiData } from '../../../shared/src/lib/api';
import { formatDate } from '../../../shared/src/lib/format';

const panel = (dark) => dark ? 'border border-[#302744] bg-[#19152a]' : 'border border-[#e8e2f2] bg-white shadow-[0_8px_30px_rgba(50,34,89,.04)]';
const heading = (dark) => dark ? 'text-white' : 'text-[#241a35]';
const muted = (dark) => dark ? 'text-[#aaa2bd]' : 'text-[#746b83]';
const field = (dark) => `mt-1 block w-full rounded-xl border px-3 py-2.5 text-xs outline-none focus:border-violet-400 ${dark ? 'border-[#3a3150] bg-[#171326] text-white' : 'border-[#e5def4] bg-[#fbfaff] text-[#241a35]'}`;

export default function DebtorInvitations({ dark, user }) {
  const invitations = useApiData('/api/auth/debtor-invitations');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true); setError(''); setNotice(null); setCopied(false);
    try {
      const result = await apiRequest('/api/auth/debtor-invitations', {
        method: 'POST',
        body: JSON.stringify({ email: String(form.get('email') || '').trim().toLowerCase(), debtor_name: String(form.get('debtor_name') || '').trim() || undefined }),
      });
      setNotice(result);
      formElement.reset();
      invitations.reload();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create the invitation.');
    } finally { setBusy(false); }
  };

  const copyCode = async () => {
    if (!notice?.invitation_code) return;
    try {
      await navigator.clipboard.writeText(notice.invitation_code);
      setCopied(true);
    } catch {
      setError('Copy was blocked by this browser. Select the code and copy it manually.');
    }
  };

  const resend = (item) => {
    const form = document.getElementById('debtor-invitation-form');
    if (!form) return;
    form.elements.email.value = item.email;
    form.elements.debtor_name.value = item.debtor_name || '';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!busy) form.requestSubmit();
  };

  return <>
    <div className="mb-6"><p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-violet-500">Debtor access</p><h1 className={`text-[25px] font-bold tracking-tight sm:text-[30px] ${heading(dark)}`}>Invite a debtor</h1><p className={`mt-1 max-w-2xl text-sm ${muted(dark)}`}>Send a one-time sign-up code to the email address linked to an invoice. Debtors must register using that same address.</p></div>

    {error && <div role="alert" className={`mb-4 rounded-xl border px-4 py-3 text-xs ${dark ? 'border-rose-900/60 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{error}</div>}
    {notice && <section role="status" className={`mb-4 rounded-2xl border p-5 ${dark ? 'border-violet-500/25 bg-violet-500/10' : 'border-violet-200 bg-violet-50/80'}`}><div className="flex items-start gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${dark ? 'bg-violet-500/20 text-violet-200' : 'bg-violet-100 text-violet-700'}`}><Mail size={17} /></span><div className="min-w-0 flex-1"><h2 className={`text-sm font-bold ${heading(dark)}`}>{notice.delivery_status === 'sent' ? 'Invitation email sent' : 'Invitation created'}</h2><p className={`mt-1 text-xs leading-relaxed ${muted(dark)}`}>{notice.message}</p>{notice.invitation_code && <div className="mt-4 rounded-xl border border-violet-300/50 bg-white/70 p-3 dark:border-violet-400/20 dark:bg-[#171326]"><p className={`text-[10px] font-bold uppercase tracking-wider ${muted(dark)}`}>One-time invitation code · expires {formatDate(notice.expires_at)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><code className={`min-w-0 flex-1 break-all rounded-lg px-3 py-2 text-xs font-bold ${dark ? 'bg-[#100d1b] text-violet-200' : 'bg-white text-violet-800'}`}>{notice.invitation_code}</code><button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white">{copied ? <Check size={13} /> : <Clipboard size={13} />}{copied ? 'Copied' : 'Copy code'}</button></div><p className={`mt-2 text-[10px] ${muted(dark)}`}>Share this code only with the invited person. They must use the email address you invited.</p></div>}</div></div></section>}

    <section className={`mb-5 rounded-2xl p-5 sm:p-6 ${panel(dark)}`}><div className="mb-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><UserPlus size={18} /></span><div><h2 className={`text-sm font-bold ${heading(dark)}`}>Create invitation</h2><p className={`mt-1 text-xs ${muted(dark)}`}>The code is valid once and expires after 7 days.</p></div></div><form id="debtor-invitation-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className={`text-[11px] font-semibold ${muted(dark)}`}>Debtor email<input name="email" type="email" required maxLength="254" autoComplete="email" placeholder="customer@example.com" className={field(dark)} /></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>Debtor name (optional)<input name="debtor_name" maxLength="120" autoComplete="name" placeholder="Customer name" className={field(dark)} /></label><div className="sm:col-span-2"><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60">{busy ? <><RefreshCw size={14} className="animate-spin" />Creating…</> : <><Mail size={14} />Send invitation</>}</button></div></form></section>

    <section className={`overflow-hidden rounded-2xl ${panel(dark)}`}><div className={`border-b px-5 py-4 ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}><div className="flex items-center gap-2"><Users size={16} className="text-violet-500" /><h2 className={`text-sm font-bold ${heading(dark)}`}>Recent invitations</h2></div><p className={`mt-1 text-xs ${muted(dark)}`}>Invitation codes are never stored or shown in this history.</p></div>{invitations.loading ? <p className={`px-5 py-6 text-xs ${muted(dark)}`}>Loading invitations…</p> : invitations.error ? <div className={`flex items-center justify-between gap-3 px-5 py-4 text-xs ${dark ? 'text-rose-200' : 'text-rose-800'}`}><span>{invitations.error}</span><button type="button" onClick={invitations.reload} className="font-bold underline">Retry</button></div> : invitations.data?.items?.length ? <div className="divide-y divide-[#f0ebf7] dark:divide-[#302744]">{invitations.data.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><strong className={`block truncate text-xs ${heading(dark)}`}>{item.debtor_name || item.email}</strong><span className={`mt-1 block truncate text-[10px] ${muted(dark)}`}>{item.email} · created {formatDate(item.created_at)}{item.expires_at ? ` · expires ${formatDate(item.expires_at)}` : ''}</span></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${item.status === 'accepted' ? (dark ? 'bg-emerald-500/15 text-emerald-200' : 'bg-emerald-50 text-emerald-700') : item.delivery_status === 'sent' ? (dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700') : (dark ? 'bg-amber-500/15 text-amber-200' : 'bg-amber-50 text-amber-800')}`}>{item.status === 'pending' ? item.delivery_status === 'sent' ? 'email sent' : item.delivery_status === 'failed' ? 'email failed' : 'manual code' : item.status}</span>{item.status === 'pending' && <button type="button" onClick={() => resend(item)} className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${dark ? 'border-[#44395d] text-violet-200 hover:bg-violet-500/10' : 'border-[#e1d8ef] text-violet-700 hover:bg-violet-50'}`}>Resend</button>}</div></div>)}</div> : <p className={`px-5 py-8 text-center text-xs ${muted(dark)}`}>No debtor invitations yet. Create one above to send a sign-up code.</p>}</section>
    {user.platform_admin && <p className={`mt-4 text-[10px] ${muted(dark)}`}>Platform administrator account views are read-only.</p>}
  </>;
}
