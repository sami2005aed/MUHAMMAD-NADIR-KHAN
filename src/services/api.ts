import {
  User,
  Client,
  Job,
  Transaction,
  Invoice,
  Agreement,
  AgreementTemplate,
  AuditLog,
  CompanySettings,
  VerificationLookupResult,
  ClientDocument,
  PublicTrackResult,
  LoginResponse,
  Employee,
  Supplier,
  SupplierPayment,
} from '../types.ts';

function getAuthHeaders(user: User | null): HeadersInit {
  const token = localStorage.getItem('corelink_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (user) {
    headers['x-user-role'] = user.role;
    headers['x-user-id'] = user.id;
    headers['x-user-name'] = user.name;
  }

  return headers;
}

// Safe JSON parser preventing HTML syntax errors
async function parseJsonSafe(res: Response, fallbackError = 'Request failed'): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new Error(`${fallbackError} (${res.status} ${res.statusText || 'Error'})`);
    }
    return {};
  }
}

// Global fetch wrapper with automatic JWT session expiry interceptor
async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    const clone = res.clone();
    const data = await parseJsonSafe(clone, 'Session expired').catch(() => ({}));
    const message = data.error || 'Your session has expired, please log in again.';
    localStorage.removeItem('corelink_token');
    localStorage.removeItem('corelink_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-expired', { detail: { message } }));
    }
  }
  return res;
}

// Protected JSON API request helper
async function authFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackError = 'Request failed'
): Promise<T> {
  const res = await authFetch(input, init);
  const data = await parseJsonSafe(res, fallbackError);
  if (!res.ok) {
    throw new Error(data.error || `${fallbackError} (${res.status})`);
  }
  return data;
}

// Public JSON API request helper
async function fetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallbackError = 'Request failed'
): Promise<T> {
  const res = await fetch(input, init);
  const data = await parseJsonSafe(res, fallbackError);
  if (!res.ok) {
    throw new Error(data.error || `${fallbackError} (${res.status})`);
  }
  return data;
}

