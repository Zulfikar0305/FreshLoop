import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();
const db = admin.firestore();

const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

// ── sendOtpEmail ──────────────────────────────────────────────────────────────
//
// v2 Callable Cloud Function (africa-south1).
// Requires an authenticated Firebase user.
// Accepts: { email: string; role: string }
// Generates a 6-digit OTP, persists it to otpCodes/{uid}, sends via Gmail SMTP.
//
export const sendOtpEmail = onCall(
  {
    region: 'africa-south1',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (request) => {
    // 1. Auth guard — must be signed-in Firebase user
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to request a verification code.',
      );
    }

    const uid   = request.auth.uid;
    const email = (request.data.email ?? '').trim().toLowerCase() as string;
    const role  = (request.data.role  ?? '').trim() as string;

    if (!email) {
      throw new HttpsError('invalid-argument', 'Email is required.');
    }
    if (!role) {
      throw new HttpsError('invalid-argument', 'Role is required.');
    }

    // 2. Generate OTP
    const code      = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    );

    // 3. Persist OTP record — owner-readable only (rules: otpCodes/{userId})
    await db.doc(`otpCodes/${uid}`).set({
      code,
      email,
      role,
      expiresAt,
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Send email via Gmail SMTP using the GMAIL_APP_PASSWORD secret
    const appPassword = GMAIL_APP_PASSWORD.value();
    if (!appPassword) {
      throw new HttpsError(
        'internal',
        'Mail service is not configured. Please contact support.',
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'freshloop31@gmail.com',
        pass: appPassword,
      },
    });

    const roleLabel =
      role === 'business' ? 'Business Partner' :
      role === 'npo'      ? 'NPO Coordinator'  : 'User';

    await transporter.sendMail({
      from: '"FreshLoop" <freshloop31@gmail.com>',
      to: email,
      subject: 'FreshLoop — Your verification code',
      text: `Your FreshLoop verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.\n\nIf you did not request this, you can safely ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:28px">🌿</span>
            <h2 style="color:#1C3A2E;margin:8px 0 0">FreshLoop</h2>
          </div>
          <p style="color:#374151;font-size:15px;margin-bottom:8px">Hi ${roleLabel},</p>
          <p style="color:#374151;font-size:15px;margin-bottom:24px">
            Your FreshLoop verification code is:
          </p>
          <div style="background:#fff;border:2px solid #2D6A4F;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <span style="font-size:36px;font-weight:700;letter-spacing:10px;font-family:monospace;color:#1C3A2E">
              ${code}
            </span>
          </div>
          <p style="color:#6b7280;font-size:13px;margin-bottom:4px">
            &#9200; This code expires in <strong>5 minutes</strong>.
          </p>
          <p style="color:#6b7280;font-size:13px">
            &#128274; Do not share this code with anyone.
          </p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
          <p style="color:#9ca3af;font-size:11px;text-align:center">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    return { success: true };
  },
);
