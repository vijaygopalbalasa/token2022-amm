/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    webpack: (config, { isServer }) => {
        // Polyfills for browser bundle
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }

        // Ignore optional pretty-print dependency pulled by pino via WalletConnect
        config.resolve.alias = {
            ...config.resolve.alias,
            'pino-pretty': false,
        };
        return config;
    },
    experimental: {
        esmExternals: 'loose'
    }
};

module.exports = nextConfig;