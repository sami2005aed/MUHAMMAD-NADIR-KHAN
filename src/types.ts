export type UserRole = 'master_admin' | 'sub_agent';

export type UserStatus = 'pending' | 'active' | 'blocked';

export interface TrustedDevice {
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  deviceLabel?: string;
}

export interface User {
  id: string;
  role: UserRole;
  name: string;
  companyName?: string;
  email: string;
  phone: string;
  emiratesIdOrPassport?: string;
  address?: string;
  photoUrl?: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: string;
  approvalDate?: string;
  lastLogin?: string;
  trustedDevices?: TrustedDevice[];
}

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

export interface LoginResponse {
  requiresOtp?: boolean;
  tempToken?: string;
  maskedEmail?: string;
  expiresInSeconds?: number;
  message?: string;
  user?: User;
  token?: string;
  deviceToken?: string;
  trustedDevice?: boolean;
}

export type DocumentStatus = 'Received' | 'Under Review' | 'Submitted to Authority' | 'Approved' | 'Rejected';

export interface ClientDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedAt: string;
  updatedAt?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  status?: DocumentStatus;
  clientId?: string;
  clientName?: string;
  jobId?: string;
  notes?: string;
}

export interface Client {
  id: string;
  nameEn: string;
  nameAr: string;
  nationality: string;
  passportNo: string;
  emiratesId: string;
  phone: string;
  email: string;
  address: string;
  linkedAgentId?: string;
  documents: ClientDocument[];
  visaExpiry?: string;
  idExpiry?: string;
  licenseExpiry?: string;
  notes?: string;
  createdAt: string;
}

export type JobStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delivered' | 'Cancelled' | 'Rejected';

export interface Job {
  id: string;
  clientId: string;
  clientNameEn?: string;
  clientNameAr?: string;
  agentId?: string;
  agentName?: string;
  type: string;
  description: string;
  assignedTo?: string;
  status: JobStatus;
  cost: number; // Cost to company in AED
  price: number; // Price to customer in AED
  commissionAmount: number; // Sub-agent commission for THIS job in AED (set by Master Admin)
  profit: number; // Auto: price - cost - commissionAmount
  createdAt: string;
  updatedAt?: string;
  dueDate: string;
  completedAt?: string;
  attachedDocs?: string[];
  rejectionReason?: string;
}

export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number; // in AED
  cost?: number; // Cost of sale for this income in AED
  linkedExpenseId?: string; // ID of linked Cost of Sale expense
  linkedIncomeId?: string; // ID of originating sale if this is a linked Cost of Sale expense
  payerName?: string; // Free-text customer / payer name
  relatedClientId?: string;
  relatedAgentId?: string;
  relatedJobId?: string;
  method: PaymentMethod;
  date: string;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  approvalStatus?: 'approved' | 'pending_approval' | 'rejected';
  rejectionReason?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  descriptionAr?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'Paid' | 'Unpaid' | 'Partially Paid';

export interface Invoice {
  id: string;
  invoiceNo: string; // e.g. CL-INV-2026-0001
  clientId: string;
  clientNameEn: string;
  clientNameAr: string;
  clientPassport?: string;
  clientEmiratesId?: string;
  jobId?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  vatRate: number; // 0.05
  vatAmount: number;
  grandTotal: number;
  amountPaid: number;
  status: InvoiceStatus;
  qrCodeDataUrl?: string;
  verificationUrl: string;
  createdAt: string;
  dueDate: string;
  notes?: string;
  notesAr?: string;
}

export interface AgreementTemplate {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  bodyEn: string;
  bodyAr: string;
  placeholders: string[]; // e.g. ["client_name", "passport_no", "service_details", "amount", "date"]
  createdAt: string;
  updatedAt: string;
}

export interface Agreement {
  id: string;
  serialNo: string; // e.g. CL-AGR-2026-0001
  templateId: string;
  templateName: string;
  clientId: string;
  clientNameEn: string;
  clientNameAr: string;
  clientPassport?: string;
  clientEmiratesId?: string;
  filledData: Record<string, string>;
  renderedBodyEn: string;
  renderedBodyAr: string;
  extraTermsEn?: string;
  extraTermsAr?: string;
  qrCodeDataUrl?: string;
  verificationUrl: string;
  createdAt: string;
  status: 'Valid' | 'Revoked' | 'Expired';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'create' | 'edit' | 'delete' | 'approve' | 'block' | 'unblock' | 'login' | 'status_change' | 'export';
  targetType: 'user' | 'client' | 'job' | 'transaction' | 'invoice' | 'agreement' | 'settings' | 'document' | 'template' | 'employee';
  targetId: string;
  targetDescription: string;
  timestamp: string;
  details?: string;
}

export type EmployeeStatus = 'Active' | 'Terminated' | 'On Leave';

export interface EmployeeDocumentAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedAt: string;
}

export interface Employee {
  id: string;
  nameEn: string;
  nameAr?: string;
  position: string;
  workingFor: string; // Company / Sponsor / Placed At
  joinDate: string;
  salary: number; // AED monthly
  passportNo: string;
  passportExpiry: string;
  visaNo: string;
  visaType: string; // e.g. Employment, Labour
  visaExpiry: string;
  phone: string;
  nationality: string;
  sourceAgentId?: string; // Sub-agent ID or 'office_direct'
  sourceAgentName?: string;
  status: EmployeeStatus;
  notes?: string;
  documents?: EmployeeDocumentAttachment[];
  createdAt: string;
  updatedAt?: string;
}

export interface CompanySettings {
  tradeNameEn: string;
  tradeNameAr: string;
  licenseNo: string;
  legalForm: string;
  activities: string;
  address: string;
  addressAr: string;
  emails: string[];
  phones: string[];
  trn: string; // TRN is empty/optional until registered
  chargeVat?: boolean; // Default false
  invoiceTermsEn?: string;
  invoiceTermsAr?: string;
  companyLicenseExpiry: string; // Currently '2027-08-30'
  tagline: string;
  subAgentBalanceThreshold: number; // AED threshold for alerting master admin
  deletePasswordHash?: string; // Stored bcrypt hash on server
  hasDeletePassword?: boolean; // Client-side indicator
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  timestamp: string;
  read: boolean;
  link?: string;
  forRole?: UserRole;
  forUserId?: string;
}

export interface VerificationLookupResult {
  found: boolean;
  documentType?: 'Invoice' | 'Agreement';
  serialNo?: string;
  clientNameMasked?: string;
  clientNameEn?: string;
  clientNameAr?: string;
  issueDate?: string;
  amount?: number;
  status?: string;
  companyInfo?: {
    tradeNameEn: string;
    tradeNameAr: string;
    licenseNo: string;
    phone: string;
  };
}

export interface PublicTrackResult {
  found: boolean;
  passportNo: string;
  clientNameMasked?: string;
  clientName?: string;
  totalJobs: number;
  jobs: {
    id: string;
    type: string;
    description: string;
    status: JobStatus;
    createdAt: string;
    dueDate: string;
    completedAt?: string;
    documents?: {
      name: string;
      status: DocumentStatus;
      uploadedAt: string;
    }[];
  }[];
}

export interface Supplier {
  id: string;
  nameEn: string;
  companyName: string;
  phone: string;
  email?: string;
  category: string; // e.g. Visa Typing Partner, Medical Center
  totalPaid: number;
  outstandingBalance: number;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank Transfer' | 'Cheque';
  referenceNo?: string;
  date: string;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  documentUrl?: string; // Scanned payment voucher/receipt
  notes?: string;
}
