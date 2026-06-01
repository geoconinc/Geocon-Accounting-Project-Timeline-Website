import { escapeHtml } from "./dispatch";

export interface DasFollowupItem {
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

export function buildDasFollowupDigestEmail(
  recipientName: string,
  items: DasFollowupItem[],
  appBaseUrl: string | null
): { subject: string; message: string; html: string } {
  const count = items.length;
  const subject = `Weekly reminder: ${count} incomplete DAS item${count === 1 ? "" : "s"}`;
  const message = `You have ${count} incomplete DAS item${count === 1 ? "" : "s"} that still need${count === 1 ? "s" : ""} attention. Please update them in the Geocon Project Timeline.`;

  const esc = escapeHtml;
  const rows = items
    .map(
      (it) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:13px">${esc(it.projectCode)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(it.projectName)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:13px">${esc(it.subitemName)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600">${esc(STATUS_LABEL[it.status] ?? it.status)}</td>
        </tr>`
    )
    .join("");

  const link = appBaseUrl
    ? `<p style="margin-top:20px"><a href="${esc(appBaseUrl)}" style="color:#2563eb;text-decoration:underline">Open Geocon Project Timeline</a></p>`
    : "";

  const html = `<p>Hi ${esc(recipientName.split(",")[0].split(" ")[0])},</p>
<p>This is your weekly reminder that you have <strong>${count}</strong> incomplete DAS item${count === 1 ? "" : "s"} assigned to you:</p>
<table style="border-collapse:collapse;width:100%;margin:12px 0">
  <thead>
    <tr style="background:#f1f5f9">
      <th style="padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Code</th>
      <th style="padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Project</th>
      <th style="padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Item</th>
      <th style="padding:6px 10px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:2px solid #e2e8f0">Status</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<p style="font-size:13px;color:#475569">Please complete these items or update their status in the app.</p>
${link}`;

  return { subject, message, html };
}
