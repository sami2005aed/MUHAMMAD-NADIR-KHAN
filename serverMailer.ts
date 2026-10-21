import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailConfig {
  smtpHost?: string;
  smtpPort: number;
  smtpUser?: string;
  smtpPass?: string;
  resendApiKey?: string;
  fromEmail: string;
}

export function getEmailConfig(): EmailConfig {
  let resendApiKey = process.env.RESEND_API_KEY?.trim();
  let fromEmail = process.env.FROM_EMAIL?.trim() || 'no-reply@corelinkservices.ae';
  let smtpHost = process.env.SMTP_HOST?.trim();
  let smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  let smtpUser = process.env.SMTP_USER?.trim();
  let smtpPass = process.env.SMTP_PASS?.trim();

  // Smart Detection 1: Auto-correct swapped RESEND_API_KEY and FROM_EMAIL
  if (fromEmail.startsWith('re_') && resendApiKey?.includes('@')) {
    const tmp = resendApiKey;
    resendApiKey = fromEmail;
    fromEmail = tmp;
  } else if (fromEmail.startsWith('re_')) {
    resendApiKey = fromEmail;
    fromEmail = 'onboarding@resend.dev';
  } else if (resendApiKey?.startsWith('re_') && (!fromEmail || !fromEmail.includes('@'))) {
    fromEmail = 'onboarding@resend.dev';
  }

  return {
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    resendApiKey,
    fromEmail,
  };
}

let isSmtpInvalid = false;

export function markSmtpInvalid(reason?: string): void {
  if (!isSmtpInvalid) {
    isSmtpInvalid = true;
    console.log(`[CORE LINK EMAIL SERVICE] Direct password-only login active.`);
  }
}

export function isEmailConfigured(): boolean {
  const config = getEmailConfig();
  const hasResend = !!(config.resendApiKey && config.resendApiKey.startsWith('re_'));
  const hasValidSmtpUser = !!(config.smtpUser && (config.smtpUser.includes('@') || config.smtpUser.startsWith('apikey')));
  const hasSmtp = !!(!isSmtpInvalid && config.smtpHost && hasValidSmtpUser && config.smtpPass);
  return hasResend || hasSmtp;
}

export async function verifySmtpOnStartup(): Promise<void> {
  const config = getEmailConfig();
  if (config.resendApiKey?.startsWith('re_')) {
    console.log(`[CORE LINK EMAIL SERVICE] Initialized with Resend REST API. Outgoing sender: ${config.fromEmail}`);
    return;
  }

  const hasValidSmtpUser = !!(config.smtpUser && (config.smtpUser.includes('@') || config.smtpUser.startsWith('apikey')));
  if (!config.smtpHost || !hasValidSmtpUser || !config.smtpPass) {
    isSmtpInvalid = true;
    console.log(`[CORE LINK EMAIL SERVICE] Direct password-only login mode active.`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    });

    await transporter.verify();
    console.log(`[CORE LINK EMAIL SERVICE] SMTP (${config.smtpHost}:${config.smtpPort}) verified successfully.`);
  } catch (_err) {
    isSmtpInvalid = true;
    console.log(`[CORE LINK EMAIL SERVICE] Direct password-only login mode active.`);
  }
}

export function getActiveEmailProvider(): {
  configured: boolean;
  provider: 'Resend' | 'SMTP' | 'None';
  providerDetails: string;
  fromEmail: string;
} {
  const config = getEmailConfig();
  const configured = isEmailConfigured();
  if (!configured) {
    return {
      configured: false,
      provider: 'None',
      providerDetails: 'None (Direct password-only login active)',
      fromEmail: config.fromEmail,
    };
  }

  if (config.resendApiKey?.startsWith('re_')) {
    return {
      configured: true,
      provider: 'Resend',
      providerDetails: 'Resend REST API',
      fromEmail: config.fromEmail,
    };
  }

  return {
    configured: true,
    provider: 'SMTP',
    providerDetails: `SMTP (${config.smtpHost}:${config.smtpPort}, user: ${config.smtpUser || 'anonymous'})`,
    fromEmail: config.fromEmail,
  };
}

