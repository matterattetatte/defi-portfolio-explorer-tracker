import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(), // MetaMask and other injected wallets first
    coinbaseWallet({
      appName: 'SlideFi Mini App',
      preference: 'smartWalletOnly', // Focus on Smart Wallet to avoid auto-redirect
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
