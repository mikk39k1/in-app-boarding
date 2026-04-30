import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SDK is consumed from a workspace package; transpile it so Next 16 can
  // bundle the source ESM cleanly without TS source map quirks.
  transpilePackages: ["@ib/sdk", "@ib/shared"],
};

export default nextConfig;
