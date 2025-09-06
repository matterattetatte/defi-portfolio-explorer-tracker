"use client";

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Button } from './DemoComponents';

export function MetaMaskWallet() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const handleMetaMaskConnect = () => {
    connect({ connector: injected() });
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-1">
              MetaMask Connection
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-300">
              {isConnected 
                ? `✅ Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` 
                : '❌ Not Connected - Click to connect MetaMask'
              }
            </p>
          </div>
          <div>
            {!isConnected ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMetaMaskConnect}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Connect MetaMask
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => disconnect()}
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
          Universal Wallet Connection
        </h3>
        <div className="wallet-container">
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownLink
                icon="wallet"
                href="https://keys.coinbase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wallet
              </WalletDropdownLink>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </div>
        <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
          Supports MetaMask, Coinbase Wallet, and other injected wallets
        </p>
      </div>
    </div>
  );
}