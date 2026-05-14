"use client";

import type { User } from "@/lib/types";

export type RoleAssigneesResponse = {
  projectDirectors: {
    chartLabel: string;
    name: string;
    email: string;
    job: string;
    office: string;
    user: User;
  }[];
  projectManagers: {
    name: string;
    email: string;
    job: string;
    office: string;
    user: User;
  }[];
};

export async function fetchRoleAssignees(): Promise<RoleAssigneesResponse> {
  const res = await fetch("/api/role-assignees");
  if (!res.ok) throw new Error(`/api/role-assignees: ${res.status}`);
  return (await res.json()) as RoleAssigneesResponse;
}
