import { escapeHtml } from "./html";

export interface DigestItem {
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

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

const CELL = "padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#334155";
const HEAD =
  "padding:10px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;border-bottom:2px solid #cbd5e1;font-weight:700";

/** Trusted HTML table of digest items (Code / Project / Item / Status). */
export function buildDigestTableHtml(items: DigestItem[]): string {
  const rows = items
    .map(
      (it) =>
        `<tr>
          <td style="${CELL};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:600;color:#0A5D6B">${escapeHtml(it.projectCode)}</td>
          <td style="${CELL}">${escapeHtml(it.projectName)}</td>
          <td style="${CELL}">${escapeHtml(it.subitemName)}</td>
          <td style="${CELL};font-weight:600;color:#073D47">${escapeHtml(statusLabel(it.status))}</td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" style="border-collapse:collapse;width:100%;margin:16px 0;font-size:13px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
  <thead>
    <tr style="background:#f1f5f9">
      <th style="${HEAD}">Code</th>
      <th style="${HEAD}">Project</th>
      <th style="${HEAD}">Item</th>
      <th style="${HEAD}">Status</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

/** Plain-text equivalent of the digest table for in-app notifications. */
export function buildDigestPlain(items: DigestItem[]): string {
  return items
    .map((it) => `${it.projectCode} — ${it.subitemName} (${statusLabel(it.status)})`)
    .join("; ");
}

/** "item" / "items" for pluralizing template copy. */
export function itemLabel(count: number): string {
  return count === 1 ? "item" : "items";
}
