import { describe, it, expect, afterEach } from "vitest";
import { boardUrl, escapeHtml, firstNameFromDisplayName } from "@/lib/notifications/html";
import { wrapEmailLayout } from "@/lib/notifications/layout";
import {
  buildDueTodayEmail,
  buildProjectOwnerAssignedEmail,
  buildProjectStatusChangedEmail,
  buildSubitemAssignedEmail,
  buildManualProjectUpdateEmail
} from "@/lib/notifications/templates/operational";
import {
  buildProjectManagerCreationEmail,
  buildAssigneeDigestEmail
} from "@/lib/notifications/projectCreationTemplates";
import { buildDasFollowupDigestEmail } from "@/lib/notifications/dasFollowupTemplates";
import { buildIncompleteWeekDigestEmail } from "@/lib/notifications/incompleteWeekTemplates";
import { SUBITEM_ASSIGNMENT_SNIPPET } from "@/lib/notifications/subitemAssignmentSnippets";
import { DEFAULT_SUBITEM_NAMES } from "@/lib/domain/projectDefaults";

describe("escapeHtml", () => {
  it("escapes the five HTML special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
  it("leaves ordinary text alone", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });
});

describe("firstNameFromDisplayName", () => {
  it("takes the part before a comma (Last, First style)", () => {
    expect(firstNameFromDisplayName("Brightman, Joanne")).toBe("Brightman");
  });
  it("takes the first word of a First Last name", () => {
    expect(firstNameFromDisplayName("Jane Doe")).toBe("Jane");
  });
  it("returns 'there' for empty input", () => {
    expect(firstNameFromDisplayName("")).toBe("there");
    expect(firstNameFromDisplayName("   ")).toBe("there");
  });
});

describe("boardUrl", () => {
  const originalBase = process.env.APP_BASE_URL;
  const originalRedirect = process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI;

  afterEach(() => {
    if (originalBase === undefined) delete process.env.APP_BASE_URL;
    else process.env.APP_BASE_URL = originalBase;
    if (originalRedirect === undefined) delete process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI;
    else process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI = originalRedirect;
  });

  it("returns null when no base URL is configured", () => {
    delete process.env.APP_BASE_URL;
    delete process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI;
    expect(boardUrl("p1")).toBeNull();
    expect(boardUrl()).toBeNull();
  });

  it("deep-links to a project and strips a trailing slash from the base", () => {
    process.env.APP_BASE_URL = "https://timeline.example.com/";
    expect(boardUrl("p1")).toBe("https://timeline.example.com/?focusProject=p1");
    expect(boardUrl()).toBe("https://timeline.example.com");
  });
});

describe("wrapEmailLayout", () => {
  it("includes the escaped headline and body", () => {
    const html = wrapEmailLayout({
      headline: "Hi <script>",
      bodyHtml: "<p>Body</p>",
      ctaLabel: "Open",
      ctaUrl: "https://example.com"
    });
    expect(html).toContain("Hi &lt;script&gt;");
    expect(html).toContain("<p>Body</p>");
    expect(html).toContain("https://example.com");
    expect(html).toContain("Open");
  });

  it("omits the CTA when label or URL is missing", () => {
    const html = wrapEmailLayout({ headline: "X", bodyHtml: "Y", ctaUrl: null });
    expect(html).not.toContain("Open Project Timeline");
  });
});

