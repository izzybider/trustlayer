import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Stray lockfiles above this directory make Next infer the wrong workspace
     root locally; pin it to the project. */
  outputFileTracingRoot: dirname,
};

export default nextConfig;
