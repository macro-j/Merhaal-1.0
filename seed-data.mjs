import { spawn } from "node:child_process";

console.warn("seed-data.mjs is deprecated. Use `pnpm db:seed` instead.");

const child = spawn("pnpm", ["db:seed"], {
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
