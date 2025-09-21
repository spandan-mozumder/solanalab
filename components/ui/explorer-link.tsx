"use client";
import Link from "next/link";
import { useConnection } from "@solana/wallet-adapter-react";

function clusterFromEndpoint(endpoint: string) {
  const ep = endpoint.toLowerCase();
  if (ep.includes("devnet")) return "devnet";
  if (ep.includes("testnet")) return "testnet";
  return "mainnet";
}

export function ExplorerTxLink({ signature, children }: { signature: string; children?: React.ReactNode }) {
  const { connection } = useConnection();
  const cluster = clusterFromEndpoint(connection.rpcEndpoint);
  const href = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="underline text-primary">
      {children ?? "View on Explorer"}
    </Link>
  );
}

export function ExplorerAddressLink({ address, children }: { address: string; children?: React.ReactNode }) {
  const { connection } = useConnection();
  const cluster = clusterFromEndpoint(connection.rpcEndpoint);
  const href = `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" className="underline text-primary">
      {children ?? "View on Explorer"}
    </Link>
  );
}
