import { escapeHtml } from "./html";
import { wrapEmailLayout } from "./layout";
import { getEffectiveNotificationConfig } from "./emailConfig";
import type { EmailTemplateKey } from "./emailConfigTypes";

// Renders admin-editable email templates. Templates are plain text with {{token}} merge
// fields. Text tokens are HTML-escaped in the body and left raw in the subject; HTML
// tokens (e.g. {{taskList}}, {{itemTable}}) expand to pre-built, trusted markup. A plain
// map supplies text equivalents of the HTML tokens for the in-app notification message.

const TOKEN_RE = /\{\{\s*(\w+)\s*\}\}/g;

export interface RenderedEmail {
  subject: string;
  message: string;
  html: string;
}

export interface TemplateTokens {
  /** Escaped into HTML, inserted raw into the subject and plain message. */
  text?: Record<string, string>;
  /** Trusted HTML fragments inserted verbatim into the body. */
  html?: Record<string, string>;
  /** Plain-text equivalents of the HTML tokens for the in-app message. */
  plain?: Record<string, string>;
}

/** Subject: raw token substitution (subjects are plain text, no HTML). */
function renderSubject(template: string, text: Record<string, string>): string {
  return template.replace(TOKEN_RE, (_, key: string) => text[key] ?? "");
}

function escapeAndBreak(segment: string): string {
  return escapeHtml(segment).replace(/\n/g, "<br>");
}

/** Body: escape author text, honor line breaks, and splice token values. */
function renderBodyHtml(
  template: string,
  text: Record<string, string>,
  html: Record<string, string>
): string {
  let out = "";
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(template)) !== null) {
    out += escapeAndBreak(template.slice(lastIndex, match.index));
    const key = match[1];
    if (key in html) out += html[key];
    else if (key in text) out += escapeHtml(text[key]);
    lastIndex = match.index + match[0].length;
  }
  out += escapeAndBreak(template.slice(lastIndex));
  return out;
}

/** Plain message for in-app notifications: collapse whitespace, prefer plain tokens. */
function renderPlain(
  template: string,
  text: Record<string, string>,
  plain: Record<string, string>
): string {
  return template
    .replace(TOKEN_RE, (_, key: string) => plain[key] ?? text[key] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves the (possibly admin-overridden) template for `key` and renders it with the
 * supplied token values, wrapping the body in the branded layout.
 */
export async function renderEmailTemplate(
  key: EmailTemplateKey,
  layout: { headline: string; ctaLabel: string; footerNote?: string },
  tokens: TemplateTokens
): Promise<RenderedEmail> {
  const config = await getEffectiveNotificationConfig();
  const template = config.templates[key];
  const text = tokens.text ?? {};
  const html = tokens.html ?? {};
  const plain = tokens.plain ?? {};

  return {
    subject: renderSubject(template.subject, text),
    message: renderPlain(template.body, text, plain),
    html: wrapEmailLayout({
      headline: layout.headline,
      bodyHtml: renderBodyHtml(template.body, text, html),
      ctaLabel: layout.ctaLabel,
      footerNote: layout.footerNote
    })
  };
}
