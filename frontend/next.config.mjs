/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix workspace root warning
  outputFileTracingRoot: "/Users/jscott/Documents/Coding Projects/ethwarsaw/defi-portfolio-explorer-tracker/frontend",
  
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  redirects: async () => {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/01992017-d2ee-c972-b994-cd1567a516f9',
        permanent: false, // false = 307
      },
    ];
  },
async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;" // Allows embedding from any domain
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',  // Try to disable frame blocking
          },
        ],
      },
    ];
  },
};

export default nextConfig;
