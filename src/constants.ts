import { CompanySettings, AgreementTemplate } from './types.ts';

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  tradeNameEn: 'CORE LINK Administrative Services',
  tradeNameAr: 'كور لينك للخدمات الإدارية',
  licenseNo: '140290',
  legalForm: 'Sole Establishment',
  activities: 'Visa Services, Typing & Document Photocopying Services, Transactions Follow-up Services, Administrative Services for Businessmen',
  address: 'Shop No. 9, Liwara 1, Ajman, UAE',
  addressAr: 'محل رقم 9، ليوارة 1، عجمان، الإمارات العربية المتحدة',
  emails: ['info@corelinkservices.ae', 'support@corelinkservices.ae'],
  phones: ['068055093', '068055073'],
  trn: '', // Empty/optional until registered
  chargeVat: false, // Default OFF - VAT is added only when TRN is saved AND chargeVat is ON
  invoiceTermsEn: 'Service charges are non-refundable. Any refund, where applicable, will take 22 working days to be processed.',
  invoiceTermsAr: 'رسوم الخدمة غير قابلة للاسترداد. وفي حال وجود مبلغ مستحق الاسترداد، تستغرق معالجة الاسترداد 22 يوم عمل.',
  companyLicenseExpiry: '2027-08-30',
  tagline: 'VISA | TYPING | LICENSING | TICKETING',
  subAgentBalanceThreshold: 5000,
};

export const SERVICE_CATEGORIES = [
  'Employment Visa Processing',
  'Family Residence Visa',
  'Golden Visa Nomination & Issuance',
  'Trade License Issuance & Renewal',
  'Emirates ID Typing & Biometrics',
  'Medical Fitness Application',
  'Legal Translation & Attestation',
  'MOHRE Labor Contracts & Quota',
  'Ejari & Tenancy Contract Attestation',
  'Transactions Follow-up Services',
  'Air Ticketing & Travel Documentation',
];

export const EXPENSE_CATEGORIES = [
  'Cost of Sale',
  'Office Rent & Utilities',
  'Government & Typing Center Fees',
  'Staff Salaries & Allowances',
  'Sub-Agent Commission Payouts',
  'Office Supplies & Photocopy Paper',
  'IT, Software & Telecommunication',
  'Marketing & Advertising',
  'Licensing Renewal & Legal Fees',
  'Bank & Administrative Charges',
  'Miscellaneous Expenses',
];

