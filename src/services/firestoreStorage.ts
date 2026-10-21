import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  User,
  Client,
  Job,
  Transaction,
  Invoice,
  Agreement,
  AgreementTemplate,
  AuditLog,
  ClientDocument,
  Employee,
  CompanySettings,
  Supplier,
  SupplierPayment,
} from '../types.ts';

export interface DatabaseSchema {
  users: User[];
  clients: Client[];
  jobs: Job[];
  transactions: Transaction[];
  invoices: Invoice[];
  agreements: Agreement[];
  templates: AgreementTemplate[];
  auditLogs: AuditLog[];
  settings: CompanySettings;
  documents: ClientDocument[];
  employees: Employee[];
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
}

export interface StorageStatus {
  activeStorage: 'Cloud Firestore';
  driver: 'Firebase Web/Server SDK';
  projectId: string;
  databaseId: string;
  filesStorage: string;
  isPersistent: boolean;
  statusText: string;
}

export interface StorageHealthTest {
  ok: boolean;
  driver: 'Firebase Web/Server SDK';
  projectId: string;
  databaseId: string;
  latencyMs: number;
  testedAt: string;
  message?: string;
  error?: string;
}

let firestoreInstance: Firestore | null = null;
let appConfig: any = null;

export function resetAdminFirestoreInstance(): void {
  firestoreInstance = null;
}

export function getFirestoreConfigDetails(): { projectId: string; databaseId: string } {
  const config = loadConfig();
  return {
    projectId: config.projectId,
    databaseId: config.firestoreDatabaseId || '(default)',
  };
}

const CHUNK_SIZE = 450 * 1024; // 450 KB per chunk (comfortably under the 1MB document limit)
const fileMemoryCache = new Map<string, { buffer: Buffer; mimetype: string }>();

function loadConfig(): any {
  if (appConfig) return appConfig;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('firebase-applet-config.json not found. Firestore cannot be initialized.');
  }
  appConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return appConfig;
}

/**
 * Returns the singleton Cloud Firestore instance using project configuration.
 */
export function getAdminFirestoreDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  const config = loadConfig();
  const app = getApps().length ? getApp() : initializeApp(config);
  firestoreInstance = getFirestore(app, config.firestoreDatabaseId || undefined);
  return firestoreInstance;
}

/**
 * Returns active storage system status for logging and health checks.
 */
export function getStorageStatus(): StorageStatus {
  const config = loadConfig();
  return {
    activeStorage: 'Cloud Firestore',
    driver: 'Firebase Web/Server SDK',
    projectId: config.projectId,
    databaseId: config.firestoreDatabaseId || '(default)',
    filesStorage: 'Cloud Firestore Chunks (Persistent Multi-Region Storage)',
    isPersistent: true,
    statusText: 'ONLINE & PERSISTENT (Cloud Firestore collections & chunks)',
  };
}

/**
 * Performs a live end-to-end storage test by writing and reading back a small document in the 'system' collection.
 */
export async function testFirestoreConnection(): Promise<StorageHealthTest> {
  const config = loadConfig();
  const start = Date.now();
  const testPayload = {
    test: 'health-check',
    timestamp: new Date().toISOString(),
    driver: 'Firebase Web/Server SDK',
    nonce: Math.random().toString(36).substring(2, 12),
  };

  try {
    const db = getAdminFirestoreDb();
    const testDoc = doc(db, 'system', 'health_check');
    await setDoc(testDoc, testPayload);
    const snap = await getDoc(testDoc);
    if (!snap.exists()) {
      throw new Error('Health check document was written but not returned on read back.');
    }
    const data = snap.data();
    if (data?.nonce !== testPayload.nonce) {
      throw new Error('Health check read verification failed: payload mismatch.');
    }
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      driver: 'Firebase Web/Server SDK',
      projectId: config.projectId,
      databaseId: config.firestoreDatabaseId || '(default)',
      latencyMs,
      testedAt: new Date().toISOString(),
      message: `Live write and read-back test passed in ${latencyMs}ms.`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      ok: false,
      driver: 'Firebase Web/Server SDK',
      projectId: config.projectId,
      databaseId: config.firestoreDatabaseId || '(default)',
      latencyMs,
      testedAt: new Date().toISOString(),
      error: err?.message || String(err),
    };
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Sets a document in Firestore, awaiting completion.
 */
export async function firestoreSetDoc(collectionName: string, docId: string, data: any): Promise<void> {
  const sanitized = sanitizeForFirestore(data);
  try {
    const db = getAdminFirestoreDb();
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, sanitized);
  } catch (err: any) {
    console.error(`[FIRESTORE WRITE ERROR] Failed to write to ${collectionName}/${docId}:`, err);
    throw err;
  }
}

