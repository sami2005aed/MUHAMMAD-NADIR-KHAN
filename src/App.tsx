/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SystemNotification,
  ClientDocument,
  Employee,
} from './types.ts';
import { api } from './services/api.ts';
import { DEFAULT_COMPANY_SETTINGS } from './constants.ts';
import { getDaysUntil } from './utils/formatters.ts';
import { X } from 'lucide-react';

import { Header } from './components/Header.tsx';
import { Sidebar, NavigationTab } from './components/Sidebar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { UserManagement } from './components/UserManagement.tsx';
import { ClientManagement } from './components/ClientManagement.tsx';
import { JobManagement } from './components/JobManagement.tsx';
import { DocumentsModule } from './components/DocumentsModule.tsx';
import { FinancialModule } from './components/FinancialModule.tsx';
import { InvoiceGenerator } from './components/InvoiceGenerator.tsx';
import { AgreementGenerator } from './components/AgreementGenerator.tsx';
import { EmployeeManagement } from './components/EmployeeManagement.tsx';
import { ReportsModule } from './components/ReportsModule.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { SettingsModule } from './components/SettingsModule.tsx';
import { VerificationPage } from './components/VerificationPage.tsx';
import { TrackingPage } from './components/TrackingPage.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { AIAdvisorModal } from './components/AIAdvisorModal.tsx';
import { isMasterAdmin, logRoleDetection } from './utils/auth.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('corelink_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Core Data
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);

  // Notifications
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Session Expiration State
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);

  // Listen for centralized JWT session expiration broadcasts
  useEffect(() => {
    const handleSessionExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      const msg = customEvent.detail?.message || 'Your session has expired, please log in again.';
      setCurrentUser(null);
      localStorage.removeItem('corelink_user');
      localStorage.removeItem('corelink_token');
      setSessionExpiredNotice(msg);
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  // Live Toast Banner for real-time polling updates
  interface LiveAgentAlert {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
    targetTab: NavigationTab;
    timestamp: string;
  }
  const [liveAlert, setLiveAlert] = useState<LiveAgentAlert | null>(null);
  const prevAgentDataRef = useRef<{ jobs: Map<string, Job>; docs: Map<string, ClientDocument> } | null>(null);

  useEffect(() => {
    if (liveAlert) {
      const timer = setTimeout(() => {
        setLiveAlert(null);
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [liveAlert]);

  // Modals & Flows
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState(false);
  const [showVerificationPage, setShowVerificationPage] = useState(false);
  const [verificationSerial, setVerificationSerial] = useState('');
  const [showTrackingPage, setShowTrackingPage] = useState(false);
  const [trackingPassport, setTrackingPassport] = useState('');

  // Cross-component quick links
  const [initialJobForInvoice, setInitialJobForInvoice] = useState<Job | null>(null);
  const [initialJobForAgreement, setInitialJobForAgreement] = useState<Job | null>(null);

  // Check URL path for public verification e.g. /verify/CL-INV-2026-0001 or tracking /track/:passport
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const serial = path.replace('/verify/', '');
      setVerificationSerial(decodeURIComponent(serial));
      setShowVerificationPage(true);
    } else if (path.startsWith('/track')) {
      const parts = path.split('/track/');
      if (parts[1]) {
        setTrackingPassport(decodeURIComponent(parts[1]));
      }
      setShowTrackingPage(true);
    }
  }, []);

  // Fetch initial data
  const refreshAllData = useCallback(async () => {
    if (!currentUser) return;
    try {
      // 1. Settings & Templates (public/shared)
      const [fetchedSettings, fetchedTemplates] = await Promise.all([
        api.getSettings().catch(() => DEFAULT_COMPANY_SETTINGS),
        api.getTemplates().catch(() => []),
      ]);
      setSettings(fetchedSettings);
      setTemplates(fetchedTemplates);

      // 2. Role-scoped data
      const [fetchedClients, fetchedJobs, fetchedTransactions, fetchedInvoices, fetchedAgreements, fetchedDocuments] =
        await Promise.all([
          api.getClients(currentUser).catch(() => []),
          api.getJobs(currentUser).catch(() => []),
          api.getTransactions(currentUser).catch(() => []),
          api.getInvoices(currentUser).catch(() => []),
          api.getAgreements(currentUser).catch(() => []),
          api.getDocuments(currentUser).catch(() => []),
        ]);

      // Detect status changes and admin remarks for Sub-Agent's own jobs and documents
      if (currentUser.role === 'sub_agent') {
        if (!prevAgentDataRef.current) {
          // Initial population: seed maps without triggering alert toast
          const jMap = new Map<string, Job>();
          fetchedJobs.forEach(j => jMap.set(j.id, j));
          const dMap = new Map<string, ClientDocument>();
          fetchedDocuments.forEach(d => dMap.set(d.id, d));
          prevAgentDataRef.current = { jobs: jMap, docs: dMap };
        } else {
          const detectedAlerts: LiveAgentAlert[] = [];

          // Compare Jobs
          fetchedJobs.forEach(job => {
            const prevJob = prevAgentDataRef.current?.jobs.get(job.id);
            if (prevJob) {
              if (prevJob.status !== job.status) {
                detectedAlerts.push({
                  id: `live-job-${job.id}-${Date.now()}`,
                  title: 'Job Status Updated',
                  message: `Job ${job.id} status changed to "${job.status}"`,
                  type:
                    job.status === 'Completed' || job.status === 'Delivered'
                      ? 'success'
                      : job.status === 'Cancelled' || job.status === 'Rejected'
                      ? 'warning'
                      : 'info',
                  targetTab: 'jobs',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              } else if (job.rejectionReason && job.rejectionReason !== prevJob.rejectionReason) {
                detectedAlerts.push({
                  id: `live-job-rem-${job.id}-${Date.now()}`,
                  title: 'New Admin Remark on Job',
                  message: `Job ${job.id}: Admin added remark "${job.rejectionReason}"`,
                  type: 'warning',
                  targetTab: 'jobs',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              } else if (job.commissionAmount !== prevJob.commissionAmount && (job.commissionAmount || 0) > 0) {
                detectedAlerts.push({
                  id: `live-job-comm-${job.id}-${Date.now()}`,
                  title: 'Commission Confirmed',
                  message: `Job ${job.id}: Commission set to AED ${job.commissionAmount}`,
                  type: 'success',
                  targetTab: 'jobs',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              }
            }
          });

          // Compare Documents
          fetchedDocuments.forEach(doc => {
            const prevDoc = prevAgentDataRef.current?.docs.get(doc.id);
            if (prevDoc) {
              if (doc.status && prevDoc.status !== doc.status) {
                detectedAlerts.push({
                  id: `live-doc-${doc.id}-${Date.now()}`,
                  title: 'Document Status Updated',
                  message: `Document '${doc.name}' marked "${doc.status}"`,
                  type: doc.status === 'Approved' ? 'success' : doc.status === 'Rejected' ? 'warning' : 'info',
                  targetTab: 'documents',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              } else if (doc.notes && doc.notes !== prevDoc.notes) {
                detectedAlerts.push({
                  id: `live-doc-rem-${doc.id}-${Date.now()}`,
                  title: 'New Admin Remark on Document',
                  message: `Document '${doc.name}': Admin remark "${doc.notes}"`,
                  type: 'info',
                  targetTab: 'documents',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
              }
            }
          });

          // Update ref with current snapshot
          const jMap = new Map<string, Job>();
          fetchedJobs.forEach(j => jMap.set(j.id, j));
          const dMap = new Map<string, ClientDocument>();
          fetchedDocuments.forEach(d => dMap.set(d.id, d));
          prevAgentDataRef.current = { jobs: jMap, docs: dMap };

          if (detectedAlerts.length > 0) {
            const primary = detectedAlerts[0];
            setLiveAlert({
              ...primary,
              message:
                detectedAlerts.length > 1
                  ? `${primary.message} (+${detectedAlerts.length - 1} more updates)`
                  : primary.message,
            });

            // Append to notifications drawer
            setNotifications(prev => [
              ...detectedAlerts.map(a => ({
                id: a.id,
                title: a.title,
                message: a.message,
                type: a.type,
                timestamp: 'Live Polled Update',
                read: false,
                link: a.targetTab,
                forRole: 'sub_agent' as const,
              })),
              ...prev,
            ]);
          }
        }
      }

      setClients(Array.isArray(fetchedClients) ? fetchedClients : []);
      setJobs(Array.isArray(fetchedJobs) ? fetchedJobs : []);
      setTransactions(Array.isArray(fetchedTransactions) ? fetchedTransactions : []);
      setInvoices(Array.isArray(fetchedInvoices) ? fetchedInvoices : []);
      setAgreements(Array.isArray(fetchedAgreements) ? fetchedAgreements : []);
      setDocuments(Array.isArray(fetchedDocuments) ? fetchedDocuments : []);

      // 3. Master Admin specific data
      if (isMasterAdmin(currentUser)) {
        const [usersData, fetchedAudit, fetchedEmployees] = await Promise.all([
          api.getUsers(currentUser).catch(() => ({ users: [], counts: {} })),
          api.getAuditLogs(currentUser).catch(() => []),
          api.getEmployees(currentUser).catch(() => []),
        ]);
        setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
        setAuditLogs(Array.isArray(fetchedAudit) ? fetchedAudit : []);
        setEmployees(Array.isArray(fetchedEmployees) ? fetchedEmployees : []);
      }
    } catch (err: any) {
      console.error('Error refreshing system data:', err);
      if (err?.message && (err.message.includes('expired') || err.message.includes('Session invalid') || err.message.includes('Access denied'))) {
        setCurrentUser(null);
        localStorage.removeItem('corelink_user');
        localStorage.removeItem('corelink_token');
        setSessionExpiredNotice('Your session has expired, please log in again.');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
      // Real-time synchronization polling every 15 seconds
      const interval = setInterval(() => {
        refreshAllData();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser, refreshAllData]);

  // Generate dynamic alerts & notifications
  useEffect(() => {
    if (!currentUser) return;
    const notifs: SystemNotification[] = [];

    // 1. Company Trade License Renewal Warning
    if (settings.companyLicenseExpiry) {
      const days = getDaysUntil(settings.companyLicenseExpiry);
      if (days !== null && days <= 365) {
        notifs.push({
          id: 'notif-lic-exp',
          title: 'Company Trade License Renewal',
          message: `CORE LINK Ajman Trade License (${settings.licenseNo}) expires in ${days} days (${settings.companyLicenseExpiry}).`,
          type: days <= 60 ? 'danger' : 'warning',
          timestamp: 'Compliance Alert',
          read: false,
          link: 'settings',
          forRole: 'master_admin',
        });
      }
    }

    // 2. Pending Sub-Agent Registrations
    if (currentUser.role === 'master_admin') {
      const pendingAgents = users.filter(u => u.status === 'pending');
      if (pendingAgents.length > 0) {
        notifs.push({
          id: 'notif-pending-users',
          title: 'Pending Sub-Agent Registrations',
          message: `${pendingAgents.length} sub-agent application(s) require Master Admin review and approval.`,
          type: 'warning',
          timestamp: 'Urgent Action',
          read: false,
          link: 'users',
          forRole: 'master_admin',
        });
      }
    }

    // 3. Client Visa Expiries
    clients.forEach(c => {
      if (c.visaExpiry) {
        const days = getDaysUntil(c.visaExpiry);
        if (days !== null && days <= 30) {
          notifs.push({
            id: `notif-client-visa-${c.id}`,
            title: `Client Visa Expiry: ${c.nameEn}`,
            message:
              days < 0
                ? `Visa expired ${Math.abs(days)} days ago! Immediate status modification required.`
                : `Residence visa expiring in ${days} days (${c.visaExpiry}).`,
            type: days < 0 ? 'danger' : 'warning',
            timestamp: days < 0 ? 'Expired' : `${days}d left`,
            read: false,
            link: 'clients',
          });
        }
      }
    });

    // 4. Sub-Agent Balance Threshold Warning
    if (currentUser.role === 'master_admin') {
      const threshold = settings.subAgentBalanceThreshold || 5000;
      users
        .filter(u => u.role === 'sub_agent')
        .forEach(agent => {
          const agentJobs = jobs.filter(j => j.agentId === agent.id);
          const earned = agentJobs.reduce((sum, j) => sum + (j.commissionAmount || 0), 0);
          const paid = transactions
            .filter(
              t =>
                t.relatedAgentId === agent.id &&
                (t.category === 'Sub-Agent Commission Payouts' || t.type === 'expense')
            )
            .reduce((sum, t) => sum + t.amount, 0);
          const outstanding = earned - paid;
          if (outstanding >= threshold) {
            notifs.push({
              id: `notif-agent-bal-${agent.id}`,
              title: `High Commission Balance: ${agent.name}`,
              message: `Sub-agent ${agent.name} has an accumulated outstanding commission balance of AED ${outstanding.toLocaleString()}.`,
              type: 'info',
              timestamp: 'Ledger Alert',
              read: false,
              link: 'finance',
              forRole: 'master_admin',
            });
          }
        });

      // 5. Employee Visa / Passport Expiries (Master Admin)
      employees.forEach(emp => {
        if (emp.status === 'Active') {
          if (emp.visaExpiry) {
            const days = getDaysUntil(emp.visaExpiry);
            if (days !== null && days <= 30) {
              notifs.push({
                id: `notif-emp-visa-${emp.id}`,
                title: `Workforce Visa Expiry: ${emp.nameEn}`,
                message:
                  days < 0
                    ? `Residency visa expired ${Math.abs(days)} days ago (${emp.workingFor}). Urgent renewal required.`
                    : `Residency visa expiring in ${days} days (${emp.visaExpiry}) at ${emp.workingFor}.`,
                type: days < 0 ? 'danger' : 'warning',
                timestamp: days < 0 ? 'Expired' : `${days}d left`,
                read: false,
                link: 'manpower',
                forRole: 'master_admin',
              });
            }
          }
          if (emp.passportExpiry) {
            const days = getDaysUntil(emp.passportExpiry);
            if (days !== null && days <= 30) {
              notifs.push({
                id: `notif-emp-pass-${emp.id}`,
                title: `Workforce Passport Expiry: ${emp.nameEn}`,
                message:
                  days < 0
                    ? `Passport expired ${Math.abs(days)} days ago (${emp.passportNo}). Embassy renewal required.`
                    : `Passport expiring in ${days} days (${emp.passportExpiry}) for ${emp.nameEn}.`,
                type: days < 0 ? 'danger' : 'warning',
                timestamp: days < 0 ? 'Expired' : `${days}d left`,
                read: false,
                link: 'manpower',
                forRole: 'master_admin',
              });
            }
          }
        }
      });
    }

    setNotifications(notifs);
  }, [currentUser, settings, users, clients, jobs, transactions, employees]);

  // Auth handlers
  const handleLoginSuccess = (user: User, token: string) => {
    setSessionExpiredNotice(null);
    setCurrentUser(user);
    localStorage.setItem('corelink_user', JSON.stringify(user));
    localStorage.setItem('corelink_token', token);
    setCurrentTab('dashboard');
  };

  const handleLogout = () => {
    setSessionExpiredNotice(null);
    setCurrentUser(null);
    localStorage.removeItem('corelink_user');
    localStorage.removeItem('corelink_token');
    setCurrentTab('dashboard');
  };

  const handleMarkAllNotifsAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: SystemNotification) => {
    if (notif.link) {
      setCurrentTab(notif.link as NavigationTab);
    }
    setNotifications(notifications.map(n => (n.id === notif.id ? { ...n, read: true } : n)));
    setIsNotificationsOpen(false);
  };

  const isMaster = currentUser ? isMasterAdmin(currentUser) : false;
  useEffect(() => {
    if (currentUser) {
      logRoleDetection('AppRoot', currentUser);
    }
  }, [currentUser]);

  // If public verification mode is requested
  if (showVerificationPage) {
    return (
      <VerificationPage
        initialSerial={verificationSerial}
        settings={settings}
        onBackToApp={() => {
          setShowVerificationPage(false);
          // Clean URL if needed
          window.history.pushState({}, '', '/');
        }}
        onGoToTrack={() => {
          setShowVerificationPage(false);
          setShowTrackingPage(true);
        }}
      />
    );
  }

  // If public passport/visa tracking mode is requested
  if (showTrackingPage) {
    return (
      <TrackingPage
        initialPassport={trackingPassport}
        settings={settings}
        onBackToApp={() => {
          setShowTrackingPage(false);
          window.history.pushState({}, '', '/');
        }}
        onGoToVerify={() => {
          setShowTrackingPage(false);
          setShowVerificationPage(true);
        }}
      />
    );
  }

  // If user is not authenticated, show unified Auth portal
  if (!currentUser) {
    return (
      <AuthModal
        onLoginSuccess={handleLoginSuccess}
        onOpenVerify={() => setShowVerificationPage(true)}
        onOpenTrack={() => setShowTrackingPage(true)}
        sessionExpiredNotice={sessionExpiredNotice}
        onClearSessionExpiredNotice={() => setSessionExpiredNotice(null)}
      />
    );
  }

  const pendingUsersCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-[#C9A05C] selection:text-slate-950">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        settings={settings}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenVerify={() => setShowVerificationPage(true)}
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={tab => {
            // Guard: Sub-agents cannot navigate to master admin exclusive tabs
            if (
              !isMaster &&
              ['users', 'audit', 'settings', 'reports'].includes(tab)
            ) {
              setCurrentTab('dashboard');
            } else {
              setCurrentTab(tab);
            }
          }}
          role={currentUser.role}
          pendingUsersCount={isMaster ? pendingUsersCount : 0}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              users={users}
              jobs={jobs}
              clients={clients}
              transactions={transactions}
              invoices={invoices}
              documents={documents}
              employees={employees}
              settings={settings}
              onNavigate={setCurrentTab}
              onOpenNewJobModal={() => setCurrentTab('jobs')}
              onOpenNewInvoiceModal={() => setCurrentTab('invoices')}
              onOpenNewAgreementModal={() => setCurrentTab('agreements')}
              onOpenNewTransactionModal={() => setCurrentTab('finance')}
            />
          )}

          {currentTab === 'clients' && (
            <ClientManagement
              currentUser={currentUser}
              clients={clients}
              subAgents={users.filter(u => u.role === 'sub_agent')}
              onRefreshClients={refreshAllData}
              onOpenCreateJobForClient={client => {
                setCurrentTab('jobs');
              }}
              onOpenCreateInvoiceForClient={client => {
                setCurrentTab('invoices');
              }}
              onOpenCreateAgreementForClient={client => {
                setCurrentTab('agreements');
              }}
            />
          )}

          {currentTab === 'jobs' && (
            <JobManagement
              currentUser={currentUser}
              jobs={jobs}
              clients={clients}
              subAgents={users.filter(u => u.role === 'sub_agent')}
              onRefreshJobs={refreshAllData}
              onOpenCreateInvoiceForJob={job => {
                setInitialJobForInvoice(job);
                setCurrentTab('invoices');
              }}
              onOpenCreateAgreementForJob={job => {
                setInitialJobForAgreement(job);
                setCurrentTab('agreements');
              }}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsModule
              currentUser={currentUser}
              documents={documents}
              clients={clients}
              jobs={jobs}
              subAgents={users.filter(u => u.role === 'sub_agent')}
              onRefreshDocuments={refreshAllData}
            />
          )}

          {currentTab === 'finance' && (
            <FinancialModule
              currentUser={currentUser}
              transactions={transactions}
              jobs={jobs}
              clients={clients}
              subAgents={users.filter(u => u.role === 'sub_agent')}
              onRefreshTransactions={refreshAllData}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoiceGenerator
              currentUser={currentUser}
              invoices={invoices}
              clients={clients}
              jobs={jobs}
              settings={settings}
              onRefreshInvoices={refreshAllData}
              initialJobForInvoice={initialJobForInvoice}
            />
          )}

          {currentTab === 'agreements' && (
            <AgreementGenerator
              currentUser={currentUser}
              agreements={agreements}
              templates={templates}
              clients={clients}
              jobs={jobs}
              settings={settings}
              onRefreshAgreements={refreshAllData}
              onRefreshTemplates={refreshAllData}
              initialJobForAgreement={initialJobForAgreement}
            />
          )}

          {currentTab === 'manpower' && isMaster && (
            <EmployeeManagement
              currentUser={currentUser}
              employees={employees}
              subAgents={users.filter(u => u.role === 'sub_agent')}
              onRefreshEmployees={refreshAllData}
            />
          )}

          {currentTab === 'reports' && isMaster && (
            <ReportsModule
              currentUser={currentUser}
              transactions={transactions}
              jobs={jobs}
              clients={clients}
              subAgents={users.filter(u => u.role === 'sub_agent')}
              settings={settings}
            />
          )}

          {currentTab === 'users' && isMaster && (
            <UserManagement
              currentUser={currentUser}
              users={users}
              onRefreshUsers={refreshAllData}
            />
          )}

          {currentTab === 'audit' && isMaster && (
            <AuditLogView
              currentUser={currentUser}
              auditLogs={auditLogs}
            />
          )}

          {currentTab === 'settings' && isMaster && (
            <SettingsModule
              currentUser={currentUser}
              settings={settings}
              onRefreshSettings={refreshAllData}
              onOpenTemplateManager={() => setCurrentTab('agreements')}
            />
          )}
        </main>
      </div>

      {/* Slide-over Notifications Drawer */}
      <NotificationsModal
        notifications={notifications}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkAllAsRead={handleMarkAllNotifsAsRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* AI Regulatory & Clause Drafter Modal */}
      <AIAdvisorModal
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
      />

      {/* Real-time Status Change Toast / Banner for Sub-Agents */}
      {liveAlert && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3.5 ${
              liveAlert.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-950/40 text-emerald-200'
                : liveAlert.type === 'warning'
                ? 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/40 text-amber-200'
                : 'bg-slate-900/95 border-blue-500/60 shadow-blue-950/40 text-blue-200'
            }`}
          >
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                liveAlert.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : liveAlert.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current"></span>
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 text-[#C9A05C] border border-[#C9A05C]/30 font-mono">
                    Live Polling Update
                  </span>
                  <span className="text-[10px] text-slate-400">{liveAlert.timestamp}</span>
                </div>
                <button
                  onClick={() => setLiveAlert(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="font-bold text-sm text-white mt-1.5">{liveAlert.title}</div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{liveAlert.message}</p>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => {
                    setCurrentTab(liveAlert.targetTab);
                    setLiveAlert(null);
                  }}
                  className="px-3 py-1 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 text-slate-950 text-xs font-bold rounded-lg transition shadow flex items-center gap-1 cursor-pointer"
                >
                  <span>View in {liveAlert.targetTab === 'jobs' ? 'My Jobs' : 'My Documents'} &rarr;</span>
                </button>
                <span className="text-[10px] text-slate-500">Auto-dismisses in 9s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
