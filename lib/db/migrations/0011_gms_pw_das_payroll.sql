-- GMS extended fields (expand: nullable / defaults so old rows and old GMS payloads stay valid).
-- William (GMS): prevailingWageType, union, dirNumber, dirContractNumber,
-- das140Status/das140FiledAt, das142Status/das142FiledAt. Payroll cycle is Timeline-owned.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS prevailing_wage_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dir_contract_number text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS payroll_cycle text NOT NULL DEFAULT 'biweekly';

CREATE INDEX IF NOT EXISTS idx_projects_payroll_cycle ON projects (payroll_cycle);
