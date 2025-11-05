#!/usr/bin/env node
import { spawn } from "child_process";

const env = {
  ...process.env,
  FORCE_COLOR: "1",
  npm_config_color: "always",
};

const proc = spawn("npm", ["run", "dev:raw"], {
  shell: true,
  env,
  stdio: ["inherit", "pipe", "pipe"],
});

proc.stdout.on("data", (chunk) => {
  const line = chunk.toString();
  if (!/Watchpack Error/.test(line)) {
    process.stdout.write(chunk);
  }
});

proc.stderr.on("data", (chunk) => {
  const line = chunk.toString();
  if (!/Watchpack Error/.test(line)) {
    process.stderr.write(chunk);
  }
});

proc.on("exit", (code) => {
  process.exit(code);
});