/**
 * Deletes a document from Firestore, awaiting completion.
 */
export async function firestoreDeleteDoc(collectionName: string, docId: string): Promise<void> {
  try {
    const db = getAdminFirestoreDb();
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.error(`[FIRESTORE DELETE ERROR] Failed to delete from ${collectionName}/${docId}:`, err);
    throw err;
  }
}

/**
 * Saves company settings document
 */
export async function firestoreSaveSettings(settings: CompanySettings): Promise<void> {
  await firestoreSetDoc('settings', 'company', settings);
}

/**
 * Loads entire database from Firestore collections on startup.
 * Seeds default data if Firestore is successfully read and empty.
 */
export async function loadDatabaseFromFirestore(
  getInitialData: () => DatabaseSchema
): Promise<DatabaseSchema> {
  const config = loadConfig();
  console.log(`[STORAGE INIT] Connecting to Cloud Firestore (${config.firestoreDatabaseId || 'default'})...`);

  const db = getAdminFirestoreDb();
  let userDocs: User[] = [];
  let isUsersEmpty = false;

  try {
    const snap = await getDocs(collection(db, 'users'));
    isUsersEmpty = snap.empty;
    userDocs = snap.docs.map(d => d.data() as User);
  } catch (readErr: any) {
    console.warn(`[STORAGE WARN] Cloud Firestore read issue: ${readErr?.message}. Falling back to in-memory dataset.`);
    return getInitialData();
  }

  // Seed default dataset if users collection was successfully read and is empty
  if (isUsersEmpty || userDocs.length === 0) {
    console.log('[STORAGE INIT] Seeding initial default dataset to Cloud Firestore...');
    const initial = getInitialData();
    try {
      await seedDatabaseToFirestore(initial);
      console.log('[STORAGE INIT] Initial seed complete. All entities persisted to Cloud Firestore.');
    } catch (seedErr: any) {
      console.warn('[STORAGE NOTICE] Remote Firestore seed deferred, operating in memory:', seedErr?.message);
    }
    return initial;
  }

  console.log(`[STORAGE INIT] Found ${userDocs.length} existing users in Firestore. Loading all collections...`);

  let clients: Client[] = [];
  let jobs: Job[] = [];
  let transactions: Transaction[] = [];
  let invoices: Invoice[] = [];
  let agreements: Agreement[] = [];
  let templates: AgreementTemplate[] = [];
  let auditLogs: AuditLog[] = [];
  let documents: ClientDocument[] = [];
  let employees: Employee[] = [];
  let suppliers: Supplier[] = [];
  let supplierPayments: SupplierPayment[] = [];
  let settings: CompanySettings;

  try {
    const [
      cSnap,
      jSnap,
      tSnap,
      iSnap,
      aSnap,
      tmplSnap,
      audSnap,
      dSnap,
      eSnap,
      supSnap,
      paySnap,
      sSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'clients')),
      getDocs(collection(db, 'jobs')),
      getDocs(collection(db, 'transactions')),
      getDocs(collection(db, 'invoices')),
      getDocs(collection(db, 'agreements')),
      getDocs(collection(db, 'templates')),
      getDocs(collection(db, 'auditLogs')),
      getDocs(collection(db, 'documents')),
      getDocs(collection(db, 'employees')),
      getDocs(collection(db, 'suppliers')),
      getDocs(collection(db, 'supplierPayments')),
      getDoc(doc(db, 'settings', 'company')),
    ]);

    clients = cSnap.docs.map(d => d.data() as Client);
    jobs = jSnap.docs.map(d => d.data() as Job);
    transactions = tSnap.docs.map(d => d.data() as Transaction);
    invoices = iSnap.docs.map(d => d.data() as Invoice);
    agreements = aSnap.docs.map(d => d.data() as Agreement);
    templates = tmplSnap.docs.map(d => d.data() as AgreementTemplate);
    auditLogs = audSnap.docs.map(d => d.data() as AuditLog);
    documents = dSnap.docs.map(d => d.data() as ClientDocument);
    employees = eSnap.docs.map(d => d.data() as Employee);
    suppliers = supSnap.docs.map(d => d.data() as Supplier);
    supplierPayments = paySnap.docs.map(d => d.data() as SupplierPayment);

    if (sSnap.exists()) {
      settings = sSnap.data() as CompanySettings;
    } else {
      const initial = getInitialData();
      settings = initial.settings;
      await firestoreSetDoc('settings', 'company', settings);
    }
  } catch (err: any) {
    console.warn('[STORAGE WARN] Error loading collections from Firestore, continuing with partial data:', err?.message);
    const initial = getInitialData();
    settings = initial.settings;
  }

  // Sort descending by timestamp / creation
  jobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  transactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  auditLogs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  documents.sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());
  supplierPayments.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  console.log(
    `[STORAGE INIT] Loaded from Cloud Firestore: ` +
    `${userDocs.length} users, ${clients.length} clients, ${jobs.length} jobs, ` +
    `${transactions.length} transactions, ${invoices.length} invoices, ` +
    `${agreements.length} agreements, ${employees.length} employees, ${documents.length} documents, ` +
    `${suppliers.length} suppliers, ${supplierPayments.length} supplier payments.`
  );

  return {
    users: userDocs,
    clients,
    jobs,
    transactions,
    invoices,
    agreements,
    templates,
    auditLogs,
    settings: settings!,
    documents,
    employees,
    suppliers,
    supplierPayments,
  };
}

