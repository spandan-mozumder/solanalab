"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const Airdrop = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }
    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
      toast.success("Airdrop successful");
    } catch (error) {
      toast.error("Airdrop failed");
      console.error("Airdrop failed", error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Airdrop SOL</CardTitle>
        <CardDescription>
          Airdrop 1 SOL to your devnet account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This will airdrop 1 SOL to your connected wallet on the devnet.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAirdrop} disabled={!publicKey} className="w-full cursor-pointer">
          Airdrop SOL
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Airdrop;