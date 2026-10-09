import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/policy";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the project root to interactive_plan/ so a lockfile elsewhere in the
    // repo can never change module resolution (ip-spec §6).
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Every route refuses framing and loads subresources from itself only (ip-approvals-api §3.3).
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(process.env.NODE_ENV === "development") }];
  },
};

export default nextConfig;
