/**
 * Deadline alert email template.
 *
 * Email HTML is deliberately old-fashioned — tables, inline styles, no
 * external CSS — because that's what actually renders consistently across
 * Outlook, Gmail, and mobile clients. Every email also ships a plain-text
 * alternative, which matters both for deliverability and for the field
 * users who read mail on a phone with images off.
 */

export interface DeadlineAlertTemplateInput {
  recipientFirstName: string
  deadlineTitle: string
  ruleCode: string
  facilityName: string
  facilityState: string
  dueDate: Date
  daysUntilDue: number
  /** Regulation citation, e.g. "40 CFR Part 60 Subpart OOOOb" */
  regulationLabel?: string
  assigneeName?: string
  dashboardUrl: string
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export function renderDeadlineAlert(input: DeadlineAlertTemplateInput): RenderedEmail {
  const {
    recipientFirstName,
    deadlineTitle,
    ruleCode,
    facilityName,
    facilityState,
    dueDate,
    daysUntilDue,
    regulationLabel,
    assigneeName,
    dashboardUrl,
  } = input

  const dueDateStr = dueDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const urgency = describeUrgency(daysUntilDue)
  const subject = `${urgency.subjectPrefix}${deadlineTitle} — ${facilityName}`

  const text = [
    `${recipientFirstName ? `${recipientFirstName},` : 'Hello,'}`,
    ``,
    `${urgency.sentence}`,
    ``,
    `  Obligation:  ${deadlineTitle}`,
    `  Rule:        ${ruleCode}`,
    regulationLabel ? `  Regulation:  ${regulationLabel}` : null,
    `  Facility:    ${facilityName} (${facilityState})`,
    `  Due:         ${dueDateStr}`,
    assigneeName ? `  Assigned to: ${assigneeName}` : `  Assigned to: Unassigned`,
    ``,
    `View in FieldCompliance: ${dashboardUrl}`,
    ``,
    `—`,
    `FieldCompliance · automated compliance deadline notification`,
  ]
    .filter(line => line !== null)
    .join('\n')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#F7F8FA; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FA; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#FFFFFF; border:1px solid #E5E7EB; border-radius:10px; overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:20px 24px; border-bottom:1px solid #E5E7EB;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px; height:24px; background-color:#111827; border-radius:4px; text-align:center; vertical-align:middle; color:#F7F8FA; font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:10px; font-weight:600;">FC</td>
                  <td style="padding-left:10px; font-size:14px; font-weight:500; color:#111827;">FieldCompliance</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Urgency banner -->
          <tr>
            <td style="padding:16px 24px; background-color:${urgency.bgColor}; border-bottom:1px solid #E5E7EB;">
              <div style="font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:${urgency.textColor};">
                ${escapeHtml(urgency.label)}
              </div>
              <div style="margin-top:6px; font-size:17px; font-weight:500; color:#111827; line-height:1.3;">
                ${escapeHtml(deadlineTitle)}
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 20px 0; font-size:14px; line-height:1.5; color:#374151;">
                ${recipientFirstName ? `${escapeHtml(recipientFirstName)},` : 'Hello,'} ${escapeHtml(urgency.sentence)}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB; border-radius:6px;">
                ${detailRow('Rule', ruleCode, true)}
                ${regulationLabel ? detailRow('Regulation', regulationLabel, true) : ''}
                ${detailRow('Facility', `${facilityName} · ${facilityState}`, false)}
                ${detailRow('Due', dueDateStr, false)}
                ${detailRow('Assigned to', assigneeName ?? 'Unassigned', false, !assigneeName)}
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background-color:#0F172A; border-radius:6px;">
                    <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block; padding:10px 20px; font-size:14px; font-weight:500; color:#FFFFFF; text-decoration:none;">
                      Open in FieldCompliance
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px; border-top:1px solid #E5E7EB; background-color:#FCFCFD;">
              <p style="margin:0; font-size:11px; line-height:1.5; color:#6B7280;">
                Automated compliance deadline notification from FieldCompliance.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}

// ============================================================
// HELPERS
// ============================================================

interface Urgency {
  label: string
  subjectPrefix: string
  sentence: string
  bgColor: string
  textColor: string
}

function describeUrgency(daysUntilDue: number): Urgency {
  if (daysUntilDue < 0) {
    const days = Math.abs(daysUntilDue)
    return {
      label: `Overdue by ${days} day${days === 1 ? '' : 's'}`,
      subjectPrefix: '[OVERDUE] ',
      sentence: `this compliance obligation is now ${days} day${days === 1 ? '' : 's'} past its due date.`,
      bgColor: '#FEE2E2',
      textColor: '#B91C1C',
    }
  }
  if (daysUntilDue === 0) {
    return {
      label: 'Due today',
      subjectPrefix: '[DUE TODAY] ',
      sentence: 'this compliance obligation is due today.',
      bgColor: '#FEE2E2',
      textColor: '#B91C1C',
    }
  }
  if (daysUntilDue <= 1) {
    return {
      label: 'Due tomorrow',
      subjectPrefix: '[DUE TOMORROW] ',
      sentence: 'this compliance obligation is due tomorrow.',
      bgColor: '#FEF3C7',
      textColor: '#B45309',
    }
  }
  if (daysUntilDue <= 7) {
    return {
      label: `Due in ${daysUntilDue} days`,
      subjectPrefix: '[DUE THIS WEEK] ',
      sentence: `this compliance obligation is due in ${daysUntilDue} days.`,
      bgColor: '#FEF3C7',
      textColor: '#B45309',
    }
  }
  return {
    label: `Due in ${daysUntilDue} days`,
    subjectPrefix: '',
    sentence: `this compliance obligation is coming up in ${daysUntilDue} days.`,
    bgColor: '#DBEAFE',
    textColor: '#1D4ED8',
  }
}

function detailRow(
  label: string,
  value: string,
  mono: boolean,
  muted = false,
): string {
  const font = mono
    ? `ui-monospace,'SF Mono',Menlo,monospace`
    : `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`
  const color = muted ? '#9CA3AF' : '#111827'
  return `<tr>
    <td style="padding:10px 14px; border-bottom:1px solid #F3F4F6; width:110px; font-family:ui-monospace,'SF Mono',Menlo,monospace; font-size:10px; letter-spacing:0.08em; text-transform:uppercase; color:#6B7280; vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 14px; border-bottom:1px solid #F3F4F6; font-family:${font}; font-size:13px; color:${color};">${escapeHtml(value)}</td>
  </tr>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
