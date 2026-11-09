export function formatMoney(value, currency = 'INR') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'INR'} ${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }
}

export function formatMoneyMap(values) {
  if (!values || typeof values !== 'object' || Object.keys(values).length === 0) return formatMoney(0, 'INR');
  return Object.entries(values).map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
}

export function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'CF';
}
