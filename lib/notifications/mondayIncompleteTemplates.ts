import { firstNameFromDisplayName } from "./html";
import { renderEmailTemplate, type RenderedEmail } from "./templateEngine";
import {
  buildDigestTableHtml,
  buildDigestPlainList,
  itemLabel,
  type DigestItem
} from "./digestTable";

export type MondayIncompleteItem = DigestItem;

/** Cron: weekly Monday digest of all incomplete checklist items for an assignee. */
export function buildMondayIncompleteDigestEmail(
  recipientName: string,
  items: MondayIncompleteItem[]
): Promise<RenderedEmail> {
  const count = items.length;
  return renderEmailTemplate(
    "mondayIncomplete",
    {
      headline: "Incomplete items reminder",
      ctaLabel: "Open Project Timeline",
      footerNote: "Geocon Project Management · Weekly Monday reminder"
    },
    {
      text: {
        firstName: firstNameFromDisplayName(recipientName),
        itemCount: String(count),
        itemLabel: itemLabel(count)
      },
      html: { itemTable: buildDigestTableHtml(items) },
      plain: { itemTable: buildDigestPlainList(items) }
    }
  );
}
