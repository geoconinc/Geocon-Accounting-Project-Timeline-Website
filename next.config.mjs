import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const packageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "package.json");
const appVersion = JSON.parse(readFileSync(packageJsonPath, "utf8")).version;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
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
