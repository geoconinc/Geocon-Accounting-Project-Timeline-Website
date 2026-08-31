import { describe, expect, it } from "vitest";
import {
  accountingAssigneeIds,
  isAccountingEmailRecipient,
  isProjectLeadUserId
} from "@/lib/notifications/accountingOnly";

const project = {
  projectManagerId: "pm-1",
  projectDirectorId: "dir-1"
};

describe("accountingOnly recipients", () => {
  it("treats PM and director as project leads", () => {
    expect(isProjectLeadUserId("pm-1", project)).toBe(true);
    expect(isProjectLeadUserId("dir-1", project)).toBe(true);
    expect(isProjectLeadUserId("acct-1", project)).toBe(false);
  });

  it("only emails accounting assignees", () => {
    expect(isAccountingEmailRecipient("acct-1", project)).toBe(true);
    expect(isAccountingEmailRecipient("pm-1", project)).toBe(false);
    expect(isAccountingEmailRecipient("dir-1", project)).toBe(false);
  });

  it("dedupes accounting checklist owners and drops leads", () => {
    expect(
      accountingAssigneeIds(project, ["acct-1", "pm-1", "acct-1", "dir-1", "acct-2", null])
    ).toEqual(["acct-1", "acct-2"]);
  });
});
