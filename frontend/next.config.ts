import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    RAILS_API_BASE: process.env.RAILS_API_BASE || 'http://localhost:3001',
  },
};

export default nextConfig;
