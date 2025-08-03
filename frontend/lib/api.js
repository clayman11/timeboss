// Simple helper for calling the Express backend.
// The API base URL can be configured via an environment variable.  If
// NEXT_PUBLIC_API_URL is not set it defaults to http://localhost:4000.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Handle a fetch response by parsing JSON and throwing if the status is not ok.
async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const message = data && data.error ? data.error : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

function getAuthHeaders() {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }
  return {};
}

export async function fetchCrews() {
  const res = await fetch(`${API_URL}/crews`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function createCrew(data) {
  const res = await fetch(`${API_URL}/crews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function fetchJobs() {
  const res = await fetch(`${API_URL}/jobs`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function createJob(data) {
  const res = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// Update a job's status
export async function updateJobStatus(id, status) {
  const res = await fetch(`${API_URL}/jobs/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

// Client API functions
export async function fetchClients() {
  const res = await fetch(`${API_URL}/clients`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function createClient(data) {
  const res = await fetch(`${API_URL}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

// Create a Stripe checkout session for a subscription plan
export async function createCheckoutSession(plan) {
  const res = await fetch(`${API_URL}/billing/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ plan }),
  });
  return handleResponse(res);
}

// Request AI‑based optimization suggestions for unassigned jobs
export async function optimizeJobs() {
  const res = await fetch(`${API_URL}/jobs/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}

// Fetch a daily summary of jobs for a given date (YYYY-MM-DD).  Only admin/foreman roles can access.
export async function fetchDailySummary(date) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`${API_URL}/reports/daily-summary${query}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// Fetch invoice for a completed job by ID.  Requires authentication.
export async function fetchInvoice(jobId) {
  const res = await fetch(`${API_URL}/jobs/${jobId}/invoice`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

// User management (admin only)
export async function fetchUsers() {
  const res = await fetch(`${API_URL}/users`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(res);
}

export async function createUser(data) {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateUserRole(id, role, crewId) {
  // Accept an optional crewId when updating a user.  If crewId is undefined it will be
  // omitted from the body.
  const body = role ? { role } : {};
  if (crewId !== undefined) {
    body.crewId = crewId;
  }
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// Send a contact message from the landing page.  Unauthenticated request.
export async function sendContactMessage(data) {
  const res = await fetch(`${API_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}