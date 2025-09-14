import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config: any, { isServer }: { isServer: boolean }) => {
    // Exclude heavy dependencies completely
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'viem': 'commonjs2 viem',
        '@walletconnect/modal': 'commonjs2 @walletconnect/modal',
        '@walletconnect/universal-provider': 'commonjs2 @walletconnect/universal-provider',
        '@reown/appkit': 'commonjs2 @reown/appkit',
      });
    }

    // Ignore specific packages
    config.resolve.alias = {
      ...config.resolve.alias,
      'viem': false,
      '@walletconnect/modal': false,
      '@walletconnect/universal-provider': false,
      '@reown/appkit': false,
    };

    return config;
  },
  serverExternalPackages: [
    'viem', 
    '@walletconnect/modal',
    '@walletconnect/universal-provider',
    '@reown/appkit',
    '@reown/appkit-common',
    '@reown/appkit-controllers',
    '@reown/appkit-scaffold-ui',
    '@reown/appkit-ui',
    '@reown/appkit-utils',
    '@reown/appkit-wallet',
  ],
};

const nextConfig_default = nextConfig;
export { nextConfig_default as default };
