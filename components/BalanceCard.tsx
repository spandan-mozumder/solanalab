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
    <div className="p-4">
      <Card className="bg-secondary text-center">
        <CardHeader className="">
          <CardTitle className="">Wallet Balance</CardTitle>
          <CardDescription className="">Current SOL balance on devnet</CardDescription>
        </CardHeader>
        <CardContent className="">
          <div className="text-3xl font-bold">
            {balance !== null ? `${balance.toFixed(6)} SOL` : "Not connected"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
var stdin_default = BalanceCard;
export {
  stdin_default as default
};
