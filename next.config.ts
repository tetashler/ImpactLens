import type { NextConfig } from 'next';
const config: NextConfig = { reactStrictMode: true, poweredByHeader: false, turbopack: { root: process.cwd() },
  // Accepted local histories, fictional private profiles and task evidence are runtime state.
  // Official Census/transport/geography snapshots remain traced runtime assets.
  outputFileTracingExcludes: { '/*': ['./data/derived/agents/**/*', './data/synthetic/**/*', './tmp/**/*'] },
  // These public source paths are computed by the loader and need explicit tracing under Webpack.
  outputFileTracingIncludes: { '/*': ['./data/employment/**/original.csv', './data/employment/**/source-metadata.json'] },
};
export default config;
