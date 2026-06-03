import { escapeHtml, firstNameFromDisplayName } from "./html";
import { wrapEmailLayout } from "./layout";

export interface IncompleteWeekItem {
  projectCode: string;
  projectName: string;
  subitemName: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  Missing: "Missing",
  NotStarted: "Not Started",
  InProgress: "In Progress"
};

/** Cron: subitem still incomplete 7 calendar days after it was created. */
export function buildIncompleteWeekDigestEmail(
  recipientName: string,
  items: IncompleteWeekItem[]
): { subject: string; message: string; html: string } {
  const count = items.length;
  const subject = `Action needed: ${count} item${count === 1 ? "" : "s"} incomplete after 1 week`;
  const message = `You have ${count} assigned item${count === 1 ? "" : "s"} that ${count === 1 ? "was" : "were"} created a week ago and ${count === 1 ? "is" : "are"} still incomplete. Please update ${count === 1 ? "it" : "them"} in the Geocon Project Timeline.`;

  const esc = escapeHtml;
  const rows = items
    .map(
      (it) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:13px">${esc(it.projectCode)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(it.projectName)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(it.subitemName)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#0A5D6B">${esc(STATUS_LABEL[it.status] ?? it.status)}</td>
        </tr>`
    )
    .join("");

  const hi = esc(firstNameFromDisplayName(recipientName));
  const body = `<p>Hi ${hi},</p>
<p>The following checklist item${count === 1 ? "" : "s"} ${count === 1 ? "was" : "were"} assigned <strong>one week ago</strong> and ${count === 1 ? "is" : "are"} still not marked complete:</p>
<table style="border-collapse:collapse;width:100%;margin:16px 0;font-size:13px">
  <thead>
    <tr style="background:#f1f5f9">
      <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:2px solid #e2e8f0">Code</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:2px solid #e2e8f0">Project</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:2px solid #e2e8f0">Item</th>
      <th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;border-bottom:2px solid #e2e8f0">Status</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<p style="font-size:13px;color:#64748b">Please complete ${count === 1 ? "this item" : "these items"} or update ${count === 1 ? "its" : "their"} status in the app.</p>`;

  return {
    subject,
    message,
    html: wrapEmailLayout({
      headline: "One-week incomplete reminder",
      bodyHtml: body,
      ctaLabel: "Open Project Timeline",
      footerNote: "Geocon Project Management · Automated reminder"
    })
  };
}
