import 'dotenv/config';

const BREVO_API_KEY = process.env.BREVO_API;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'swork2814@gmail.com';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'StitchShop';
const SITE_URL = process.env.SITE_URL || 'http://localhost:4321';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || SENDER_EMAIL;

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a verification OTP email using the Brevo API
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  otp: string,
  role: string
): Promise<EmailResult> {
  // Special routing for ADMIN users as per project requirements
  const isSpecialRole = role && ['ADMIN', 'TAILOR'].includes(role.toString().toUpperCase());
  const targetEmail = isSpecialRole ? ADMIN_NOTIFICATION_EMAIL : email;
  
  console.log(`[Brevo] Sending ${role} verification for ${email} -> Targeted to: ${targetEmail} (OTP: ${otp})`);

  const htmlContent = `
    <html>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: white; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background-color: #4f46e5; color: white; border-radius: 16px; font-size: 32px; font-weight: bold; line-height: 60px;">S</div>
            <h1 style="color: #111827; margin-top: 15px; font-size: 24px; font-weight: 800;">StitchShop Verification</h1>
          </div>
          
          <p style="font-size: 16px; color: #4b5563;">Hi ${name},</p>
          <p style="font-size: 16px; color: #4b5563;">Thank you for joining StitchShop. Use the following 6-digit verification code to activate your account:</p>
          
          <div style="text-align: center; margin: 40px 0; padding: 25px; background-color: #f3f4f6; border-radius: 12px;">
            <h2 style="font-size: 42px; font-weight: 800; color: #4f46e5; letter-spacing: 12px; margin: 0;">${otp}</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Valid for the next <b>10 minutes</b> Only.</p>
          </div>
          
          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 30px;">
            If you didn't request this code, you can safely ignore this email.
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af;">&copy; 2026 StitchShop Tailoring Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: [{ email: targetEmail, name }],
    subject: `StitchShop: ${otp} is your verification code`,
    htmlContent,
  });
}

/**
 * Send a password reset OTP email via Brevo
 */
export async function sendPasswordResetOtpEmail(
  email: string,
  name: string,
  otp: string
): Promise<EmailResult> {
  const htmlContent = `
    <html>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: white; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background-color: #4f46e5; color: white; border-radius: 16px; font-size: 32px; font-weight: bold; line-height: 60px;">S</div>
            <h1 style="color: #111827; margin-top: 15px; font-size: 24px; font-weight: 800;">Password Reset</h1>
          </div>

          <p style="font-size: 16px; color: #4b5563;">Hi ${name},</p>
          <p style="font-size: 16px; color: #4b5563;">Use the following 6-digit code to reset your StitchShop password:</p>

          <div style="text-align: center; margin: 40px 0; padding: 25px; background-color: #f3f4f6; border-radius: 12px;">
            <h2 style="font-size: 42px; font-weight: 800; color: #4f46e5; letter-spacing: 12px; margin: 0;">${otp}</h2>
            <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">Valid for the next <b>10 minutes</b> only.</p>
          </div>

          <p style="font-size: 14px; color: #9ca3af; text-align: center;">
            If you didn't request this, you can safely ignore this email — your password will not change.
          </p>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af;">&copy; 2026 StitchShop Tailoring Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: [{ email, name }],
    subject: `StitchShop: ${otp} is your password reset code`,
    htmlContent,
  });
}

/**
 * Send a password reset link email via Brevo
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetLink: string
): Promise<EmailResult> {
  const htmlContent = `
    <html>
      <body style="font-family: sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: white; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background-color: #4f46e5; color: white; border-radius: 16px; font-size: 32px; font-weight: bold; line-height: 60px;">S</div>
            <h1 style="color: #111827; margin-top: 15px; font-size: 24px; font-weight: 800;">Reset Your Password</h1>
          </div>

          <p style="font-size: 16px; color: #4b5563;">Hi ${name},</p>
          <p style="font-size: 16px; color: #4b5563;">We received a request to reset your StitchShop password. Click the button below to set a new password:</p>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: white; font-size: 16px; font-weight: 600; border-radius: 8px; text-decoration: none;">
              Reset Password
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280;">This link will expire in <b>1 hour</b>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>

          <div style="margin-top: 20px; padding: 12px 16px; background-color: #f3f4f6; border-radius: 8px; word-break: break-all;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">If the button doesn't work, copy this link into your browser:</p>
            <p style="font-size: 12px; color: #4f46e5; margin: 6px 0 0;">${resetLink}</p>
          </div>

          <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="font-size: 12px; color: #9ca3af;">&copy; 2026 StitchShop Tailoring Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: [{ email, name }],
    subject: 'StitchShop: Reset your password',
    htmlContent,
  });
}

/**
 * Generic helper to send emails via Brevo API
 */
async function sendEmail(params: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}): Promise<EmailResult> {
  if (!BREVO_API_KEY) {
    console.error('BREVO_API key is missing in .env');
    return { success: false, error: 'API key missing' };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: SENDER_NAME },
        to: params.to,
        subject: params.subject,
        htmlContent: params.htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API error:', errorData);
      return { success: false, error: errorData.message || 'Unknown API error' };
    }

    const data = await response.json();
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Failed to send email via Brevo:', error);
    return { success: false, error: 'Network or internal error' };
  }
}