/**
 * Seeds initial database data to Firestore
 */
async function seedDatabaseToFirestore(data: DatabaseSchema): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const u of data.users) {
    promises.push(firestoreSetDoc('users', u.id, u));
  }
  for (const c of data.clients) {
    promises.push(firestoreSetDoc('clients', c.id, c));
  }
  for (const j of data.jobs) {
    promises.push(firestoreSetDoc('jobs', j.id, j));
  }
  for (const t of data.transactions) {
    promises.push(firestoreSetDoc('transactions', t.id, t));
  }
  for (const i of data.invoices) {
    promises.push(firestoreSetDoc('invoices', i.id, i));
  }
  for (const a of data.agreements) {
    promises.push(firestoreSetDoc('agreements', a.id, a));
  }
  for (const tmpl of data.templates) {
    promises.push(firestoreSetDoc('templates', tmpl.id, tmpl));
  }
  for (const l of data.auditLogs) {
    promises.push(firestoreSetDoc('auditLogs', l.id, l));
  }
  for (const d of data.documents) {
    promises.push(firestoreSetDoc('documents', d.id, d));
  }
  for (const e of data.employees) {
    promises.push(firestoreSetDoc('employees', e.id, e));
  }
  if (Array.isArray(data.suppliers)) {
    for (const s of data.suppliers) {
      promises.push(firestoreSetDoc('suppliers', s.id, s));
    }
  }
  if (Array.isArray(data.supplierPayments)) {
    for (const p of data.supplierPayments) {
      promises.push(firestoreSetDoc('supplierPayments', p.id, p));
    }
  }
  promises.push(firestoreSetDoc('settings', 'company', data.settings));

  await Promise.all(promises);
}

/**
 * Saves an uploaded file persistently to Firestore using partitioned chunks.
 * Zero local filesystem disk writes. Keeps in memory cache.
 */
export async function firestoreSaveFile(
  filename: string,
  mimetype: string,
  size: number,
  buffer: Buffer
): Promise<string> {
  // Store in memory cache
  fileMemoryCache.set(filename, { buffer, mimetype });

  // Partition into chunks
  const totalChunks = Math.ceil(buffer.length / CHUNK_SIZE);

  // Write file metadata document
  await firestoreSetDoc('files', filename, {
    filename,
    mimetype,
    size,
    totalChunks,
    uploadedAt: new Date().toISOString(),
  });

  // Write each chunk
  const chunkPromises: Promise<void>[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, buffer.length);
    const chunkBuffer = buffer.subarray(start, end);
    const chunkDocId = `${filename}_chunk_${i}`;

    chunkPromises.push(
      firestoreSetDoc('file_chunks', chunkDocId, {
        filename,
        chunkIndex: i,
        data: chunkBuffer.toString('base64'),
      })
    );
  }

  await Promise.all(chunkPromises);
  console.log(`[STORAGE] Uploaded '${filename}' (${size} bytes, ${totalChunks} chunks) to persistent Cloud Firestore.`);

  return `/uploads/${filename}`;
}

