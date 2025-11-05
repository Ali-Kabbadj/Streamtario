/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,
  output: "export",
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
