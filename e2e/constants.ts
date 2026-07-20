import path from "node:path";

/** Port the E2E Next server listens on (kept off 3000 to avoid clashing with dev). */
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/** Isolated data dir for the JSON storage driver during E2E — never touches real data. */
export const E2E_DATA_DIR = path.join(process.cwd(), "e2e", ".data");

/** Where the authenticated storage state (session cookie) is written. */
export const E2E_STORAGE_STATE = path.join(process.cwd(), "e2e", ".auth", "state.json");

export const E2E_USER = {
  id: "e2e-user-1",
  email: "e2e@geoconinc.com",
  name: "E2E Tester"
};
