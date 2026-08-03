import { z } from "zod";
import { gmsDasFieldsSchema } from "@/lib/domain/gmsDas";

const personSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().email().optional()
  })
  .passthrough()
  .optional();

/** One row from GMS GET /api/integrations/das-status. */
export const gmsDasStatusProjectSchema = z
  .object({
    projectNumber: z.string().min(1),
    proposalNumber: z.string().optional(),
    projectName: z.string().optional(),
    officeCode: z.string().optional(),
    stage: z.string().optional(),
    projectManager: personSchema,
    updatedAt: z.string().optional()
  })
  .merge(gmsDasFieldsSchema);

export const gmsDasStatusResponseSchema = z.object({
  generatedAt: z.string().optional(),
  count: z.number().optional(),
  projects: z.array(gmsDasStatusProjectSchema)
});

export type GmsDasStatusProject = z.infer<typeof gmsDasStatusProjectSchema>;
export type GmsDasStatusResponse = z.infer<typeof gmsDasStatusResponseSchema>;

const DEFAULT_URL = "https://geocon-gms.azurewebsites.net/api/integrations/das-status";

export function gmsDasStatusUrl(): string {
  return (process.env.GMS_DAS_STATUS_URL ?? DEFAULT_URL).replace(/\/$/, "");
}

/**
 * Pulls prevailing-wage DAS status from GMS. Uses the same integration key GMS
 * already shares with us for the project push webhook.
 */
export async function fetchGmsDasStatus(opts?: {
  status?: string;
  since?: string;
  projectNumber?: string;
}): Promise<GmsDasStatusResponse> {
  const key = process.env.GMS_INTEGRATION_API_KEY;
  if (!key) throw new Error("GMS_INTEGRATION_API_KEY is not set");

  const url = new URL(gmsDasStatusUrl());
  if (opts?.status) url.searchParams.set("status", opts.status);
  if (opts?.since) url.searchParams.set("since", opts.since);
  if (opts?.projectNumber) url.searchParams.set("projectNumber", opts.projectNumber);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Integration-Key": key
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gms_das_status_${res.status}:${text.slice(0, 200)}`);
  }

  const json: unknown = await res.json();
  const parsed = gmsDasStatusResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`gms_das_status_invalid_payload:${parsed.error.message.slice(0, 200)}`);
  }
  return parsed.data;
}
