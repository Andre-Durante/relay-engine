import { mkdir, rm, stat } from "node:fs/promises";
import { spawn } from "node:child_process";

const lockDir = new URL("../.prisma-generate.lock", import.meta.url);
const staleLockAgeMs = 2 * 60 * 1000;

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock() {
  while (true) {
    try {
      // Directory creation is atomic, so it works as a tiny cross-process lock.
      // This prevents `npm run build` and `npm test` from generating Prisma
      // Client into the same folder at the same time.
      await mkdir(lockDir);
      return;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }

      const lockStats = await stat(lockDir).catch(() => null);
      const lockAgeMs = lockStats ? Date.now() - lockStats.mtimeMs : 0;

      // If a previous process crashed while holding the lock, clear it after a
      // short timeout so local development is not permanently blocked.
      if (lockAgeMs > staleLockAgeMs) {
        await rm(lockDir, { recursive: true, force: true });
        continue;
      }

      await sleep(100);
    }
  }
}

async function runPrismaGenerate() {
  await new Promise((resolve, reject) => {
    // Use the local Prisma CLI from node_modules through npx so the script works
    // the same way on developer machines and CI.
    const child = spawn("npx", ["prisma", "generate"], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`prisma generate failed with exit code ${code}`));
    });
  });
}

await acquireLock();

try {
  await runPrismaGenerate();
} finally {
  // Always release the lock, even if Prisma generation fails.
  await rm(lockDir, { recursive: true, force: true });
}
