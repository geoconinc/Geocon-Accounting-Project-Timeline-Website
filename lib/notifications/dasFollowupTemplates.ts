import { firstNameFromDisplayName } from "./html";
import { renderEmailTemplate, type RenderedEmail } from "./templateEngine";
import { buildDigestTableHtml, buildDigestPlain, itemLabel, type DigestItem } from "./digestTable";

export type DasFollowupItem = DigestItem;

export function buildDasFollowupDigestEmail(
  recipientName: string,
  items: DasFollowupItem[]
): Promise<RenderedEmail> {
  const count = items.length;
  return renderEmailTemplate(
    "dasFollowup",
    {
      headline: "Weekly DAS reminder",
      ctaLabel: "Open Project Timeline",
      footerNote: "Geocon Project Management · Weekly automated reminder"
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
