import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isProd = process.env.NODE_ENV === "production";

if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: "/storage/v1/object/**",
    });
  } catch {
    // Ignore invalid env at config time.
  }
}

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1",
    tsconfigPath: isProd ? "tsconfig.build.json" : "tsconfig.json",
  },
  images: {
    remotePatterns,
  },
};

export default nextConfig;
