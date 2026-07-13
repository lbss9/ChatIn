import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'ChatIn';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: isGithubActions ? `/${repository}` : '',
  assetPrefix: isGithubActions ? `/${repository}/` : undefined,
};

export default nextConfig;
