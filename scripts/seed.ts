import { storage } from "../lib/storage";

async function main() {
  console.log("Seeding Geocon Project Timeline...");

  const ml = await storage.upsertUser({
    email: "ml@geoconinc.com",
    name: "Matt Lawson",
    initials: "ML"
  });

  const aroviste = await storage.createProject({
    code: "W16288802",
    name: "Aroviste",
    ownerId: ml.id,
    status: "InProgress",
    group: "Current",
    startDate: "2026-04-22",
    timelineStart: "2026-04-22",
    timelineEnd: "2026-04-23",
    dirNumber: null,
    union: true,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    office: null,
    notes: null,
    lastUpdatedBy: ml.id
  });

  const setupForms = [
    { name: "DAS Setup Sheet", status: "Completed" as const, due: "2026-04-23", owner: ml.id },
    { name: "DAS 140 & Confirmation", status: "Missing" as const, due: null, owner: null },
    { name: "DAS 142 & Confirmation", status: "Missing" as const, due: "2026-04-30", owner: null },
    { name: "Fringe Benefit Statement", status: "NotStarted" as const, due: null, owner: null },
    { name: "Training Fund", status: "NotStarted" as const, due: null, owner: null },
    { name: "Other Certified Payroll Setup Forms", status: "NA" as const, due: null, owner: null },
    { name: "Certified Payroll Entry", status: "NotStarted" as const, due: null, owner: null },
    { name: "Section 3 Forms", status: "NotStarted" as const, due: null, owner: null },
    { name: "Employee Information Sheet", status: "NotStarted" as const, due: null, owner: null },
    { name: "Payroll Deduction Authorization", status: "NotStarted" as const, due: null, owner: null }
  ];
  for (const s of setupForms) {
    await storage.createSubitem({
      projectId: aroviste.id,
      name: s.name,
      ownerId: s.owner,
      status: s.status,
      dueDate: s.due,
      dateCompleted: s.status === "Completed" ? "2026-04-23" : null,
      notes: null
    });
  }

  await storage.createProject({
    code: "TEST",
    name: "TEST",
    ownerId: null,
    status: "Future",
    group: "Future",
    startDate: null,
    timelineStart: null,
    timelineEnd: null,
    dirNumber: null,
    union: false,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    office: null,
    notes: null,
    lastUpdatedBy: ml.id
  });

  await storage.createProject({
    code: "W1500-06-26",
    name: "Mac",
    ownerId: ml.id,
    status: "Completed",
    group: "Completed",
    startDate: "2026-04-23",
    timelineStart: "2026-04-24",
    timelineEnd: "2026-04-25",
    dirNumber: null,
    union: false,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    office: null,
    notes: null,
    lastUpdatedBy: ml.id
  });

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
