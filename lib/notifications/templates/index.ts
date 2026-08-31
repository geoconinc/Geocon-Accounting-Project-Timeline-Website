/**
 * All outbound email templates. Each builder returns { subject, message, html }.
 *
 * | Template | Trigger | Builder |
 * |----------|---------|---------|
 * | New project — assignee tasks | Project created | buildAssigneeDigestEmail |
 * | Weekly DAS reminder | Cron /api/cron/das-followup | buildDasFollowupDigestEmail |
 * | Due today | Cron /api/cron/due-dates | buildDueTodayEmail |
 * | One week incomplete | Cron /api/cron/incomplete-week | buildIncompleteWeekDigestEmail |
 * | Monday incomplete | Cron /api/cron/monday-incomplete | buildMondayIncompleteDigestEmail |
 * | Subitem assigned | PATCH subitem ownerId (accounting only) | buildSubitemAssignedEmail |
 * | Manual board message | POST /api/notifications (accounting only) | buildManualProjectUpdateEmail |
 *
 * Project managers and directors are never emailed (accounting-only recipients).
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
export { buildMondayIncompleteDigestEmail } from "../mondayIncompleteTemplates";
