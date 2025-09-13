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
import { Trash } from "lucide-react";

interface Recipient {
  address: string;
  amount: string;
}

const Transfer = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: "", amount: "" },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecipientChange = (
    index: number,
    field: keyof Recipient,
    value: string,
  ) => {
    const newRecipients = [...recipients];
    newRecipients[index][field] = value;
    setRecipients(newRecipients);
  };

  const addRecipient = () => {
    setRecipients([...recipients, { address: "", amount: "" }]);
  };

  const removeRecipient = (index: number) => {
    if (recipients.length === 1) return;
    const newRecipients = recipients.filter((_, i) => i !== index);
    setRecipients(newRecipients);
  };

  const handleTransfer = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsProcessing(true);
    try {
      const transaction = new Transaction();
      for (const { address, amount } of recipients) {
        if (!address || !amount) {
          toast.error("Please enter a recipient and amount fields");
          return;
        }
        const recipientPublicKey = new PublicKey(address);
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        if (isNaN(lamports) || lamports <= 0) {
          toast.error("Please enter a valid amount");
          return;
        }
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: recipientPublicKey,
            lamports,
          }),
        );
      }
      const signature = await sendTransaction(transaction, connection);
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
      toast.success("Transfer successful");
      setRecipients([{ address: "", amount: "" }]);
    } catch (error: unknown) {
      toast.error("Transfer failed");
      console.error("Transfer failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Batch Transfer SOL</CardTitle>
          <CardDescription className="">
            Send SOL to multiple accounts in one transaction (devnet only).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {recipients.map((recipient, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg relative border p-4"
            >
              <div className="space-y-2">
                <Label htmlFor={`recipient-${index}`} className="">
                  Recipient Address
                </Label>
                <Input
                  id={`recipient-${index}`}
                  type="text"
                  className=""
                  placeholder="Enter recipient's public key"
                  value={recipient.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleRecipientChange(index, "address", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`amount-${index}`} className="">
                  Amount (SOL)
                </Label>
                <Input
                  id={`amount-${index}`}
                  type="number"
                  className=""
                  step="0.01"
                  placeholder="Enter amount in SOL"
                  value={recipient.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleRecipientChange(index, "amount", e.target.value)
                  }
                />
              </div>
              {recipients.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => removeRecipient(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="secondary"
            size="default"
            onClick={addRecipient}
            className="w-full"
          >
            ➕ Add Recipient
          </Button>
        </CardContent>
        <CardFooter className="">
          <Button
            onClick={handleTransfer}
            disabled={!publicKey || isProcessing}
            variant="default"
            size="default"
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Send Transaction"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Transfer_default = Transfer;
export { Transfer_default as default };
