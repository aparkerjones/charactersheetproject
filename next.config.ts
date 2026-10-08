import type { NextConfig } from "next";

const githubPagesBuild = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: !githubPagesBuild,
  partialPrefetching: !githubPagesBuild,
  ...(githubPagesBuild
    ? {
        output: "export" as const,
        basePath: "/charactersheetproject",
        trailingSlash: true,
      }
    : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