describe("operational email templates", () => {
  it("buildDueTodayEmail escapes user-controlled fields", async () => {
    const mail = await buildDueTodayEmail({
      recipientName: "Jane",
      subitemName: "<b>Task</b>",
      projectCode: "A-1",
      projectName: "Proj & Co",
      dueDate: "2026-07-20"
    });
    expect(mail.subject).toContain("A-1");
    expect(mail.html).toContain("&lt;b&gt;Task&lt;/b&gt;");
    expect(mail.html).toContain("Proj &amp; Co");
    expect(mail.message).toContain("due today");
  });

  it("buildProjectOwnerAssignedEmail includes actor and project", async () => {
    const mail = await buildProjectOwnerAssignedEmail({
      recipientName: "Bob",
      actorName: "Alice",
      projectCode: "B-2",
      projectName: "Bridge"
    });
    expect(mail.subject).toContain("B-2");
    expect(mail.html).toContain("Alice");
    expect(mail.message).toContain("owner");
  });

  it("buildProjectStatusChangedEmail includes the new status", async () => {
    const mail = await buildProjectStatusChangedEmail({
      recipientName: "Bob",
      actorName: "Alice",
      projectCode: "C-3",
      projectName: "Canal",
      newStatus: "Completed"
    });
    expect(mail.subject).toContain("Completed");
    expect(mail.html).toContain("Completed");
  });

  it("buildSubitemAssignedEmail names the checklist item", async () => {
    const mail = await buildSubitemAssignedEmail({
      recipientName: "Bob",
      actorName: "Alice",
      subitemName: "Training Fund",
      projectCode: "D-4",
      projectName: "Dock"
    });
    expect(mail.subject).toContain("Training Fund");
    expect(mail.html).toContain("Training Fund");
  });

  it("buildManualProjectUpdateEmail escapes the message body", async () => {
    const mail = await buildManualProjectUpdateEmail({
      recipientName: "Bob",
      actorName: "Alice",
      projectCode: "E-5",
      projectName: "East",
      messageBody: "<script>alert(1)</script>"
    });
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).not.toContain("<script>alert");
  });
});

describe("project creation / digest templates", () => {
  const ctx = {
    projectCode: "F-6",
    projectName: "Factory",
    office: "San Diego",
    creatorName: "Creator"
  };

  it("buildProjectManagerCreationEmail mentions DAS Setup Sheet when assigned", async () => {
    const withSetup = await buildProjectManagerCreationEmail(ctx, "Pat", ["DAS Setup Sheet"]);
    expect(withSetup.html).toContain("DAS Setup Sheet");
    expect(withSetup.message).toContain("DAS Setup Sheet");

    const without = await buildProjectManagerCreationEmail(ctx, "Pat", []);
    expect(without.message).not.toContain("DAS Setup Sheet subitem");
  });

  it("buildAssigneeDigestEmail lists assigned tasks", async () => {
    const mail = await buildAssigneeDigestEmail(ctx, "Sam", ["Training Fund", "Section 3 Forms"]);
    expect(mail.subject).toContain("F-6");
    expect(mail.message).toContain("Training Fund");
    expect(mail.html).toContain("Section 3 Forms");
  });

  it("buildDasFollowupDigestEmail pluralizes correctly", async () => {
    const one = await buildDasFollowupDigestEmail("Jane Doe", [
      { projectCode: "A", projectName: "P", subitemName: "DAS 140", status: "Missing" }
    ]);
    expect(one.subject).toContain("1 incomplete DAS item");
    expect(one.subject).not.toContain("items");

    const many = await buildDasFollowupDigestEmail("Jane Doe", [
      { projectCode: "A", projectName: "P", subitemName: "DAS 140", status: "NotStarted" },
      { projectCode: "B", projectName: "Q", subitemName: "DAS 142", status: "InProgress" }
    ]);
    expect(many.subject).toContain("2 incomplete DAS items");
    expect(many.html).toContain("Not Started");
    expect(many.html).toContain("In Progress");
  });

  it("buildIncompleteWeekDigestEmail builds a subject with the count", async () => {
    const mail = await buildIncompleteWeekDigestEmail("Jane", [
      { projectCode: "A", projectName: "P", subitemName: "Task", status: "Missing" }
    ]);
    expect(mail.subject.toLowerCase()).toContain("incomplete");
    expect(mail.html).toContain("A");
  });
});

describe("SUBITEM_ASSIGNMENT_SNIPPET coverage", () => {
  it("has a snippet for every default subitem name", () => {
    for (const name of DEFAULT_SUBITEM_NAMES) {
      expect(SUBITEM_ASSIGNMENT_SNIPPET[name], `missing snippet for ${name}`).toBeTruthy();
    }
  });
});
