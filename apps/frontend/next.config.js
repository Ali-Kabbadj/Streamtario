/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "export",
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "C:/pagefile.sys",
          "C:/swapfile.sys",
          "C:/DumpStack.log.tmp",
        ],
      };

      config.plugins.push(
        new webpack.WatchIgnorePlugin({
          paths: [
            /C:\\pagefile\.sys$/,
            /C:\\swapfile\.sys$/,
            /C:\\DumpStack\.log\.tmp$/,
          ],
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
