"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../wagmi";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
            chain={base}
            config={{ 
              appearance: { 
                mode: 'auto',
                theme: "default",
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
        </TooltipProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
