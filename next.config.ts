import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/orders": ["./src/assets/email-attachments/**/*.pdf"],
  },
};

export default nextConfig;
