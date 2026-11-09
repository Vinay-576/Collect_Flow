import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileText,
  MessageSquareText,
  Send,
  Upload,
  Wallet,
} from 'lucide-react';
import { apiRequest, downloadFile, useApiData } from '../../../shared/src/lib/api';
import { formatDate, formatMoney } from '../../../shared/src/lib/format';

const panel = (dark) => dark
  ? 'border border-[#302744] bg-[#19152a]'
  : 'border border-[#e8e2f2] bg-white shadow-[0_8px_30px_rgba(50,34,89,.04)]';
const title = (dark) => dark ? 'text-white' : 'text-[#241a35]';
const muted = (dark) => dark ? 'text-[#aaa2bd]' : 'text-[#746b83]';
const field = (dark) => `w-full rounded-xl border px-3 py-2.5 text-xs outline-none transition focus:border-violet-400 ${dark ? 'border-[#3a3150] bg-[#171326] text-white placeholder:text-slate-500' : 'border-[#e5def4] bg-[#fbfaff] text-[#241a35]'}`;

function Heading({ dark, eyebrow, name, detail }) {
  return <div className="mb-6"><p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-violet-500">{eyebrow}</p><h1 className={`text-[25px] font-bold tracking-tight sm:text-[30px] ${title(dark)}`}>{name}</h1><p className={`mt-1 max-w-2xl text-sm ${muted(dark)}`}>{detail}</p></div>;
}

function State({ dark, loading, error, retry }) {
  if (loading) return <div className={`mb-4 flex items-center gap-2 text-xs ${muted(dark)}`}><span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-t-violet-700" />Loading your account…</div>;
  if (error) return <div className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${dark ? 'border-rose-900/60 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><span className="flex items-center gap-2"><AlertCircle size={15} />{error}</span><button type="button" onClick={retry} className="font-bold underline underline-offset-2">Retry</button></div>;
  return null;
}

function Notice({ dark, error, children }) {
  if (!children && !error) return null;
  return <p role={error ? 'alert' : 'status'} className={`mb-4 rounded-xl border px-4 py-3 text-xs ${error ? (dark ? 'border-rose-900/60 bg-rose-950/20 text-rose-200' : 'border-rose-200 bg-rose-50 text-rose-800') : (dark ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}`}>{error || children}</p>;
}

function Empty({ dark, children }) {
  return <div className={`rounded-xl border border-dashed px-5 py-9 text-center text-xs ${dark ? 'border-[#3a3150] bg-[#171326] text-[#aaa2bd]' : 'border-[#e5def4] bg-[#fbfaff] text-[#746b83]'}`}>{children}</div>;
}

function ReadOnlyNote({ dark }) {
  return <p className={`rounded-xl border px-4 py-3 text-xs ${dark ? 'border-violet-500/20 bg-violet-500/5 text-violet-200' : 'border-violet-100 bg-violet-50/70 text-violet-800'}`}>Platform admin view is read-only. Account members can submit updates from their own sign-in.</p>;
}

function InvoiceOptions({ invoices = [], dark, name = 'invoice_id', includeSettled = false }) {
  const open = invoices.filter((invoice) => (includeSettled || Number(invoice.outstanding_amount) > 0) && !['Draft', 'Cancelled', 'Written off'].includes(invoice.status));
  return <select name={name} required className={field(dark)} defaultValue=""><option value="">Select an outstanding invoice</option>{open.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} · {formatMoney(invoice.outstanding_amount, invoice.currency)} due {formatDate(invoice.due_date)}</option>)}</select>;
}

