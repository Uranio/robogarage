import nodemailer from 'nodemailer';

// Outgoing mail for password recovery. Configure via env:
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_SECURE (true for 465),
//   SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL (frontend base for links)
// Without SMTP_HOST the reset link is printed to the server log instead
// (fine for local use — the admin reads `docker logs`).
export function smtpConfigured(): boolean {
  return !!process.env.SMTP_HOST;
}

export function appUrl(fallbackOrigin: string): string {
  const env = process.env.APP_URL;
  if (env) return env.replace(/\/$/, '');
  try {
    const u = new URL(fallbackOrigin);
    if (u.port === '8901') u.port = '5199';
    return u.origin;
  } catch {
    return fallbackOrigin;
  }
}

export async function sendResetMail(to: string, link: string): Promise<boolean> {
  if (!smtpConfigured()) {
    console.log(`[recover] no SMTP configured — reset link for ${to}: ${link}`);
    return false;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  const tx = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  });
  await tx.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Reset your RoboGarage password',
    text: `Someone requested a password reset for your RoboGarage account.\n\nOpen this link within 30 minutes to set a new password:\n${link}\n\nIf it wasn't you, ignore this mail.`,
  });
  return true;
}
