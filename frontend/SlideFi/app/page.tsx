"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Home } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";
import { MetaMaskWallet } from "@/app/components/MetaMaskWallet";
import LPAnalytics from "@/components/LPAnalytics";
import LiquidityDistribution from "@/components/LiquidityDistribution";
import { useMockData } from "@/hooks/useMockData";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("defi");
  
  // DeFi Analytics state
  const { priceData, lpData } = useMockData();
  const [currentIndex, setCurrentIndex] = useState(priceData.length - 1);

  const addFrame = useAddFrame();
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  // DeFi Analytics handlers
  const handleZoomIn = () => {};
  const handleZoomOut = () => {};

  const saveFrameButton = useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div>
            <div className="flex items-center space-x-2">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
          <div>{saveFrameButton}</div>
        </header>

        <main className="flex-1">
          {activeTab === "defi" && (
            <div className="space-y-6">
              {/* DeFi Analytics Header */}
              <div className="text-center bg-slate-800 rounded-lg p-4">
                <img src="/slidefi-logo.png" alt="SlideFi Logo" className="mx-auto h-20 w-auto" />
                <p className="text-white text-sm">
                  Advanced liquidity pool analytics and historical insights
                </p>
              </div>

              {/* DeFi Analytics Content */}
              {priceData.length > 0 ? (
                <div className="space-y-4">
                  {/* Current Price Display */}
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-2xl font-bold text-primary">
                          ${priceData[currentIndex]?.price?.toFixed(4) || '14.50'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Base Network</p>
                        <p className="text-primary font-medium">Uniswap V3</p>
                      </div>
                    </div>
                  </div>

                  {/* Liquidity Distribution */}
                  <LiquidityDistribution
                    currentPrice={priceData[currentIndex]?.price || 14.50}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    currentDate={priceData[currentIndex]?.timestamp || ''}
                    currentApr={lpData[currentIndex]?.apr || 0}
                    currentIndex={currentIndex}
                    maxIndex={priceData.length - 1}
                    onIndexChange={setCurrentIndex}
                    timestamps={priceData.map(d => d.timestamp)}
                  />


                  {/* LP Analytics */}
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                      Liquidity Pool Metrics
                    </h2>
                    <LPAnalytics data={lpData[currentIndex] || lpData[lpData.length - 1]} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading analytics...</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "wallet" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--app-foreground)] mb-2">
                  Wallet Connection
                </h1>
                <p className="text-[var(--app-text-muted)]">
                  Connect your MetaMask or other supported wallets
                </p>
              </div>
              <MetaMaskWallet />
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("home")}
                  className="text-[var(--app-text-muted)]"
                >
                  ← Back to Home
                </Button>
              </div>
              </div>
          )}
        </main>

        <footer className="mt-2 pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--ock-text-foreground-muted)] text-xs"
            onClick={() => openUrl("https://base.org/builders/minikit")}
          >
            Built on Base with MiniKit
          </Button>
        </footer>
      </div>
    </div>
  );
}