export function printEmailServiceStatus(): void {
  const active = getActiveEmailProvider();
  console.log('\n================================================================================');
  console.log('                 [CORE LINK EMAIL SERVICE STATUS ON STARTUP]                   ');
  console.log(`  ACTIVE PROVIDER  : ${active.provider === 'None' ? 'NONE (Direct Password Login Mode)' : active.providerDetails}`);
  console.log(`  PROVIDER TYPE    : ${active.provider}`);
  console.log(`  OUTGOING SENDER  : ${active.fromEmail}`);
  console.log(`  2FA OTP SERVICE  : ${active.configured ? 'ENABLED & OPERATIONAL' : 'DISABLED (Direct Login)'}`);
  console.log('================================================================================\n');
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; messageId?: string; recipient?: string }> {
  const config = getEmailConfig();

  if (!isEmailConfigured()) {
    console.log(`[EMAIL DISPATCH SKIPPED] No email service configured. Target: ${to}`);
    return { success: false, recipient: to };
  }

  // 1. Resend API mode (preferred when re_ key is provided)
  if (config.resendApiKey && config.resendApiKey.startsWith('re_')) {
    try {
      const doSend = async (targetEmail: string) => {
        return await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: config.fromEmail.includes('@') ? config.fromEmail : 'onboarding@resend.dev',
            to: [targetEmail],
            subject,
            html,
            text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
          }),
          signal: AbortSignal.timeout(6000),
        });
      };

      let response = await doSend(to);

      if (!response.ok) {
        const errorText = await response.text();
        // Check if Resend testing sandbox restriction applies to unverified domain
        const match = errorText.match(/your own email address \(([^)]+)\)/);
        if (match && match[1] && match[1] !== to) {
          const verifiedRecipient = match[1];
          console.log(`[RESEND NOTICE] Forwarding OTP to verified Resend account address (${verifiedRecipient})`);
          response = await doSend(verifiedRecipient);
          if (response.ok) {
            const data = (await response.json()) as { id?: string };
            console.log(`[RESEND EMAIL SENT] Successfully delivered to ${verifiedRecipient} (ID: ${data.id})`);
            return { success: true, messageId: data.id, recipient: verifiedRecipient };
          }
        }
        throw new Error(`Resend email delivery failed: ${errorText}`);
      }

      const resData = (await response.json()) as { id?: string };
      console.log(`[RESEND EMAIL SENT] ID: ${resData.id} to ${to}`);
      return { success: true, messageId: resData.id, recipient: to };
    } catch (err: any) {
      console.log(`[EMAIL NOTICE] Resend delivery notice for ${to}: ${err.message}`);
      throw err;
    }
  }

  // 2. SMTP Nodemailer mode
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    });

    const info = await transporter.sendMail({
      from: `"CORE LINK Ajman" <${config.fromEmail}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html,
    });

    console.log(`[SMTP EMAIL SENT] MessageId: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId, recipient: to };
  } catch (err: any) {
    if (
      err.message?.includes('535') ||
      err.message?.includes('Username and Password') ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('ETIMEDOUT') ||
      err.code === 'EAUTH'
    ) {
      markSmtpInvalid(err.message);
    }
    console.log(`[CORE LINK EMAIL NOTICE] SMTP delivery notice for ${to}: ${err.message}`);
    throw err;
  }
}

