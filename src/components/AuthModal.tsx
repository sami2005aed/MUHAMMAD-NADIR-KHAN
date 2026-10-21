import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types.ts';
import { api } from '../services/api.ts';
import { CompanyLogo } from './CompanyLogo.tsx';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Building2,
  FileText,
  MapPin,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Clock,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: User, token: string) => void;
  onOpenVerify: () => void;
  onOpenTrack?: () => void;
  sessionExpiredNotice?: string | null;
  onClearSessionExpiredNotice?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLoginSuccess,
  onOpenVerify,
  onOpenTrack,
  sessionExpiredNotice,
  onClearSessionExpiredNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [portalRole, setPortalRole] = useState<UserRole>('master_admin');

  // Login form states - start completely empty for all users
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2FA OTP States
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpTempToken, setOtpTempToken] = useState('');
  const [otpMaskedEmail, setOtpMaskedEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(300); // 5 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds rate limit
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmiratesId, setRegEmiratesId] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [startupError, setStartupError] = useState<{
    title: string;
    error: string;
    serviceAccount?: string;
    requiredRole?: string;
    projectId?: string;
    databaseId?: string;
    command?: string;
  } | null>(null);

  useEffect(() => {
    api.getStartupStatus()
      .then(status => {
        if (status?.error) {
          setStartupError(status.error);
        }
      })
      .catch(() => {});
  }, []);

  // Forgot Password Flow
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<{ msg: string; code?: string } | null>(null);

  // Timer for OTP 5-minute expiry & 60-second resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpStep) {
      timer = setInterval(() => {
        setOtpExpiresIn(prev => (prev > 0 ? prev - 1 : 0));
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpStep]);

  // Auto focus OTP input on entering 2FA step
  useEffect(() => {
    if (isOtpStep && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [isOtpStep]);

  // Switch portal role without filling any credentials
  const selectRole = (role: UserRole) => {
    setPortalRole(role);
    setActiveTab('login');
    setIsOtpStep(false);
    setErrorMsg('');
    setSuccessMsg('');
    if (onClearSessionExpiredNotice) onClearSessionExpiredNotice();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    if (onClearSessionExpiredNotice) onClearSessionExpiredNotice();

    try {
      // Check for stored trusted device token for this specific email
      const userKey = email.trim().toLowerCase();
      const storedDeviceToken = localStorage.getItem(`trustedDevice:${userKey}`);

      // Step 1: Send credentials to server for secure bcrypt verification
      const res = await api.login(email.trim(), password, portalRole, storedDeviceToken || undefined);

      if (res.requiresOtp && res.tempToken) {
        // Step 2: 2FA OTP Required -> Switch to OTP Screen
        setIsOtpStep(true);
        setOtpTempToken(res.tempToken);
        setOtpMaskedEmail(res.maskedEmail || email.trim());
        setOtpExpiresIn(res.expiresInSeconds || 300);
        setResendCooldown(60);
        setOtpValue('');
        setSuccessMsg(res.message || 'Security code has been dispatched to your email.');
      } else if (res.user && res.token) {
        // Password-only direct login fallback or Trusted Device 30-day login
        if (res.deviceToken) {
          localStorage.setItem(`trustedDevice:${userKey}`, res.deviceToken);
        }
        onLoginSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpValue || otpValue.trim().length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    if (otpExpiresIn <= 0) {
      setErrorMsg('Verification code has expired. Please click "Resend code".');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.verifyOtp(otpTempToken, otpValue.trim());
      if (res.deviceToken) {
        const userKey = email.trim().toLowerCase();
        localStorage.setItem(`trustedDevice:${userKey}`, res.deviceToken);
      }
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.resendOtp(otpTempToken);
      setResendCooldown(60);
      setOtpExpiresIn(res.expiresInSeconds || 300);
      setOtpValue('');
      setSuccessMsg(res.message || 'A new 6-digit code has been dispatched to your email.');
      if (otpInputRef.current) otpInputRef.current.focus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIsOtpStep(false);
    setOtpTempToken('');
    setOtpValue('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: regName.trim(),
        companyName: regCompanyName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        emiratesIdOrPassport: regEmiratesId.trim(),
        address: regAddress.trim(),
        password: regPassword,
      };

      await api.registerSubAgent(payload);
      setSuccessMsg(
        'Registration submitted successfully! Your account is currently in "Pending Approval" status. The Master Admin must approve your profile before your first login.'
      );
      // Reset form
      setRegName('');
      setRegCompanyName('');
      setRegPhone('');
      setRegEmail('');
      setRegEmiratesId('');
      setRegAddress('');
      setRegPassword('');
      setRegConfirmPassword('');
      setActiveTab('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Forgot Password: Request code
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setForgotStep('reset');
      setForgotFeedback({ msg: res.message, code: res.tempCode });
      if (res.tempCode) {
        setForgotCode(res.tempCode);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch password recovery email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Forgot Password: Set new password
  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!forgotCode || forgotCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit recovery code.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('New passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(forgotEmail.trim(), forgotCode.trim(), forgotNewPassword);
      setSuccessMsg(res.message || 'Password reset successfully! You can now log in.');
      setEmail(forgotEmail.trim());
      setPassword('');
      setShowForgotModal(false);
      setForgotStep('email');
      setForgotFeedback(null);
      setForgotCode('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  // Format seconds to mm:ss
  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060E1E] via-[#0A1A3C] to-[#12244C] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9A05C]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header Branding */}
        <div className="p-6 bg-slate-950/60 border-b border-slate-800 text-center flex flex-col items-center justify-center">
          <CompanyLogo size="auth" className="mx-auto" />
          <div className="text-xs text-slate-400 mt-3 font-medium">
            Ajman, UAE &bull; Trade License No. 140290 &bull; Sole Establishment
          </div>
        </div>

        {/* Portal Role Selector Tabs (Master Admin vs Sub-Agent) */}
        {!isOtpStep && (
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => selectRole('master_admin')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition cursor-pointer ${
                portalRole === 'master_admin'
                  ? 'bg-[#C9A05C] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Master Admin Login</span>
            </button>

            <button
              type="button"
              onClick={() => selectRole('sub_agent')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition cursor-pointer ${
                portalRole === 'sub_agent'
                  ? 'bg-[#C9A05C] text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Sub-Agent Portal</span>
            </button>
          </div>
        )}

        {/* Sub-Agent Sub-Tab (Login vs Register) */}
        {!isOtpStep && portalRole === 'sub_agent' && (
          <div className="flex border-b border-slate-800 text-xs">
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-center font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'login'
                  ? 'border-[#C9A05C] text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In to Agent Account
            </button>
            <button
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-center font-semibold border-b-2 transition cursor-pointer ${
                activeTab === 'register'
                  ? 'border-[#C9A05C] text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Self-Register as New Sub-Agent
            </button>
          </div>
        )}

        {/* Body content */}
        <div className="p-6">
          {/* Startup Firestore Diagnostic Alert Banner */}
          {startupError && !isOtpStep && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-amber-300">Firestore Access Diagnostic: {startupError.title}</div>
                  <div className="text-[11px] text-amber-200/90 mt-0.5 font-mono">{startupError.error}</div>
                </div>
              </div>
              {startupError.serviceAccount && (
                <div className="pl-6 text-[10px] text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-400">Cloud Run SA:</span> <code className="text-amber-300 font-mono">{startupError.serviceAccount}</code>
                  </div>
                  <div>
                    <span className="text-slate-400">Required Role:</span> <strong className="text-amber-400">roles/datastore.user</strong> (Cloud Datastore User) on project <code className="text-amber-300 font-mono">{startupError.projectId}</code>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Expiry Banner */}
          {sessionExpiredNotice && !isOtpStep && (
            <div className="mb-5 p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-lg shadow-amber-950/20">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-amber-300">Session Expired</div>
                <div className="mt-0.5">{sessionExpiredNotice}</div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TWO-FACTOR EMAIL OTP SCREEN */}
          {isOtpStep ? (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#C9A05C]/15 border border-[#C9A05C]/30 flex items-center justify-center text-[#C9A05C]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Two-Factor Email Verification
                </h3>
                <p className="text-xs text-slate-300">
                  A 6-digit security code has been sent to your registered email:
                </p>
                <div className="inline-block px-3 py-1 bg-slate-950 rounded-lg border border-slate-700/80 font-mono text-amber-300 text-xs font-semibold">
                  {otpMaskedEmail}
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-300">
                      Enter 6-Digit Code
                    </label>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatSeconds(otpExpiresIn)}</span>
                    </div>
                  </div>

                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={otpValue}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpValue(val);
                      if (val.length === 6) {
                        // Optional auto-submit when full code is entered
                        setErrorMsg('');
                      }
                    }}
                    placeholder="------"
                    className="w-full bg-slate-950 border-2 border-slate-700 focus:border-[#C9A05C] rounded-xl py-3 px-4 text-center font-mono text-2xl font-black text-amber-400 tracking-[0.5em] placeholder-slate-600 focus:outline-hidden transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                    Valid for 5 minutes &bull; Maximum 5 verification attempts
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpValue.length !== 6 || otpExpiresIn <= 0}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-sm rounded-lg shadow-lg hover:shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying Code...' : 'Verify Code & Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Resend and Cancel Controls */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className={`flex items-center gap-1.5 font-semibold cursor-pointer ${
                    resendCooldown > 0
                      ? 'text-slate-500 cursor-not-allowed'
                      : 'text-[#C9A05C] hover:text-amber-300 underline'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </span>
                </button>
              </div>
            </div>
          ) : activeTab === 'login' ? (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStep('email');
                      setForgotFeedback(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-[#C9A05C] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-10 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-sm rounded-lg shadow-lg hover:shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? 'Authenticating...'
                  : portalRole === 'master_admin'
                  ? 'Enter Master Admin Console'
                  : 'Sign In as Sub-Agent'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Sub-Agent Self-Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="e.g. Tariq Mansoor"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Company / Agency Name
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={regCompanyName}
                      onChange={e => setRegCompanyName(e.target.value)}
                      placeholder="e.g. Al Noor Document Clearing"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="agent@company.ae"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    UAE Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="050xxxxxxx"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Emirates ID or Passport No.
                  </label>
                  <div className="relative">
                    <FileText className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={regEmiratesId}
                      onChange={e => setRegEmiratesId(e.target.value)}
                      placeholder="784-xxxx-xxxxxxx-x"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Office / Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      value={regAddress}
                      onChange={e => setRegAddress(e.target.value)}
                      placeholder="e.g. Al Nuaimiya, Ajman"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Create Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                <strong>Notice:</strong> Your registered account will start in <em>Pending Approval</em>. You cannot log in until CORE LINK Master Admin verifies and activates your profile.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#C9A05C] to-amber-600 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow transition cursor-pointer"
              >
                {loading ? 'Submitting Application...' : 'Submit Sub-Agent Application'}
              </button>
            </form>
          )}
        </div>

        {/* Public Document Verification & Tracking Footer links */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            onClick={onOpenVerify}
            className="text-[#C9A05C] hover:text-amber-300 font-semibold cursor-pointer underline flex items-center gap-1"
          >
            Verify Document Authenticity &rarr;
          </button>
          {onOpenTrack && (
            <button
              onClick={onOpenTrack}
              className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline flex items-center gap-1"
            >
              Public Passport / Visa Tracking &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg text-[#C9A05C]">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Account Password</h3>
                <p className="text-xs text-slate-400">
                  {forgotStep === 'email'
                    ? 'Enter your registered email to receive a 15-minute recovery code'
                    : 'Enter the 6-digit code sent to your email to set a new password'}
                </p>
              </div>
            </div>

            {forgotStep === 'email' ? (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotFeedback(null);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !forgotEmail}
                    className="flex-1 py-2 bg-[#C9A05C] hover:bg-amber-600 text-slate-950 text-xs font-bold rounded cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Sending Code...' : 'Send Recovery Code'}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Enter Code & New Password */
              <form onSubmit={handleCompletePasswordReset} className="space-y-3.5">
                {forgotFeedback?.code && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                    <span className="font-semibold">Local Fallback Notice:</span> Your reset code is{' '}
                    <strong className="font-mono bg-slate-950 px-2 py-0.5 rounded text-amber-300">
                      {forgotFeedback.code}
                    </strong>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    6-Digit Security Code (Valid 15 Mins)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotCode}
                    onChange={e => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-amber-400 focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Password (Min 6 Characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      value={forgotNewPassword}
                      onChange={e => setForgotNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-200"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={e => setForgotConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C9A05C]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || forgotCode.length !== 6 || forgotNewPassword.length < 6}
                    className="flex-1 py-2 bg-[#C9A05C] hover:bg-amber-600 text-slate-950 text-xs font-bold rounded cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