export function DebtorPaymentsPage({ dark }) {
  const payments = useApiData('/api/dashboard/payments?limit=250');
  const documents = useApiData('/api/dashboard/documents?limit=250');
  const receipts = (documents.data?.items || []).filter((item) => /receipt|proof of payment/i.test(item.document_type || item.file_name));
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState('');
  const download = async (document) => {
    setDownloading(document.id); setDownloadError('');
    try { await downloadFile(`/api/dashboard/documents/${encodeURIComponent(document.id)}/download`, document.file_name); }
    catch (error) { setDownloadError(error instanceof Error ? error.message : 'Could not download this receipt.'); }
    finally { setDownloading(''); }
  };
  return <>
    <Heading dark={dark} eyebrow="Account activity" name="Payments" detail="Review verified payments applied to your invoices and download receipts shared with your account." />
    <State dark={dark} loading={payments.loading} error={payments.error} retry={payments.reload} />
    <State dark={dark} loading={documents.loading} error={documents.error} retry={documents.reload} />
    <Notice dark={dark} error={downloadError} />
    <section className={`mb-4 overflow-hidden rounded-2xl ${panel(dark)}`}>
      <div className={`border-b px-5 py-4 ${dark ? 'border-[#302744]' : 'border-[#f0ebf7]'}`}><h2 className={`text-sm font-bold ${title(dark)}`}>Payment history</h2><p className={`mt-1 text-xs ${muted(dark)}`}>{payments.data?.total ?? '—'} verified payment records</p></div>
      {payments.data?.items?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className={dark ? 'bg-[#211b34]' : 'bg-[#faf8fd]'}><tr className={`text-[10px] uppercase tracking-wider ${muted(dark)}`}><th className="px-5 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Invoice</th><th className="px-4 py-3 font-semibold">Reference</th><th className="px-4 py-3 font-semibold">Method</th><th className="px-5 py-3 text-right font-semibold">Amount</th></tr></thead><tbody>{payments.data.items.map((payment) => <tr key={payment.id} className={`border-t ${dark ? 'border-[#302744]' : 'border-[#f0edf6]'}`}><td className={`px-5 py-4 text-xs ${muted(dark)}`}>{formatDate(payment.date)}</td><td className={`px-4 py-4 text-xs font-semibold ${title(dark)}`}>{payment.invoice_number || '—'}</td><td className={`px-4 py-4 text-xs ${muted(dark)}`}>{payment.reference || '—'}</td><td className={`px-4 py-4 text-xs capitalize ${muted(dark)}`}>{payment.method || '—'}</td><td className={`px-5 py-4 text-right text-xs font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{formatMoney(payment.amount, payment.currency)}</td></tr>)}</tbody></table></div> : !payments.loading && !payments.error && <div className="p-4"><Empty dark={dark}>Verified payment records will appear here after they are allocated to your invoices.</Empty></div>}
    </section>
    <section className={`rounded-2xl p-5 ${panel(dark)}`}><div className="mb-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><ArrowDownToLine size={18} /></span><div><h2 className={`text-sm font-bold ${title(dark)}`}>Payment receipts</h2><p className={`mt-1 text-xs ${muted(dark)}`}>Receipt files shared with your linked account</p></div></div>{receipts.length ? <div className="space-y-2">{receipts.map((receipt) => <div key={receipt.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="min-w-0"><strong className={`block truncate text-xs ${title(dark)}`}>{receipt.file_name}</strong><span className={`mt-1 block text-[10px] ${muted(dark)}`}>{receipt.invoice_number || receipt.case_reference || 'Payment proof'} · {formatDate(receipt.uploaded_at)}</span></div>{receipt.download_available && <button type="button" disabled={downloading === receipt.id} onClick={() => download(receipt)} className="inline-flex items-center gap-2 rounded-lg border border-violet-300 px-3 py-2 text-[10px] font-bold text-violet-700 disabled:opacity-60 dark:border-violet-500/40 dark:text-violet-200">{downloading === receipt.id ? 'Downloading…' : <><ArrowDownToLine size={13} />Download</>}</button>}</div>)}</div> : !documents.loading && <Empty dark={dark}>Receipts uploaded by you or shared by your creditor will appear here.</Empty>}</section>
  </>;
}

export function DebtorPaymentPlansPage({ dark, readOnly = false }) {
  const plans = useApiData('/api/dashboard/debtor/payment-plans');
  const invoices = useApiData('/api/dashboard/invoices?limit=250');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    try {
      await apiRequest('/api/dashboard/debtor/payment-plans', { method: 'POST', body: JSON.stringify({ invoice_id: values.get('invoice_id'), installment_count: Number(values.get('installment_count')), first_payment_date: values.get('first_payment_date'), note: values.get('note') }) });
      formElement.reset(); setNotice('Your payment plan request was sent to your creditor.'); plans.reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not send your request.'); }
    finally { setSaving(false); }
  };
  return <>
    <Heading dark={dark} eyebrow="Payment options" name="Payment Plans" detail="View commitments already recorded for your account or ask your creditor to review an installment plan." />
    <State dark={dark} loading={plans.loading || invoices.loading} error={plans.error || invoices.error} retry={() => { plans.reload(); invoices.reload(); }} />
    <Notice dark={dark} error={error}>{notice}</Notice>
    <section className={`mb-4 rounded-2xl p-5 ${panel(dark)}`}><div className="mb-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><CalendarClock size={18} /></span><div><h2 className={`text-sm font-bold ${title(dark)}`}>Request installments</h2><p className={`mt-1 text-xs ${muted(dark)}`}>Your creditor must approve a request before it becomes an agreed plan.</p></div></div>
      {readOnly ? <ReadOnlyNote dark={dark} /> : invoices.data && <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className={`text-[11px] font-semibold ${muted(dark)}`}>Invoice<InvoiceOptions invoices={invoices.data.items} dark={dark} /></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>Number of installments<select name="installment_count" required defaultValue="3" className={field(dark)}>{[2,3,4,5,6,8,10,12].map((value) => <option key={value} value={value}>{value} installments</option>)}</select></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>First payment date<input name="first_payment_date" type="date" min={new Date().toISOString().slice(0,10)} required className={field(dark)} /></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>Message (optional)<input name="note" maxLength="500" placeholder="Add a note for your creditor" className={field(dark)} /></label><div className="sm:col-span-2"><button type="submit" disabled={saving || !invoices.data.items.some((invoice) => Number(invoice.outstanding_amount) > 0)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Sending…' : 'Send plan request'}</button></div></form>}
    </section>
    <section className={`rounded-2xl p-5 ${panel(dark)}`}><h2 className={`text-sm font-bold ${title(dark)}`}>Your payment commitments</h2><p className={`mt-1 mb-4 text-xs ${muted(dark)}`}>Recorded installments and requests from your linked creditor account.</p>
      {plans.data && <>
        {(plans.data.requests?.length || plans.data.items?.length) ? <div className="space-y-2">{(plans.data.items || []).map((item) => <article key={`promise-${item.id}`} className={`rounded-xl border p-4 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className={`text-xs ${title(dark)}`}>{item.invoice_number || 'Payment commitment'}</strong><p className={`mt-1 text-[10px] ${muted(dark)}`}>Due {formatDate(item.due_date)}{item.installment_number ? ` · installment ${item.installment_number}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}>{item.status}</span></div><p className={`mt-3 text-sm font-bold ${title(dark)}`}>{formatMoney(item.amount, item.currency)}</p></article>)}{(plans.data.requests || []).map((item) => <article key={`request-${item.id}`} className={`rounded-xl border p-4 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className={`text-xs ${title(dark)}`}>{item.invoice_number || 'Installment plan request'}</strong><p className={`mt-1 text-[10px] ${muted(dark)}`}>{item.installment_count} installments · first payment {formatDate(item.first_payment_date)}</p></div><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold capitalize text-amber-700 dark:text-amber-200">{item.status}</span></div>{item.note && <p className={`mt-2 text-xs ${muted(dark)}`}>{item.note}</p>}</article>)}</div> : <Empty dark={dark}>Your payment commitments and plan requests will appear here.</Empty>}
      </>}
    </section>
  </>;
}

export function DebtorDisputesPage({ dark, readOnly = false }) {
  const disputes = useApiData('/api/dashboard/debtor/disputes');
  const invoices = useApiData('/api/dashboard/invoices?limit=250');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    try {
      await apiRequest('/api/dashboard/debtor/disputes', { method: 'POST', body: JSON.stringify({ invoice_id: values.get('invoice_id'), reason: values.get('reason'), details: values.get('details') }) });
      formElement.reset(); setNotice('Your dispute has been submitted for review.'); disputes.reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not submit your dispute.'); }
    finally { setSaving(false); }
  };
  return <>
    <Heading dark={dark} eyebrow="Invoice help" name="Disputes" detail="Raise a question about an invoice and follow the status of disputes linked to your account." />
    <State dark={dark} loading={disputes.loading || invoices.loading} error={disputes.error || invoices.error} retry={() => { disputes.reload(); invoices.reload(); }} />
    <Notice dark={dark} error={error}>{notice}</Notice>
    <section className={`mb-4 rounded-2xl p-5 ${panel(dark)}`}><div className="mb-4"><h2 className={`text-sm font-bold ${title(dark)}`}>Raise a dispute</h2><p className={`mt-1 text-xs ${muted(dark)}`}>Choose an invoice and describe what needs to be reviewed.</p></div>{readOnly ? <ReadOnlyNote dark={dark} /> : invoices.data && <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className={`text-[11px] font-semibold ${muted(dark)}`}>Invoice<InvoiceOptions invoices={invoices.data.items} dark={dark} includeSettled /></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>Reason<select required name="reason" defaultValue="" className={field(dark)}><option value="" disabled>Select a reason</option>{['Already paid','Incorrect amount','Duplicate invoice','Goods or services issue','Invoice details need correction','Other'].map((reason) => <option key={reason}>{reason}</option>)}</select></label><label className={`text-[11px] font-semibold sm:col-span-2 ${muted(dark)}`}>Details<textarea name="details" required minLength="10" maxLength="3000" rows="4" placeholder="Add enough detail to help your creditor review this" className={`${field(dark)} mt-1 resize-y`} /></label><div className="sm:col-span-2"><button type="submit" disabled={saving || !invoices.data.items.length} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? 'Submitting…' : 'Submit dispute'}</button></div></form>}</section>
    <section className={`rounded-2xl p-5 ${panel(dark)}`}><h2 className={`mb-4 text-sm font-bold ${title(dark)}`}>Dispute activity</h2>{disputes.data?.items?.length ? <div className="space-y-2">{disputes.data.items.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><strong className={`text-xs ${title(dark)}`}>{item.invoice_number || item.reason || 'Invoice dispute'}</strong><p className={`mt-1 text-[10px] ${muted(dark)}`}>{item.reason} · opened {formatDate(item.opened_at)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${dark ? 'bg-violet-500/15 text-violet-200' : 'bg-violet-50 text-violet-700'}`}>{item.status}</span></div><p className={`mt-3 whitespace-pre-wrap text-xs leading-relaxed ${muted(dark)}`}>{item.details}</p></article>)}</div> : !disputes.loading && <Empty dark={dark}>Disputes you raise and updates from your creditor will be shown here.</Empty>}</section>
  </>;
}

export function DebtorMessagesPage({ dark, readOnly = false }) {
  const messages = useApiData('/api/dashboard/debtor/messages');
  const invoices = useApiData('/api/dashboard/invoices?limit=250');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const formElement = event.currentTarget;
    const values = new FormData(formElement);
    try {
      await apiRequest('/api/dashboard/debtor/messages', { method: 'POST', body: JSON.stringify({ invoice_id: values.get('invoice_id') || '', subject: values.get('subject'), message: values.get('message') }) });
      formElement.reset(); setNotice('Your message was added to the support thread.'); messages.reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not send your message.'); }
    finally { setSaving(false); }
  };
  return <>
    <Heading dark={dark} eyebrow="Support" name="Messages & Support" detail="Send your creditor a message about an invoice or your account. Replies are shown here when added to the case." />
    <State dark={dark} loading={messages.loading || invoices.loading} error={messages.error || invoices.error} retry={() => { messages.reload(); invoices.reload(); }} />
    <Notice dark={dark} error={error}>{notice}</Notice>
    <section className={`mb-4 rounded-2xl p-5 ${panel(dark)}`}><h2 className={`mb-4 text-sm font-bold ${title(dark)}`}>Contact your creditor</h2>{readOnly ? <ReadOnlyNote dark={dark} /> : invoices.data && <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className={`text-[11px] font-semibold ${muted(dark)}`}>Invoice (optional)<select name="invoice_id" defaultValue="" className={field(dark)}><option value="">General account question</option>{invoices.data.items.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number}</option>)}</select></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>Subject<input name="subject" required maxLength="160" placeholder="How can we help?" className={field(dark)} /></label><label className={`text-[11px] font-semibold sm:col-span-2 ${muted(dark)}`}>Message<textarea name="message" required minLength="2" maxLength="3000" rows="4" placeholder="Write a message" className={`${field(dark)} mt-1 resize-y`} /></label><div className="sm:col-span-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">{saving ? 'Sending…' : 'Send message'}<Send size={14} /></button></div></form>}</section>
    <section className={`rounded-2xl p-5 ${panel(dark)}`}><h2 className={`mb-4 text-sm font-bold ${title(dark)}`}>Support thread</h2>{messages.data?.items?.length ? <div className="space-y-3">{messages.data.items.map((item) => { const mine = item.sender_type === 'debtor'; return <article key={item.id} className={`max-w-3xl rounded-2xl border p-4 ${mine ? 'ml-auto border-violet-400/30 bg-violet-500/10' : dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="flex flex-wrap items-center justify-between gap-2"><strong className={`text-xs ${title(dark)}`}>{item.subject || 'Account support'}</strong><span className={`text-[10px] ${muted(dark)}`}>{item.sender_name || (mine ? 'You' : 'Creditor')} · {formatDate(item.created_at)}</span></div><p className={`mt-2 whitespace-pre-wrap text-xs leading-relaxed ${muted(dark)}`}>{item.message}</p>{item.invoice_number && <p className="mt-2 text-[10px] font-semibold text-violet-500">Invoice {item.invoice_number}</p>}</article>; })}</div> : !messages.loading && <Empty dark={dark}>Messages you send and support replies will appear in this thread.</Empty>}</section>
  </>;
}

export function DebtorDocumentsPage({ dark, readOnly = false }) {
  const documents = useApiData('/api/dashboard/documents?limit=250');
  const invoices = useApiData('/api/dashboard/invoices?limit=250');
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setUploading(true); setError(''); setNotice('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get('file');
    if (!(file instanceof File) || !file.size) { setError('Choose a file to upload.'); setUploading(false); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Choose a file smaller than 8 MB.'); setUploading(false); return; }
    try {
      await apiRequest('/api/dashboard/debtor/documents', { method: 'POST', body: form });
      formElement.reset(); setNotice('Your document was uploaded securely.'); documents.reload();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not upload this file.'); }
    finally { setUploading(false); }
  };
  const download = async (document) => {
    setDownloading(document.id); setError('');
    try { await downloadFile(`/api/dashboard/documents/${encodeURIComponent(document.id)}/download`, document.file_name); }
    catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : 'Could not download this file.'); }
    finally { setDownloading(''); }
  };
  return <>
    <Heading dark={dark} eyebrow="Secure files" name="Documents & Proofs" detail="Upload payment receipts or supporting documents and open files shared with your account." />
    <State dark={dark} loading={documents.loading || invoices.loading} error={documents.error || invoices.error} retry={() => { documents.reload(); invoices.reload(); }} />
    <Notice dark={dark} error={error}>{notice}</Notice>
    <section className={`mb-4 rounded-2xl p-5 ${panel(dark)}`}><div className="mb-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><Upload size={18} /></span><div><h2 className={`text-sm font-bold ${title(dark)}`}>Upload a receipt or document</h2><p className={`mt-1 text-xs ${muted(dark)}`}>PDF, JPG, or PNG · up to 8 MB</p></div></div>
      {readOnly ? <ReadOnlyNote dark={dark} /> : invoices.data && <form onSubmit={submit} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2"><label className={`text-[11px] font-semibold ${muted(dark)}`}>Related invoice (optional)<select name="invoice_id" defaultValue="" className={field(dark)}><option value="">No specific invoice</option>{invoices.data.items.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number}</option>)}</select></label><label className={`text-[11px] font-semibold ${muted(dark)}`}>Document type<select name="document_type" defaultValue="payment_receipt" className={field(dark)}><option value="payment_receipt">Payment receipt</option><option value="supporting_document">Supporting document</option><option value="dispute_evidence">Dispute evidence</option></select></label><label className={`text-[11px] font-semibold sm:col-span-2 ${muted(dark)}`}>Choose file<input name="file" type="file" required accept="application/pdf,image/jpeg,image/png" className={`${field(dark)} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-1.5 file:text-[10px] file:font-bold file:text-violet-800`} /></label><div className="sm:col-span-2"><button type="submit" disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">{uploading ? 'Uploading…' : 'Upload document'}<Upload size={14} /></button></div></form>}
    </section>
    <section className={`rounded-2xl p-5 ${panel(dark)}`}><div className="mb-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><FileText size={18} /></span><div><h2 className={`text-sm font-bold ${title(dark)}`}>Your documents</h2><p className={`mt-1 text-xs ${muted(dark)}`}>{documents.data?.total ?? '—'} accessible file records</p></div></div>{documents.data?.items?.length ? <div className="space-y-2">{documents.data.items.map((item) => <div key={item.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${dark ? 'border-[#302744] bg-[#211b34]' : 'border-[#f0ebf7] bg-[#fcfbff]'}`}><div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${dark ? 'bg-violet-500/15 text-violet-300' : 'bg-violet-50 text-violet-700'}`}><FileText size={16} /></span><div className="min-w-0"><strong className={`block truncate text-xs ${title(dark)}`}>{item.file_name}</strong><span className={`mt-1 block text-[10px] ${muted(dark)}`}>{item.document_type} · {item.invoice_number || item.case_reference || 'Account document'} · {formatDate(item.uploaded_at)}</span></div></div>{item.download_available && <button type="button" disabled={downloading === item.id} onClick={() => download(item)} className="inline-flex items-center gap-2 rounded-lg border border-violet-300 px-3 py-2 text-[10px] font-bold text-violet-700 disabled:opacity-60 dark:border-violet-500/40 dark:text-violet-200">{downloading === item.id ? 'Downloading…' : <><ArrowDownToLine size={13} />Download</>}</button>}</div>)}</div> : !documents.loading && <Empty dark={dark}>Uploaded receipts and documents shared by your creditor will show here.</Empty>}</section>
  </>;
}
