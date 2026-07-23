import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "package.json");
// Prefer an explicit env (set by CI) but always fall back to package.json so
// the version on the site matches the commit being built.
const appVersion =
  (process.env.NEXT_PUBLIC_APP_VERSION || "").trim() ||
  JSON.parse(readFileSync(packageJsonPath, "utf8")).version;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // Tie the build id to the app version so browsers don't keep an old bundle
  // that still shows a stale version string after deploy.
  generateBuildId: async () => appVersion,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion
  },
  experimental: {
    serverComponentsExternalPackages: ["proper-lockfile"]
  },
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256]
  }
};

export default nextConfig;
