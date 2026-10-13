const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function csrfCookie() {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

async function request(path, options = {}) {
  const method = options.method ?? 'GET';
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers['X-XSRF-TOKEN'] = csrfCookie();
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body || `Request failed (${response.status})`;
    try {
      const details = JSON.parse(body);
      message = details.detail ?? details.message ?? details.title ?? message;
    } catch {
      // Use the plain response text when the server does not return JSON.
    }
    throw new ApiError(message, response.status);
  }

  return response.status === 204 ? null : response.json();
}

export const getCsrfToken = () => request('/auth/csrf');
export const getCurrentUser = () => request('/auth/me');
export const registerAccount = (account) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(account) });
export const login = (credentials) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const logout = () => request('/auth/logout', { method: 'POST' });
export const updatePreferences = (preferences) =>
  request('/auth/preferences', { method: 'PATCH', body: JSON.stringify(preferences) });
export const getDashboard = () => request('/dashboard');
export const getTransactions = () => request('/transactions');
export const createTransaction = (transaction) =>
  request('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  });
export const deleteTransaction = (id) =>
  request(`/transactions/${id}`, { method: 'DELETE' });
export const getChallenges = () => request('/challenges');
export const createChallenge = (challenge) =>
  request('/challenges', { method: 'POST', body: JSON.stringify(challenge) });
export const joinChallenge = (id) => request(`/challenges/${id}/join`, { method: 'POST' });
export const leaveChallenge = (id) => request(`/challenges/${id}/join`, { method: 'DELETE' });
export const getMoneyRequests = () => request('/money-requests');
export const createMoneyRequest = (moneyRequest) =>
  request('/money-requests', { method: 'POST', body: JSON.stringify(moneyRequest) });
export const markMoneyRequestPaid = (id) => request(`/money-requests/${id}/paid`, { method: 'POST' });
export const declineMoneyRequest = (id) => request(`/money-requests/${id}/decline`, { method: 'POST' });
export const cancelMoneyRequest = (id) => request(`/money-requests/${id}`, { method: 'DELETE' });
