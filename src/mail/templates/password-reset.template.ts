export function passwordResetEmail(p: {
  firstName: string
  link: string
}): { subject: string; html: string; text: string } {
  const subject = 'Reset your FieldCompliance password'
  const text =
    `Hi ${p.firstName},\n\n` +
    `We received a request to reset your FieldCompliance password.\n\n` +
    `Reset it here (link valid for 1 hour):\n${p.link}\n\n` +
    `If you didn't request this, you can safely ignore this email.\n\n— FieldCompliance`
  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-size:18px;font-weight:600">Reset your password</h2>
    <p style="font-size:14px;line-height:1.6">Hi ${p.firstName},</p>
    <p style="font-size:14px;line-height:1.6">
      We received a request to reset your FieldCompliance password. The link below is valid for 1 hour.
    </p>
    <p style="margin:28px 0">
      <a href="${p.link}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:14px">
        Reset password
      </a>
    </p>
    <p style="font-size:12px;color:#777">
      If you didn't request this, ignore this email. If the button doesn't work:<br/>
      <span style="font-family:monospace">${p.link}</span>
    </p>
  </div>`
  return { subject, html, text }
}
