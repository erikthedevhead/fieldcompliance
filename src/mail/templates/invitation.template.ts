export function invitationEmail(p: {
  firstName: string
  orgName: string
  inviterName: string
  link: string
  expiresDays: number
}): { subject: string; html: string; text: string } {
  const subject = `${p.inviterName} invited you to ${p.orgName} on FieldCompliance`
  const text =
    `Hi ${p.firstName},\n\n` +
    `${p.inviterName} has invited you to join ${p.orgName} on FieldCompliance, ` +
    `the compliance tracking platform for oil and gas operators.\n\n` +
    `Set your password and activate your account:\n${p.link}\n\n` +
    `This invitation expires in ${p.expiresDays} days.\n\n— FieldCompliance`
  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-size:18px;font-weight:600">You're invited to ${p.orgName}</h2>
    <p style="font-size:14px;line-height:1.6">Hi ${p.firstName},</p>
    <p style="font-size:14px;line-height:1.6">
      ${p.inviterName} has invited you to join <strong>${p.orgName}</strong> on
      FieldCompliance, the compliance tracking platform for oil and gas operators.
    </p>
    <p style="margin:28px 0">
      <a href="${p.link}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;font-size:14px">
        Accept invitation
      </a>
    </p>
    <p style="font-size:12px;color:#777">
      This invitation expires in ${p.expiresDays} days. If the button doesn't work, paste this link:<br/>
      <span style="font-family:monospace">${p.link}</span>
    </p>
  </div>`
  return { subject, html, text }
}
