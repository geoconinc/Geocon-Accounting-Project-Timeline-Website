/**
 * All outbound email templates. Each builder returns { subject, message, html }.
 *
 * | Template | Trigger | Builder |
 * |----------|---------|---------|
 * | New project — PM | Project created | buildProjectManagerCreationEmail |
 * | New project — assignee tasks | Project created | buildAssigneeDigestEmail |
 * | Weekly DAS reminder | Cron /api/cron/das-followup | buildDasFollowupDigestEmail |
 * | Due today | Cron /api/cron/due-dates | buildDueTodayEmail |
 * | One week incomplete | Cron /api/cron/incomplete-week | buildIncompleteWeekDigestEmail |
 * | Project owner assigned | PATCH project ownerId | buildProjectOwnerAssignedEmail |
 * | Project status changed | PATCH project status | buildProjectStatusChangedEmail |
 * | Subitem assigned | PATCH subitem ownerId | buildSubitemAssignedEmail |
 * | Manual board message | POST /api/notifications | buildManualProjectUpdateEmail |
 */

export {
  buildDueTodayEmail,
  buildProjectOwnerAssignedEmail,
  buildProjectStatusChangedEmail,
  buildSubitemAssignedEmail,
  buildManualProjectUpdateEmail
} from "./operational";

export { buildProjectManagerCreationEmail, buildAssigneeDigestEmail } from "../projectCreationTemplates";
export { buildDasFollowupDigestEmail } from "../dasFollowupTemplates";
export { buildIncompleteWeekDigestEmail } from "../incompleteWeekTemplates";
