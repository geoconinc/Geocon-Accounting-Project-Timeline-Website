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
 */
export function wrapEmailLayout(opts: EmailLayoutOptions): string {
  const url = opts.ctaUrl ?? appBaseUrl();
  const cta =
    url && opts.ctaLabel
      ? `<p style="margin:28px 0 8px;text-align:center">
          <a href="${escapeHtml(url)}"
             style="display:inline-block;background:#0A5D6B;color:#ffffff;text-decoration:none;
                    font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px">
            ${escapeHtml(opts.ctaLabel)}
          </a>
        </p>`
      : "";

  const footer = opts.footerNote
    ? `<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">${opts.footerNote}</p>`
    : `<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5">
        Geocon Project Management · Automated notification
      </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;
                      border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(15,23,42,0.06)">
          <tr>
            <td style="background:linear-gradient(135deg,#073D47 0%,#0A5D6B 100%);padding:20px 28px">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.12em;
                         text-transform:uppercase;color:rgba(255,255,255,0.75)">Geocon</p>
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3">
                ${escapeHtml(opts.headline)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#334155;font-size:14px;line-height:1.65">
              ${opts.bodyHtml}
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;background:#f8fafc;border-top:1px solid #e2e8f0">
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
