"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  burn,
  closeAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

const BurnToken = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [mintAddress, setMintAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isBurning, setIsBurning] = useState(false);

  const handleBurnToken = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!mintAddress || !amount) {
      toast.error("Please enter mint address and amount");
      return;
    }

    setIsBurning(true);

    try {
      const mint = new PublicKey(mintAddress);
      const burnAmount = parseFloat(amount);

      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        publicKey as any,
        mint,
        publicKey
      );

      await burn(
        connection,
        publicKey as any,
        fromTokenAccount.address,
        mint,
        publicKey,
        burnAmount * 10 ** 9 // assuming 9 decimals
      );

      toast.success("Tokens burned successfully");
      setMintAddress("");
      setAmount("");
    } catch (error) {
      toast.error("Token burn failed");
      console.error("Token burn failed", error);
    } finally {
      setIsBurning(false);
    }
  };

  const handleCloseAccount = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!mintAddress) {
      toast.error("Please enter mint address");
      return;
    }

    try {
      const mint = new PublicKey(mintAddress);

      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        publicKey as any,
        mint,
        publicKey
      );

      await closeAccount(
        connection,
        publicKey as any,
        fromTokenAccount.address,
        publicKey,
        publicKey
      );

      toast.success("Token account closed successfully");
    } catch (error) {
      toast.error("Failed to close token account");
      console.error("Close account failed", error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Burn Token</CardTitle>
        <CardDescription>
          Burn SPL tokens and close token accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mintAddress">Token Mint Address</Label>
          <Input
            id="mintAddress"
            placeholder="Enter token mint address"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="burnAmount">Amount to Burn</Label>
          <Input
            id="burnAmount"
            type="number"
            step="0.01"
            placeholder="Enter amount to burn"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button 
          onClick={handleBurnToken} 
          disabled={!publicKey || isBurning} 
          variant="destructive"
          className="w-full cursor-pointer"
        >
          {isBurning ? "Burning..." : "Burn Tokens"}
        </Button>
        <Button 
          onClick={handleCloseAccount} 
          disabled={!publicKey} 
          variant="outline"
          className="w-full cursor-pointer"
        >
          Close Token Account
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BurnToken;
