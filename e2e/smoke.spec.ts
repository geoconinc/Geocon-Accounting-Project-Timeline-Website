import { test, expect } from "@playwright/test";

test.describe("authenticated smoke", () => {
  test("board loads for a signed-in user", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: "Board", exact: true })).toBeVisible();
    // Project name renders as an editable input (placeholder "Project name").
    await expect(page.getByPlaceholder("Project name").first()).toHaveValue("E2E Smoke Project");
  });

  test("board shows toolbar search and filter controls", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByPlaceholder(/Search projects/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Filter/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Sort/i })).toBeVisible();
  });

  test("search filters the board to matching projects", async ({ page }) => {
    await page.goto("/");
    const search = page.getByPlaceholder(/Search projects/i);
    await search.fill("E2E Smoke");
    await expect(page.getByPlaceholder("Project name").first()).toHaveValue("E2E Smoke Project");

    await search.fill("zzz-no-match-zzz");
    await expect(page.getByPlaceholder("Project name")).toHaveCount(0);

    await search.fill("");
    await expect(page.getByPlaceholder("Project name").first()).toHaveValue("E2E Smoke Project");
  });

  test("main routes render without redirecting to login", async ({ page }) => {
    for (const route of ["/timeline", "/dashboard", "/documents", "/team"]) {
      await page.goto(route);
      expect(page.url()).toContain(route);
      // Sidebar lives in the authenticated layout, so its presence proves we
      // were not bounced to /login.
      await expect(page.getByRole("link", { name: "Board", exact: true })).toBeVisible();
    }
  });

  test("sidebar navigation reaches timeline and dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Timeline" }).click();
    await expect(page).toHaveURL(/\/timeline/);
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("verify-session API confirms the session", async ({ request }) => {
    const res = await request.get("/api/verify-session");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.user?.email).toBe("e2e@geoconinc.com");
  });

  test("projects API returns the seeded board payload", async ({ request }) => {
    const res = await request.get("/api/projects");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.projects)).toBe(true);
    expect(body.projects.some((p: { name: string }) => p.name === "E2E Smoke Project")).toBe(true);
    expect(body.me).toBeTruthy();
  });
});

test.describe("unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to login when there is no session", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: /Sign in with Microsoft/i })).toBeVisible();
    await expect(page.getByText(/Access restricted to @geoconinc\.com/i)).toBeVisible();
  });

  test("protected routes bounce to login", async ({ page }) => {
    for (const route of ["/timeline", "/dashboard", "/documents"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("API returns 401 without a session", async ({ request }) => {
    const res = await request.get("/api/verify-session");
    expect(res.status()).toBe(401);
  });

  test("projects API returns 401 without a session", async ({ request }) => {
    const res = await request.get("/api/projects");
    expect(res.status()).toBe(401);
  });
});

test.describe("GMS integration auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("rejects requests without an integration key", async ({ request }) => {
    const res = await request.post("/api/integrations/gms/projects", {
      data: { projectNumber: "X" }
    });
    expect(res.status()).toBe(401);
  });
});