/**
 * Retrieves a file from in-memory cache or reconstructs it from Firestore chunks.
 * Zero local filesystem disk writes.
 */
export async function firestoreGetFile(filename: string): Promise<{ buffer: Buffer; mimetype: string } | null> {
  if (fileMemoryCache.has(filename)) {
    return fileMemoryCache.get(filename)!;
  }

  const db = getAdminFirestoreDb();
  const metaSnap = await getDoc(doc(db, 'files', filename));
  if (!metaSnap.exists()) {
    return null;
  }
  const meta = metaSnap.data();
  if (!meta) return null;

  const totalChunks = meta.totalChunks || 1;
  const chunkPromises: Promise<any>[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkDocId = `${filename}_chunk_${i}`;
    chunkPromises.push(getDoc(doc(db, 'file_chunks', chunkDocId)));
  }

  const chunkSnaps = await Promise.all(chunkPromises);
  const buffers: Buffer[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const snap = chunkSnaps[i];
    if (!snap.exists()) {
      throw new Error(`Missing file chunk ${i} for file ${filename}`);
    }
    const chunkData = snap.data();
    buffers.push(Buffer.from(chunkData.data, 'base64'));
  }

  const fullBuffer = Buffer.concat(buffers);
  const result = {
    buffer: fullBuffer,
    mimetype: meta.mimetype || 'application/octet-stream',
  };

  fileMemoryCache.set(filename, result);
  return result;
}

/**
 * Restores a full JSON database backup into Firestore collections
 */
export async function restoreBackupToFirestore(backupData: DatabaseSchema): Promise<void> {
  console.log('[RESTORE] Starting database restoration into Cloud Firestore...');

  const writePromises: Promise<void>[] = [];

  if (Array.isArray(backupData.users)) {
    for (const u of backupData.users) {
      writePromises.push(firestoreSetDoc('users', u.id, u));
    }
  }
  if (Array.isArray(backupData.clients)) {
    for (const c of backupData.clients) {
      writePromises.push(firestoreSetDoc('clients', c.id, c));
    }
  }
  if (Array.isArray(backupData.jobs)) {
    for (const j of backupData.jobs) {
      writePromises.push(firestoreSetDoc('jobs', j.id, j));
    }
  }
  if (Array.isArray(backupData.transactions)) {
    for (const t of backupData.transactions) {
      writePromises.push(firestoreSetDoc('transactions', t.id, t));
    }
  }
  if (Array.isArray(backupData.invoices)) {
    for (const i of backupData.invoices) {
      writePromises.push(firestoreSetDoc('invoices', i.id, i));
    }
  }
  if (Array.isArray(backupData.agreements)) {
    for (const a of backupData.agreements) {
      writePromises.push(firestoreSetDoc('agreements', a.id, a));
    }
  }
  if (Array.isArray(backupData.templates)) {
    for (const tmpl of backupData.templates) {
      writePromises.push(firestoreSetDoc('templates', tmpl.id, tmpl));
    }
  }
  if (Array.isArray(backupData.auditLogs)) {
    for (const l of backupData.auditLogs) {
      writePromises.push(firestoreSetDoc('auditLogs', l.id, l));
    }
  }
  if (Array.isArray(backupData.documents)) {
    for (const d of backupData.documents) {
      writePromises.push(firestoreSetDoc('documents', d.id, d));
    }
  }
  if (Array.isArray(backupData.employees)) {
    for (const e of backupData.employees) {
      writePromises.push(firestoreSetDoc('employees', e.id, e));
    }
  }
  if (Array.isArray(backupData.suppliers)) {
    for (const s of backupData.suppliers) {
      writePromises.push(firestoreSetDoc('suppliers', s.id, s));
    }
  }
  if (Array.isArray(backupData.supplierPayments)) {
    for (const p of backupData.supplierPayments) {
      writePromises.push(firestoreSetDoc('supplierPayments', p.id, p));
    }
  }
  if (backupData.settings) {
    writePromises.push(firestoreSetDoc('settings', 'company', backupData.settings));
  }

  await Promise.all(writePromises);
  console.log('[RESTORE] Database successfully restored and persisted to Cloud Firestore!');
}
