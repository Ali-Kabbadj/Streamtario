import path from "path";

const isProduction = process.env.NODE_ENV === "production";

export const config = {
  PORT: 8004,
  CORS_ORIGIN: ["https://localhost:4000", 'https://localhost:3000'],
  PROJECT_ROOT: process.cwd(),
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  USE_GPU: true,
  get CACHE_BASE_DIR() {
    if (isProduction) {
      return path.resolve(this.PROJECT_ROOT, "..", "media", "stream_cache");
    } else {
      return path.resolve(this.PROJECT_ROOT, ".cache");
    }
  }
};