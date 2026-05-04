export const DEMO_MODE =
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? "true").toLowerCase() === "true";

// Default identity used when no demo session exists yet (server rendering).
// At runtime, components should prefer getDemoUser() which reads localStorage.
export const DEMO_USER = {
  id: "demo-user",
  email: "demo@geoconinc.com",
  name: "Demo User",
  initials: "DU",
  phone: "",
  createdAt: new Date().toISOString()
} as const;

// Pre-filled "remembered" Microsoft accounts shown on the demo login screen.
// Mirrors what MSAL shows for accounts already signed in on the device.
export const DEMO_ACCOUNTS: Array<{ name: string; email: string }> = [
  { name: "Matt Lawson", email: "ml@geoconinc.com" },
  { name: "Sid Mundra", email: "sm@geoconinc.com" }
];

export const ALLOWED_DOMAIN =
  (process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? "geoconinc.com").toLowerCase();
