import { useCallback, useEffect, useState } from 'react';

const LOGIN_URL = import.meta.env.VITE_LOGIN_URL || 'http://127.0.0.1:5173/';
let adminRequestContext = null;

export function setAdminRequestContext(context) {
  adminRequestContext = context;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (adminRequestContext && path.startsWith('/api/dashboard/')) {
    headers.set('X-CollectFlow-Admin-Account-Type', adminRequestContext.account_type);
    headers.set('X-CollectFlow-Admin-Organization', adminRequestContext.organization_id);
    if (adminRequestContext.debtor_id) headers.set('X-CollectFlow-Admin-Debtor', adminRequestContext.debtor_id);
    else headers.delete('X-CollectFlow-Admin-Debtor');
  }
  const response = await fetch(path, { ...options, headers, credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.assign(LOGIN_URL);
    throw new Error('Your session has expired. Sign in again to continue.');
  }
  if (!response.ok) {
    const message = typeof data.detail === 'string' ? data.detail : 'CollectFlow could not complete this request.';
    throw new Error(message);
  }
  return data;
}

export async function downloadFile(path, filename) {
  const headers = new Headers();
  if (adminRequestContext && path.startsWith('/api/dashboard/')) {
    headers.set('X-CollectFlow-Admin-Account-Type', adminRequestContext.account_type);
    headers.set('X-CollectFlow-Admin-Organization', adminRequestContext.organization_id);
    if (adminRequestContext.debtor_id) headers.set('X-CollectFlow-Admin-Debtor', adminRequestContext.debtor_id);
  }
  const response = await fetch(path, { headers, credentials: 'include' });
  if (response.status === 401) {
    window.location.assign(LOGIN_URL);
    throw new Error('Your session has expired. Sign in again to continue.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.detail === 'string' ? data.detail : 'CollectFlow could not download this file.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'collectflow-file';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useApiData(path, refreshKey = 0) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      setError('');
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiRequest(path, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard data.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, refreshKey, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data, loading, error, reload };
}
