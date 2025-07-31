import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  PORT: 8004,
  CORS_ORIGIN: ["https://localhost:4000", "https://localhost:3000"],
  PROJECT_ROOT: process.cwd(),
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  get TORRENTS_BASE_DIR() {
    // Navigate 4 levels up from /apps/streaming-server/src/ to the monorepo root
    const monorepoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    return path.join(monorepoRoot, "local_dev_deps", "media", "torrents");
  },
};