export const DEFAULT_TEMPLATES: AgreementTemplate[] = [
  {
    id: 'tmpl-visa-service',
    name: 'Visa Service Agreement',
    nameAr: 'اتفاقية تقديم خدمات تأشيرة الإقامة',
    category: 'Visa Services',
    bodyEn: `This Agreement is entered into on {{date}} between CORE LINK Administrative Services ("Service Provider") and {{client_name}} ("Client"), Passport No: {{passport_no}}, Emirates ID: {{emirates_id}}.

1. Scope of Service: The Service Provider shall prepare, submit, and follow up on the {{service_details}} through the relevant UAE government authorities (ICP / GDRFA / MOHRE).
2. Professional Consideration: The total agreed fee for this service is AED {{amount}}, payable as mutually documented in the official invoice.
3. Client Obligations: The Client warrants that all furnished documents, records, and disclosures are authentic and compliant with UAE immigration laws.
4. Completion & Follow-up: The Service Provider shall diligently pursue the application and deliver official stamps/electronic permits upon governmental clearance.`,
    bodyAr: `تم إبرام هذه الاتفاقية في تاريخ {{date}} بين كور لينك للخدمات الإدارية ("الطرف الأول / مزود الخدمة") والسيد/السيدة {{client_name}} ("الطرف الثاني / العميل")، جواز سفر رقم: {{passport_no}}، بطاقة الهوية الإماراتية: {{emirates_id}}.

1. نطاق الخدمة: يتولى مزود الخدمة إعداد ومتابعة معاملات {{service_details}} لدى الجهات الحكومية المختصة في دولة الإمارات العربية المتحدة (الهيئة الاتحادية للهوية والجنسية / الإدارة العامة للإقامة / وزارة الموارد البشرية والتوطين).
2. الأتعاب المتفق عليها: تبلغ الأتعاب الإجمالية لهذه الخدمة مبلغ {{amount}} درهم إماراتي وفقاً لما هو مدون بالفاتورة الرسمية المرفقة.
3. التزامات العميل: يقر الطرف الثاني بصحة ودقة كافة الوثائق والمستندات المقدمة بما يتوافق مع القوانين واللوائح الاتحادية.
4. المتابعة والإنجاز: يلتزم مزود الخدمة بمتابعة المعاملة حتى صدور الموافقة الرسمية واستلام التأشيرة.`,
    placeholders: ['date', 'client_name', 'passport_no', 'emirates_id', 'service_details', 'amount'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tmpl-typing-service',
    name: 'Typing & Document Processing Agreement',
    nameAr: 'اتفاقية خدمات الطباعة وتجهيز المعاملات',
    category: 'Typing & Documentation',
    bodyEn: `This Agreement confirms that CORE LINK Administrative Services has been contracted by {{client_name}} (Passport/ID: {{passport_no}}) on {{date}} for administrative typing and document processing services regarding: {{service_details}}.

1. All typing and submission have been executed in accordance with government requirements.
2. Agreed service fee: AED {{amount}}.
3. Both parties confirm receipt and accuracy of the typed applications.`,
    bodyAr: `تؤكد هذه الاتفاقية تكليف كور لينك للخدمات الإدارية من قبل العميل {{client_name}} (جواز سفر/هوية: {{passport_no}}) بتاريخ {{date}} لإنجاز خدمات الطباعة ومراجعة المستندات المتعلقة بـ: {{service_details}}.

1. تم تنفيذ أعمال الطباعة والتقديم وفقاً للأنظمة واللوائح المعتمدة لدى الجهات الحكومية.
2. الأتعاب المتفق عليها: {{amount}} درهم إماراتي.
3. يقر الطرفان بصحة البيانات والطباعة وتسليم المعاملة.`,
    placeholders: ['date', 'client_name', 'passport_no', 'service_details', 'amount'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tmpl-trade-license',
    name: 'Business Licensing & Follow-up Agreement',
    nameAr: 'اتفاقية متابعة وتأسيس وتجديد الرخص التجارية',
    category: 'Licensing & Follow-up',
    bodyEn: `This Business Services Contract is established on {{date}} between CORE LINK Administrative Services and {{client_name}} (Passport: {{passport_no}}, Emirates ID: {{emirates_id}}).

1. Scope: Execution of transactions follow-up, trade license issuance/renewal, and administrative facilitation with the Ajman Department of Economic Development and related entities for: {{service_details}}.
2. Professional Fees: AED {{amount}} (excluding official government vouchers/dues unless specified).
3. Confidentiality: All corporate records and documentation shall be handled with utmost confidentiality and professional care.`,
    bodyAr: `تم إبرام عقد الخدمات الإدارية هذا بتاريخ {{date}} بين كور لينك للخدمات الإدارية والسيد/السيدة {{client_name}} (جواز سفر: {{passport_no}}، هوية إماراتية: {{emirates_id}}).

1. نطاق العمل: متابعة المعاملات وإصدار أو تجديد الرخصة التجارية والإجراءات الإدارية لدى دائرة التنمية الاقتصادية بعجمان والجهات المعنية بشأن: {{service_details}}.
2. أتعاب المتابعة والإدارة: {{amount}} درهم إماراتي (لا تشمل الرسوم الحكومية الرسمية إلا إذا نص صراحة على ذلك).
3. السرية والأمانة المهنية: يلتزم مزود الخدمة بالحفاظ على سرية المستندات والبيانات التجارية للعميل.`,
    placeholders: ['date', 'client_name', 'passport_no', 'emirates_id', 'service_details', 'amount'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'tmpl-sponsorship',
    name: 'Administrative Services & Representation Agreement',
    nameAr: 'اتفاقية خدمات إدارية ومتابعة للمستثمرين ورجال الأعمال',
    category: 'Administrative Services',
    bodyEn: `Executed on {{date}} between CORE LINK Administrative Services (License No. 140290, Ajman, UAE) and {{client_name}} (Passport No: {{passport_no}}).

Subject: Comprehensive business administrative support, documentation clearance, and transaction follow-up services for: {{service_details}}.
Agreed Consideration: AED {{amount}}. Both parties acknowledge terms under UAE applicable legal frameworks.`,
    bodyAr: `حررت هذه الاتفاقية بتاريخ {{date}} بين كور لينك للخدمات الإدارية (ترخيص رقم 140290، عجمان، الإمارات) والطرف الثاني {{client_name}} (جواز سفر: {{passport_no}}).

الموضوع: تقديم الدعم الإداري الشامل، تخليص المعاملات والتوثيق والمتابعة لـ: {{service_details}}.
المقابل المتفق عليه: {{amount}} درهم إماراتي. يقر الطرفان بالالتزام بالأنظمة والقوانين المعمول بها بدولة الإمارات.`,
    placeholders: ['date', 'client_name', 'passport_no', 'service_details', 'amount'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
