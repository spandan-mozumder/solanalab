"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
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

const Transfer = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const handleTransfer = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!recipient || !amount) {
      toast.error("Please enter a recipient and amount");
      return;
    }

    try {
      const recipientPublicKey = new PublicKey(recipient);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPublicKey,
          lamports: parseFloat(amount) * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
      toast.success("Transfer successful");
      setRecipient("");
      setAmount("");
    } catch (error) {
      toast.error("Transfer failed");
      console.error("Transfer failed", error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transfer SOL</CardTitle>
        <CardDescription>
          Transfer SOL to another account on the devnet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient">Recipient Address</Label>
          <Input
            id="recipient"
            placeholder="Enter recipient's public key"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="Enter amount in SOL"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleTransfer} disabled={!publicKey} className="w-full cursor-pointer">
          Transfer SOL
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Transfer;
