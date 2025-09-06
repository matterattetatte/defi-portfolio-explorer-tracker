"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MiniKitProvider
            apiKey={import.meta.env.VITE_ONCHAINKIT_API_KEY}
            chain={base}
            config={{
              appearance: {
                mode: "auto",
                theme: "mini-app-theme",
                name: import.meta.env.VITE_ONCHAINKIT_PROJECT_NAME,
                logo: import.meta.env.VITE_ICON_URL,
              },
              wallet: {
                display: 'modal',
                termsUrl: undefined,
                privacyUrl: undefined,
              }
            }}
          >
            <OnchainKitProvider
              apiKey={import.meta.env.VITE_ONCHAINKIT_API_KEY}
              chain={base}
              config={{ 
                appearance: { 
                  mode: 'auto',
                  theme: "mini-app-theme",
                },
                wallet: {
                  display: 'modal',
                  termsUrl: undefined,
                  privacyUrl: undefined,
                }
              }}
            >
              {props.children}
              <Toaster />
              <Sonner />
            </OnchainKitProvider>
          </MiniKitProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}