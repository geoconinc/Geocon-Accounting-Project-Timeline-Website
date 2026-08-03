import { appBaseUrl, escapeHtml } from "./html";

export interface EmailLayoutOptions {
  /** Shown in the colored header bar */
  headline: string;
  /** Main HTML (already safe or pre-escaped) */
  bodyHtml: string;
  /** Optional primary button */
  ctaLabel?: string;
  ctaUrl?: string | null;
  /** Footer fine print */
  footerNote?: string;
}

/**
 * Branded HTML wrapper for all outbound notification emails.
 * Includes the Geocon logo (absolute URL) so it renders in email clients.
 */
export function wrapEmailLayout(opts: EmailLayoutOptions): string {
  const url = opts.ctaUrl ?? appBaseUrl();
  const base = appBaseUrl();
  const logoUrl = base ? `${base.replace(/\/$/, "")}/logo.png` : null;

  const brandRow = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Geocon" width="140" height="52"
            style="display:block;height:40px;width:auto;max-width:160px;margin:0 auto;border:0" />`
    : `<p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.12em;
                text-transform:uppercase;color:#073D47;text-align:center">Geocon</p>`;

  const cta =
    url && opts.ctaLabel
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px">
          <tr>
            <td style="border-radius:6px;background:#0A5D6B">
              <a href="${escapeHtml(url)}"
                 style="display:inline-block;background:#0A5D6B;color:#ffffff;text-decoration:none;
                        font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px">
                ${escapeHtml(opts.ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  const footer = opts.footerNote
    ? `<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">${opts.footerNote}</p>`
    : `<p style="margin:0 0 4px;font-size:12px;color:#64748b;line-height:1.5;font-weight:600">
        Geocon Project Management
      </p>
      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5">
        Automated notification · Please do not reply to this email
      </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#e8eef2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8eef2;padding:28px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:580px;background:#ffffff;border-radius:10px;overflow:hidden;
                      border:1px solid #d7e0e6;box-shadow:0 4px 14px rgba(7,61,71,0.08)">
          <tr>
            <td style="padding:20px 28px 16px;background:#ffffff;border-bottom:1px solid #e2e8f0;text-align:center">
              ${brandRow}
              <p style="margin:8px 0 0;font-size:10px;font-weight:600;letter-spacing:0.16em;
                         text-transform:uppercase;color:#94a3b8">Project Management</p>
            </td>
          </tr>
          <tr>
            <td style="background:linear-gradient(135deg,#073D47 0%,#0A5D6B 70%,#0d7a8a 100%);padding:18px 28px">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.14em;
                         text-transform:uppercase;color:rgba(255,255,255,0.7)">Project Timeline</p>
              <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3">
                ${escapeHtml(opts.headline)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;color:#334155;font-size:14px;line-height:1.65">
              ${opts.bodyHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;background:#f4f8fa;border-top:1px solid #e2e8f0">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
