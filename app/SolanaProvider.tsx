"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

type NetworkKey = "devnet" | "testnet" | "mainnet";

interface NetworkContextValue {
  network: NetworkKey;
  setNetwork: (n: NetworkKey) => void;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}

function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<NetworkKey>(() => {
    if (typeof window === "undefined") return "devnet";
    const saved = window.localStorage.getItem("solana-network");
    return (saved as NetworkKey) || "devnet";
  });

  const setNetwork = useCallback((n: NetworkKey) => {
    setNetworkState(n);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("solana-network", n);
    }
  }, []);

  const value = useMemo(() => ({ network, setNetwork }), [network, setNetwork]);
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

interface SolanaProviderProps { children: React.ReactNode }

function SolanaProvider({ children }: SolanaProviderProps) {
  const { network } = useNetwork();
  const adapterNetwork = useMemo(() => {
    switch (network) {
      case "testnet":
        return WalletAdapterNetwork.Testnet;
      case "mainnet":
        return WalletAdapterNetwork.Mainnet;
      default:
        return WalletAdapterNetwork.Devnet;
    }
  }, [network]);

  const endpoint = useMemo(() => clusterApiUrl(adapterNetwork), [adapterNetwork]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
function RootSolanaProvider({ children }: { children: React.ReactNode }) {
  return (
    <NetworkProvider>
      <SolanaProvider>{children}</SolanaProvider>
    </NetworkProvider>
  );
}
export { RootSolanaProvider as default, useNetwork };
