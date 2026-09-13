import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output for Docker deployments (includes only necessary files)
  output: "standalone",

  // pdfkit and nodemailer read files from disk at runtime — exclude from bundling
  serverExternalPackages: ["pdfkit", "nodemailer"],

  // Ensure assets/fonts are included in the trace for PDF generation
  outputFileTracingIncludes: {
    "/*": ["assets/fonts/**/*"],
  },
};

export default nextConfig;
