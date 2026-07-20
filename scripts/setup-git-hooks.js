const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const gitDir = path.join(root, ".git");

if (!fs.existsSync(gitDir)) return;

const hooksDir = path.join(root, ".githooks");

if (fs.existsSync(hooksDir)) {
  for (const entry of fs.readdirSync(hooksDir)) {
    fs.chmodSync(path.join(hooksDir, entry), 0o755);
  }
}

try {
  execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "ignore" });
} catch {
  /* ignore if git config fails */
}
