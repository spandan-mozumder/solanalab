"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const BalanceCard = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!mounted) return;
        setBalance(lamports / LAMPORTS_PER_SOL);
      } catch (e) {
        console.error(e);
      }
    };

    fetchBalance();
    const id = setInterval(fetchBalance, 10000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [connection, publicKey]);

  return (
    <Card className="w-full bg-secondary text-center">
      <CardHeader>
        <CardTitle>Wallet Balance</CardTitle>
        <CardDescription>Current SOL balance on devnet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {balance !== null ? `${balance.toFixed(6)} SOL` : "Not connected"}
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
