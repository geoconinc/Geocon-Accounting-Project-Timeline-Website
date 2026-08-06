import { describe, it, expect } from "vitest";
import {
  isOffice,
  resolveAssigneeId,
  resolveOfficeSubitemOwnerId,
  subitemOwnerIdForOffice,
  ASSIGNEE_PROJECT_MANAGER,
  OFFICE_ASSIGNEES,
  OFFICES
} from "@/lib/domain/offices";

const users = [
  { id: "u-lauren", name: "Lauren Mason", email: "lmason@geoconinc.com" },
  { id: "u-kailua", name: "Kailua Mizejewski", email: "mizejewski@geoconinc.com" },
  { id: "u-pm", name: "Some PM", email: "pm@geoconinc.com" }
];

describe("isOffice", () => {
  it("accepts known offices", () => {
    for (const office of OFFICES) expect(isOffice(office)).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isOffice("Nowhere")).toBe(false);
    expect(isOffice(null)).toBe(false);
    expect(isOffice(123)).toBe(false);
  });
});

describe("resolveAssigneeId", () => {
  it("matches by name, case-insensitively", () => {
    expect(resolveAssigneeId(users, "lauren mason")).toBe("u-lauren");
  });
  it("returns null when no name matches", () => {
    expect(resolveAssigneeId(users, "Nobody Here")).toBeNull();
  });
});

describe("resolveOfficeSubitemOwnerId", () => {
  it("returns the project manager id for the PM placeholder", () => {
    expect(resolveOfficeSubitemOwnerId(ASSIGNEE_PROJECT_MANAGER, users, "u-pm")).toBe("u-pm");
  });
  it("resolves a named assignee", () => {
    expect(resolveOfficeSubitemOwnerId("Lauren Mason", users, null)).toBe("u-lauren");
  });
  it("returns null for an undefined rule", () => {
    expect(resolveOfficeSubitemOwnerId(undefined, users, "u-pm")).toBeNull();
  });
});

describe("subitemOwnerIdForOffice", () => {
  it("returns null when office is null", () => {
    expect(subitemOwnerIdForOffice(null, "DAS 140 & Confirmation", users, "u-pm")).toBeNull();
  });
  it("assigns the PM to the DAS Setup Sheet in San Diego", () => {
    expect(subitemOwnerIdForOffice("San Diego", "DAS Setup Sheet", users, "u-pm")).toBe("u-pm");
  });
  it("assigns the mapped person for a San Diego DAS 140", () => {
    expect(subitemOwnerIdForOffice("San Diego", "DAS 140 & Confirmation", users, "u-pm")).toBe(
      "u-lauren"
    );
  });
});

describe("OFFICE_ASSIGNEES accounting matrix", () => {
  const KAILUA_ITEMS = [
    "Fringe Benefit Statement",
    "Training Fund",
    "Other Certified Payroll Setup Forms",
    "Section 3 Forms",
    "Employee Information Sheet",
    "Payroll Deduction Authorization"
  ] as const;

  it("assigns Kailua on payroll setup forms for every office", () => {
    for (const office of OFFICES) {
      for (const item of KAILUA_ITEMS) {
        expect(OFFICE_ASSIGNEES[office][item]).toBe("Kailua Mizejewski");
      }
    }
  });

  it("assigns Certified Payroll Entry: Keiala for LA/OC/RV/SB offices, Jill for EB/NB/RK/SA/SJ/SD", () => {
    expect(OFFICE_ASSIGNEES.Burbank["Certified Payroll Entry"]).toBe("Keiala Beck"); // LA
    expect(OFFICE_ASSIGNEES["Orange County"]["Certified Payroll Entry"]).toBe("Keiala Beck"); // OC
    expect(OFFICE_ASSIGNEES.Murrieta["Certified Payroll Entry"]).toBe("Keiala Beck"); // RV
    expect(OFFICE_ASSIGNEES.Redlands["Certified Payroll Entry"]).toBe("Keiala Beck"); // SB

    expect(OFFICE_ASSIGNEES.Livermore["Certified Payroll Entry"]).toBe("Jill Sader"); // EB
    expect(OFFICE_ASSIGNEES.Suisun["Certified Payroll Entry"]).toBe("Jill Sader"); // NB
    expect(OFFICE_ASSIGNEES.Rocklin["Certified Payroll Entry"]).toBe("Jill Sader"); // RK
    expect(OFFICE_ASSIGNEES.Sacramento["Certified Payroll Entry"]).toBe("Jill Sader"); // SA
    expect(OFFICE_ASSIGNEES.Stockton["Certified Payroll Entry"]).toBe("Jill Sader"); // SJ
    expect(OFFICE_ASSIGNEES["San Diego"]["Certified Payroll Entry"]).toBe("Jill Sader"); // SD
  });
});
