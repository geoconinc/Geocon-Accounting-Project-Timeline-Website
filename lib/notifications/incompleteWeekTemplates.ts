import { firstNameFromDisplayName } from "./html";
import { renderEmailTemplate, type RenderedEmail } from "./templateEngine";
import { buildDigestTableHtml, buildDigestPlain, itemLabel, type DigestItem } from "./digestTable";

export type IncompleteWeekItem = DigestItem;

/** Cron: subitem still incomplete 7 calendar days after it was created. */
export function buildIncompleteWeekDigestEmail(
  recipientName: string,
  items: IncompleteWeekItem[]
): Promise<RenderedEmail> {
  const count = items.length;
  return renderEmailTemplate(
    "incompleteWeek",
    {
      headline: "One-week incomplete reminder",
      ctaLabel: "Open Project Timeline",
      footerNote: "Geocon Project Management · Automated reminder"
    },
    {
      text: {
        firstName: firstNameFromDisplayName(recipientName),
        itemCount: String(count),
        itemLabel: itemLabel(count)
      },
      html: { itemTable: buildDigestTableHtml(items) },
      plain: { itemTable: buildDigestPlain(items) }
    }
  );
}