export const api = {
  // Auth
  async login(email: string, password: string, role?: string, deviceToken?: string): Promise<LoginResponse> {
    return fetchJson<LoginResponse>(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, deviceToken }),
      },
      'Login failed'
    );
  },

  async verifyOtp(tempToken: string, otp: string): Promise<{ user: User; token: string; deviceToken?: string }> {
    return fetchJson<{ user: User; token: string; deviceToken?: string }>(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, otp }),
      },
      'Verification failed'
    );
  },

  async revokeTrustedDevices(currentUser: User): Promise<{ success: boolean; message: string }> {
    return authFetchJson<{ success: boolean; message: string }>(
      '/api/auth/revoke-trusted-devices',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to revoke trusted devices'
    );
  },

  async resendOtp(tempToken: string): Promise<{ message: string; tempCode?: string; expiresInSeconds?: number }> {
    return fetchJson<{ message: string; tempCode?: string; expiresInSeconds?: number }>(
      '/api/auth/resend-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken }),
      },
      'Failed to resend code'
    );
  },

  async registerSubAgent(payload: any): Promise<{ message: string; status: string }> {
    return fetchJson<{ message: string; status: string }>(
      '/api/auth/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Registration failed'
    );
  },

  async forgotPassword(email: string): Promise<{ message: string; tempCode?: string; maskedEmail?: string; requiresCode?: boolean }> {
    return fetchJson<{ message: string; tempCode?: string; maskedEmail?: string; requiresCode?: boolean }>(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      },
      'Password reset request failed'
    );
  },

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(
      '/api/auth/reset-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      },
      'Password reset failed'
    );
  },

  async getEmailStatus(): Promise<{ configured: boolean }> {
    return fetchJson<{ configured: boolean }>(
      '/api/auth/email-status',
      undefined,
      'Failed to check email service status'
    );
  },

  async verifyDeletePassword(currentUser: User, password: string): Promise<{ success: boolean; message: string }> {
    return authFetchJson<{ success: boolean; message: string }>(
      '/api/auth/verify-delete-password',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify({ password }),
      },
      'Deletion authorization failed'
    );
  },

  async changeDeletePassword(
    currentUser: User,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return authFetchJson<{ success: boolean; message: string }>(
      '/api/settings/change-delete-password',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      'Failed to change deletion password'
    );
  },

  // Users (Master Admin only)
  async getUsers(currentUser: User): Promise<{ users: User[]; counts: any }> {
    return authFetchJson<{ users: User[]; counts: any }>(
      '/api/users',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch users'
    );
  },

  async updateUserStatus(currentUser: User, userId: string, status: string): Promise<{ user: User; message: string }> {
    return authFetchJson<{ user: User; message: string }>(
      `/api/users/${userId}/status`,
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify({ status }),
      },
      'Failed to update user status'
    );
  },

  async updateUser(currentUser: User, userId: string, data: Partial<User>): Promise<{ user: User; message: string }> {
    return authFetchJson<{ user: User; message: string }>(
      `/api/users/${userId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to update user details'
    );
  },

  async deleteUser(currentUser: User, userId: string): Promise<void> {
    await authFetchJson(
      `/api/users/${userId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete user'
    );
  },

  // Clients
  async getClients(currentUser: User): Promise<Client[]> {
    return authFetchJson<Client[]>(
      '/api/clients',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch clients'
    );
  },

  async createClient(currentUser: User, client: Partial<Client>): Promise<Client> {
    return authFetchJson<Client>(
      '/api/clients',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(client),
      },
      'Failed to create client'
    );
  },

  async updateClient(currentUser: User, id: string, client: Partial<Client>): Promise<Client> {
    return authFetchJson<Client>(
      `/api/clients/${id}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(client),
      },
      'Failed to update client'
    );
  },

  async deleteClient(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/clients/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete client'
    );
  },

  // Jobs
  async getJobs(currentUser: User): Promise<Job[]> {
    return authFetchJson<Job[]>(
      '/api/jobs',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch jobs'
    );
  },

  async createJob(currentUser: User, job: Partial<Job>): Promise<Job> {
    return authFetchJson<Job>(
      '/api/jobs',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(job),
      },
      'Failed to create job'
    );
  },

  async updateJob(currentUser: User, id: string, updates: Partial<Job>): Promise<Job> {
    return authFetchJson<Job>(
      `/api/jobs/${id}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(updates),
      },
      'Failed to update job'
    );
  },

  async deleteJob(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/jobs/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete job'
    );
  },

  // Transactions
  async getTransactions(currentUser: User): Promise<Transaction[]> {
    return authFetchJson<Transaction[]>(
      '/api/transactions',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch transactions'
    );
  },

  async createTransaction(currentUser: User, txn: Partial<Transaction>): Promise<Transaction> {
    return authFetchJson<Transaction>(
      '/api/transactions',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(txn),
      },
      'Failed to create transaction'
    );
  },

  async getAgentLedger(currentUser: User, agentId: string): Promise<any> {
    return authFetchJson(
      `/api/ledger/agent/${agentId}`,
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch ledger'
    );
  },

  // Invoices
  async getInvoices(currentUser: User): Promise<Invoice[]> {
    return authFetchJson<Invoice[]>(
      '/api/invoices',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch invoices'
    );
  },

  async createInvoice(currentUser: User, payload: any): Promise<Invoice> {
    return authFetchJson<Invoice>(
      '/api/invoices',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(payload),
      },
      'Failed to create invoice'
    );
  },

  async updateInvoiceStatus(currentUser: User, id: string, status: string, amountPaid?: number): Promise<Invoice> {
    return authFetchJson<Invoice>(
      `/api/invoices/${id}/status`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify({ status, amountPaid }),
      },
      'Failed to update invoice status'
    );
  },

  async updateInvoice(currentUser: User, id: string, data: Partial<Invoice>): Promise<Invoice> {
    return authFetchJson<Invoice>(
      `/api/invoices/${id}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to update invoice details'
    );
  },

  // Agreements & Templates
  async getTemplates(): Promise<AgreementTemplate[]> {
    return fetchJson<AgreementTemplate[]>(
      '/api/templates',
      undefined,
      'Failed to fetch templates'
    );
  },

  async saveTemplate(currentUser: User, template: Partial<AgreementTemplate>): Promise<AgreementTemplate> {
    return authFetchJson<AgreementTemplate>(
      '/api/templates',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(template),
      },
      'Failed to save template'
    );
  },

  async getAgreements(currentUser: User): Promise<Agreement[]> {
    return authFetchJson<Agreement[]>(
      '/api/agreements',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch agreements'
    );
  },

  async createAgreement(currentUser: User, payload: any): Promise<Agreement> {
    return authFetchJson<Agreement>(
      '/api/agreements',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(payload),
      },
      'Failed to create agreement'
    );
  },

  async updateAgreement(currentUser: User, id: string, data: Partial<Agreement>): Promise<Agreement> {
    return authFetchJson<Agreement>(
      `/api/agreements/${id}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to update agreement details'
    );
  },

  // Audit Logs & Settings
  async getAuditLogs(currentUser: User): Promise<AuditLog[]> {
    return authFetchJson<AuditLog[]>(
      '/api/audit-logs',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch audit logs'
    );
  },

  async getSettings(): Promise<CompanySettings> {
    return fetchJson<CompanySettings>(
      '/api/settings',
      undefined,
      'Failed to fetch settings'
    );
  },

  async updateSettings(currentUser: User, settings: Partial<CompanySettings>): Promise<CompanySettings> {
    return authFetchJson<CompanySettings>(
      '/api/settings',
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(settings),
      },
      'Failed to update settings'
    );
  },

  // Public Verification
  async verifyDocument(serialNo: string): Promise<VerificationLookupResult> {
    return fetchJson<VerificationLookupResult>(
      `/api/verify/${encodeURIComponent(serialNo)}`,
      undefined,
      'Verification request failed'
    );
  },

  // AI Reasoning
  async consultAI(prompt: string, context?: string): Promise<string> {
    const res = await fetchJson<{ result: string }>(
      '/api/ai/reason',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      },
      'AI consultant error'
    );
    return res.result;
  },

  // Database Backup & Restore (Master Admin only)
  async downloadDatabaseBackup(currentUser: User): Promise<void> {
    const res = await authFetch('/api/admin/backup-database', {
      headers: getAuthHeaders(currentUser),
    });
    if (!res.ok) {
      const err = await parseJsonSafe(res, 'Failed to download database backup');
      throw new Error(err.error || 'Failed to download database backup');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `corelink-database-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async restoreDatabaseBackup(currentUser: User, backupData: any): Promise<{ success: boolean; message: string }> {
    return authFetchJson<{ success: boolean; message: string }>(
      '/api/admin/restore-database',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(backupData),
      },
      'Failed to restore database from backup'
    );
  },

  async getSystemCheck(): Promise<any> {
    const res = await fetch('/api/system-check');
    if (!res.ok) {
      throw new Error('Failed to retrieve system check');
    }
    return res.json();
  },

  async getStartupStatus(currentUser?: User | null): Promise<any> {
    const headers = currentUser ? getAuthHeaders(currentUser) : undefined;
    const res = await fetch('/api/startup-status', { headers });
    if (!res.ok) {
      throw new Error('Failed to retrieve startup status');
    }
    return res.json();
  },

  async removeDemoData(currentUser: User): Promise<{ success: boolean; message: string; deletedCounts: any }> {
    return authFetchJson<{ success: boolean; message: string; deletedCounts: any }>(
      '/api/admin/remove-demo-data',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to remove demo data'
    );
  },

  // Genuine Server-Side PDF Downloads (No Print Dialog)
  async downloadInvoicePdf(currentUser: User, invoiceId: string, filename?: string): Promise<void> {
    const res = await authFetch(`/api/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
      headers: getAuthHeaders(currentUser),
    });
    if (!res.ok) {
      const err = await parseJsonSafe(res, 'Failed to generate invoice PDF');
      throw new Error(err.error || 'Failed to generate invoice PDF');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `invoice-${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadAgreementPdf(currentUser: User, agreementId: string, filename?: string): Promise<void> {
    const res = await authFetch(`/api/agreements/${encodeURIComponent(agreementId)}/pdf`, {
      headers: getAuthHeaders(currentUser),
    });
    if (!res.ok) {
      const err = await parseJsonSafe(res, 'Failed to generate agreement PDF');
      throw new Error(err.error || 'Failed to generate agreement PDF');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `agreement-${agreementId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async downloadReportPdf(currentUser: User, reportPayload: any, filename?: string): Promise<void> {
    const res = await authFetch('/api/reports/pdf', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(currentUser),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportPayload),
    });
    if (!res.ok) {
      const err = await parseJsonSafe(res, 'Failed to generate report PDF');
      throw new Error(err.error || 'Failed to generate report PDF');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `CoreLink-Report-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Document Upload & Management
  async uploadDocument(
    currentUser: User,
    file: File,
    meta?: { clientId?: string; jobId?: string; notes?: string }
  ): Promise<ClientDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (meta?.clientId) formData.append('clientId', meta.clientId);
    if (meta?.jobId) formData.append('jobId', meta.jobId);
    if (meta?.notes) formData.append('notes', meta.notes);

    const token = localStorage.getItem('corelink_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await authFetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await parseJsonSafe(res, 'Failed to upload document');
    if (!res.ok) throw new Error(data.error || 'Failed to upload document');
    return data;
  },

  async getDocuments(currentUser: User, filter?: { clientId?: string; jobId?: string }): Promise<ClientDocument[]> {
    const query = new URLSearchParams();
    if (filter?.clientId) query.set('clientId', filter.clientId);
    if (filter?.jobId) query.set('jobId', filter.jobId);

    return authFetchJson<ClientDocument[]>(
      `/api/documents?${query.toString()}`,
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch documents'
    );
  },

  async updateDocumentStatus(
    currentUser: User,
    docId: string,
    status: string,
    notes?: string
  ): Promise<ClientDocument> {
    return authFetchJson<ClientDocument>(
      `/api/documents/${encodeURIComponent(docId)}/status`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify({ status, notes }),
      },
      'Failed to update document status'
    );
  },

  async updateDocument(
    currentUser: User,
    docId: string,
    data: { name?: string; status?: string; notes?: string }
  ): Promise<ClientDocument> {
    return authFetchJson<ClientDocument>(
      `/api/documents/${encodeURIComponent(docId)}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to update document details'
    );
  },

  // Sub-Agent Payment Reporting & Approvals
  async reportJobPayment(
    currentUser: User,
    jobId: string,
    payload: { amount: number; method: string; date?: string; payerName?: string; notes?: string }
  ): Promise<Transaction> {
    return authFetchJson<Transaction>(
      `/api/jobs/${encodeURIComponent(jobId)}/report-payment`,
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(payload),
      },
      'Failed to report payment'
    );
  },

  async approveTransaction(
    currentUser: User,
    txnId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<Transaction> {
    return authFetchJson<Transaction>(
      `/api/transactions/${encodeURIComponent(txnId)}/approval`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify({ action, rejectionReason }),
      },
      'Failed to approve/reject transaction'
    );
  },

  async deleteTransaction(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/transactions/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete transaction'
    );
  },

  async deleteInvoice(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/invoices/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete invoice'
    );
  },

  async deleteAgreement(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/agreements/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete agreement'
    );
  },

  async deleteTemplate(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/templates/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete template'
    );
  },

  async deleteDocument(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/documents/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete document'
    );
  },

  // Public Tracking by Passport Number
  async trackPassport(passportNo: string): Promise<PublicTrackResult> {
    return fetchJson<PublicTrackResult>(
      `/api/public/track/${encodeURIComponent(passportNo.trim())}`,
      undefined,
      'Failed to track passport'
    );
  },

  // Manpower / Employee Management (Master Admin Only)
  async getEmployees(currentUser: User): Promise<Employee[]> {
    return authFetchJson<Employee[]>(
      '/api/employees',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch employees'
    );
  },

  async createEmployee(currentUser: User, empData: Partial<Employee>): Promise<Employee> {
    return authFetchJson<Employee>(
      '/api/employees',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(empData),
      },
      'Failed to create employee'
    );
  },

  async updateEmployee(currentUser: User, id: string, empData: Partial<Employee>): Promise<Employee> {
    return authFetchJson<Employee>(
      `/api/employees/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(empData),
      },
      'Failed to update employee'
    );
  },

  async deleteEmployee(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/employees/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete employee'
    );
  },

  // Supplier & Vendor Management (Master Admin Only)
  async getSuppliers(currentUser: User): Promise<Supplier[]> {
    return authFetchJson<Supplier[]>(
      '/api/suppliers',
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch suppliers'
    );
  },

  async createSupplier(currentUser: User, data: Partial<Supplier>): Promise<Supplier> {
    return authFetchJson<Supplier>(
      '/api/suppliers',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to create supplier'
    );
  },

  async updateSupplier(currentUser: User, id: string, data: Partial<Supplier>): Promise<Supplier> {
    return authFetchJson<Supplier>(
      `/api/suppliers/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to update supplier'
    );
  },

  async deleteSupplier(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/suppliers/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete supplier'
    );
  },

  // Supplier Payments & Vouchers (Master Admin Only)
  async getSupplierPayments(currentUser: User, supplierId?: string): Promise<SupplierPayment[]> {
    const query = supplierId ? `?supplierId=${encodeURIComponent(supplierId)}` : '';
    return authFetchJson<SupplierPayment[]>(
      `/api/supplier-payments${query}`,
      {
        headers: getAuthHeaders(currentUser),
      },
      'Failed to fetch supplier payments'
    );
  },

  async createSupplierPayment(currentUser: User, data: Partial<SupplierPayment>): Promise<SupplierPayment> {
    return authFetchJson<SupplierPayment>(
      '/api/supplier-payments',
      {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to record supplier payment'
    );
  },

  async updateSupplierPayment(currentUser: User, id: string, data: Partial<SupplierPayment>): Promise<SupplierPayment> {
    return authFetchJson<SupplierPayment>(
      `/api/supplier-payments/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(data),
      },
      'Failed to update supplier payment'
    );
  },

  async deleteSupplierPayment(currentUser: User, id: string): Promise<void> {
    await authFetchJson(
      `/api/supplier-payments/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(currentUser),
      },
      'Failed to delete supplier payment'
    );
  },
};

