import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@thegame/game-core", "@thegame/shared"]
};

export default nextConfig;
