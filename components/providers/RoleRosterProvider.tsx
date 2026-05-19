"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { User } from "@/lib/types";
import type { GeoconRoleAssigneesFile } from "@/lib/types/roleAssigneeData";
import { fetchRoleAssignees, type RoleAssigneesResponse } from "@/lib/client/roleAssigneesApi";
import {
  usersMatchingDirectorRoster,
  usersMatchingPmRoster
} from "@/lib/domain/roleAssigneeRoster";

type RoleRosterContextValue = {
  loading: boolean;
  error: string | null;
  roster: GeoconRoleAssigneesFile | null;
  pmUsers: User[];
  directorUsers: User[];
  pmRosterUsers: (allUsers: User[]) => User[];
  directorRosterUsers: (allUsers: User[]) => User[];
  refresh: () => Promise<void>;
};

const RoleRosterContext = createContext<RoleRosterContextValue | null>(null);

function toRosterFile(data: RoleAssigneesResponse): GeoconRoleAssigneesFile {
  return {
    source: "postgres",
    projectDirectors: data.projectDirectors.map((d) => ({
      chartLabel: d.chartLabel,
      name: d.name,
      email: d.email,
      job: d.job,
      office: d.office,
      inEmployeeList: d.inEmployeeList ?? true
    })),
    projectManagers: data.projectManagers.map((p) => ({
      name: p.name,
      email: p.email,
      job: p.job,
      office: p.office
    }))
  };
}

export function RoleRosterProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<GeoconRoleAssigneesFile | null>(null);
  const [pmUsers, setPmUsers] = useState<User[]>([]);
  const [directorUsers, setDirectorUsers] = useState<User[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRoleAssignees();
      setRoster(toRosterFile(data));
      setPmUsers(data.projectManagers.map((x) => x.user));
      setDirectorUsers(data.projectDirectors.map((x) => x.user));
    } catch (e) {
      setRoster(null);
      setPmUsers([]);
      setDirectorUsers([]);
      setError(e instanceof Error ? e.message : "Could not load roster");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<RoleRosterContextValue>(
    () => ({
      loading,
      error,
      roster,
      pmUsers,
      directorUsers,
      pmRosterUsers: (allUsers) => usersMatchingPmRoster(allUsers, roster),
      directorRosterUsers: (allUsers) => usersMatchingDirectorRoster(allUsers, roster),
      refresh: load
    }),
    [loading, error, roster, pmUsers, directorUsers, load]
  );

  return <RoleRosterContext.Provider value={value}>{children}</RoleRosterContext.Provider>;
}

export function useRoleRoster(): RoleRosterContextValue {
  const ctx = useContext(RoleRosterContext);
  if (!ctx) {
    throw new Error("useRoleRoster must be used within RoleRosterProvider");
  }
  return ctx;
}