// Helper: Mask email for privacy (e.g. m***@corelinkservices.ae)
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local.charAt(0)}*@${domain}`;
  }
  const maskedLocal = `${local.charAt(0)}${'*'.repeat(Math.min(local.length - 2, 4))}${local.charAt(local.length - 1)}`;
  return `${maskedLocal}@${domain}`;
}

// ----------------- OTP Sessions Management -----------------

export interface LoginOtpSession {
  tempToken: string;
  userId: string;
  email: string;
  role: 'master_admin' | 'sub_agent';
  name: string;
  otp: string;
  createdAt: number;
  expiresAt: number; // 5 minutes
  attempts: number; // max 5
  lastSentAt: number; // rate limit 60s
}

export interface PasswordResetSession {
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number; // 15 minutes
  attempts: number;
  lastSentAt: number;
}

const loginOtpSessions = new Map<string, LoginOtpSession>();
const passwordResetSessions = new Map<string, PasswordResetSession>();

// Cleanup stale sessions every 2 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, session] of loginOtpSessions.entries()) {
    if (session.expiresAt < now) {
      loginOtpSessions.delete(key);
    }
  }
  for (const [email, session] of passwordResetSessions.entries()) {
    if (session.expiresAt < now) {
      passwordResetSessions.delete(email);
    }
  }
}, 2 * 60 * 1000);
cleanupTimer.unref();

export function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function createLoginOtpSession(user: { id: string; email: string; role: 'master_admin' | 'sub_agent'; name: string }): {
  session: LoginOtpSession;
  otp: string;
} {
  const tempToken = crypto.randomBytes(32).toString('hex');
  const otp = generate6DigitOtp();
  const now = Date.now();

  const session: LoginOtpSession = {
    tempToken,
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    otp,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    lastSentAt: now,
  };

  loginOtpSessions.set(tempToken, session);
  return { session, otp };
}

export function getLoginOtpSession(tempToken: string): LoginOtpSession | undefined {
  return loginOtpSessions.get(tempToken);
}

export function invalidateLoginOtpSession(tempToken: string): void {
  loginOtpSessions.delete(tempToken);
}

// Send Login OTP Email
export async function sendLoginOtpEmail(to: string, userName: string, otp: string, role: string): Promise<void> {
  const subject = `Your CORE LINK Security Code: ${otp}`;
  const portalName = role === 'master_admin' ? 'Master Admin Console' : 'Sub-Agent Portal';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060E1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #060E1E; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0A1A3C; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background-color: #050c18; padding: 24px; text-align: center; border-bottom: 2px solid #C9A05C;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF;">
                CORE LINK <span style="color: #C9A05C;">SERVICES</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">
                Government Typing & Legal Document Clearing &bull; Ajman, UAE
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(201, 160, 92, 0.1); border: 1px solid rgba(201, 160, 92, 0.3); color: #C9A05C; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
                Two-Factor Authentication
              </div>
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #FFFFFF; font-weight: 700;">
                Login Verification Code
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #CBD5E1;">
                Hello <strong>${userName}</strong>, a login request was initiated for your account to access the <strong>${portalName}</strong>.
              </p>

              <!-- OTP Box -->
              <div style="margin: 28px 0; padding: 20px; background-color: #040914; border: 1px solid #C9A05C; border-radius: 10px; display: inline-block;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #C9A05C; text-align: center;">
                  ${otp}
                </div>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 13px; color: #E2E8F0; font-weight: 600;">
                ⏰ This code is valid for <strong>5 minutes</strong> (maximum 5 attempts).
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">
                If you did not attempt to sign in to your CORE LINK account, please immediately contact management or reset your credentials.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #040914; padding: 18px 24px; text-align: center; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B; line-height: 1.5;">
              <strong>CORE LINK Typing & Business Services</strong> &bull; Ajman, UAE<br/>
              Trade License No. 140290 &bull; Phone: 068055093<br/>
              <em>This is an automated security transmission. Please do not reply directly to this email.</em>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({ to, subject, html });
}

// ----------------- Password Reset Management -----------------

export function createPasswordResetSession(email: string): { code: string; session: PasswordResetSession } {
  const code = generate6DigitOtp();
  const now = Date.now();
  const session: PasswordResetSession = {
    email: email.toLowerCase(),
    code,
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // 15 minutes
    attempts: 0,
    lastSentAt: now,
  };
  passwordResetSessions.set(email.toLowerCase(), session);
  return { code, session };
}

export function getPasswordResetSession(email: string): PasswordResetSession | undefined {
  return passwordResetSessions.get(email.toLowerCase());
}

export function invalidatePasswordResetSession(email: string): void {
  passwordResetSessions.delete(email.toLowerCase());
}

// Send Password Reset Email
export async function sendPasswordResetEmail(to: string, userName: string, resetCode: string): Promise<void> {
  const subject = `Your CORE LINK Password Reset Code: ${resetCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060E1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #060E1E; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0A1A3C; border: 1px solid #1E293B; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background-color: #050c18; padding: 24px; text-align: center; border-bottom: 2px solid #C9A05C;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF;">
                CORE LINK <span style="color: #C9A05C;">SERVICES</span>
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.5px;">
                Account Recovery Verification &bull; Ajman, UAE
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              <div style="display: inline-block; background-color: rgba(201, 160, 92, 0.1); border: 1px solid rgba(201, 160, 92, 0.3); color: #C9A05C; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
                Password Recovery
              </div>
              <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #FFFFFF; font-weight: 700;">
                Password Reset Code
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #CBD5E1;">
                Hello <strong>${userName}</strong>, we received a request to reset the password for your CORE LINK account.
              </p>

              <!-- Code Box -->
              <div style="margin: 28px 0; padding: 20px; background-color: #040914; border: 1px solid #C9A05C; border-radius: 10px; display: inline-block;">
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #C9A05C; text-align: center;">
                  ${resetCode}
                </div>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 13px; color: #E2E8F0; font-weight: 600;">
                ⏰ This code will expire in <strong>15 minutes</strong>.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.4;">
                Enter this code in the password reset window along with your desired new password. If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #040914; padding: 18px 24px; text-align: center; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B; line-height: 1.5;">
              <strong>CORE LINK Typing & Business Services</strong> &bull; Ajman, UAE<br/>
              Trade License No. 140290 &bull; Phone: 068055093<br/>
              <em>Security transmission &bull; Never share your security codes with anyone.</em>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({ to, subject, html });
}
