/** Shape of `data/geoconRoleAssignees.json` and admin override `roleAssignees`. */
export interface GeoconRoleAssigneesFile {
  source: string;
  projectDirectors: {
    chartLabel: string;
    name: string;
    email: string;
    job: string;
    office: string;
    inEmployeeList: boolean;
  }[];
  projectManagers: {
    name: string;
    email: string;
    job: string;
    office: string;
  }[];
}
