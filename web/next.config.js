/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@google-cloud/bigquery'],
  },
}

module.exports = nextConfig
