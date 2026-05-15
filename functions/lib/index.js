"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
admin.initializeApp();
const db = admin.firestore();
const GMAIL_APP_PASSWORD = (0, params_1.defineSecret)('GMAIL_APP_PASSWORD');
// ── sendOtpEmail ──────────────────────────────────────────────────────────────
//
// v2 Callable Cloud Function (africa-south1).
// Requires an authenticated Firebase user.
// Accepts: { email: string; role: string }
// Generates a 6-digit OTP, persists it to otpCodes/{uid}, sends via Gmail SMTP.
//
exports.sendOtpEmail = (0, https_1.onCall)({
    region: 'africa-south1',
    secrets: [GMAIL_APP_PASSWORD],
}, async (request) => {
    var _a, _b;
    // 1. Auth guard — must be signed-in Firebase user
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to request a verification code.');
    }
    const uid = request.auth.uid;
    const email = ((_a = request.data.email) !== null && _a !== void 0 ? _a : '').trim().toLowerCase();
    const role = ((_b = request.data.role) !== null && _b !== void 0 ? _b : '').trim();
    if (!email) {
        throw new https_1.HttpsError('invalid-argument', 'Email is required.');
    }
    if (!role) {
        throw new https_1.HttpsError('invalid-argument', 'Role is required.');
    }
    // 2. Generate OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000));
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
        throw new https_1.HttpsError('internal', 'Mail service is not configured. Please contact support.');
    }
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'freshloop31@gmail.com',
            pass: appPassword,
        },
    });
    const roleLabel = role === 'business' ? 'Business Partner' :
        role === 'npo' ? 'NPO Coordinator' : 'User';
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
});
//# sourceMappingURL=index.js.map