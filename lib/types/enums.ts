export type ProjectStatus = "New" | "Completed" | "InProgress" | "Missing" | "Future";
export type ProjectGroup = "Current" | "Future" | "Completed";
export type SubitemStatus = "Completed" | "InProgress" | "Missing" | "NotStarted" | "NA";
/** Certified-payroll reporting cadence (board default: biweekly). */
export type PayrollCycle = "weekly" | "biweekly";
/** GMS prevailing-wage classification (legacy boolean still accepted on the wire). */
export type PrevailingWageType = "no" | "yes" | "union";