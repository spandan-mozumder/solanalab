"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
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
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useState } from "react";
import { Input } from "./ui/input";

const MAX_AIRDROP_SOL = 2;

const Airdrop = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [mode, setMode] = useState("self");
  const [targetAddress, setTargetAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAirdrop = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    const solAmount = parseFloat(amount);
    if (isNaN(solAmount) || solAmount <= 0) {
      toast.error("Please enter a valid SOL amount");
      return;
    }

    if (solAmount > MAX_AIRDROP_SOL) {
      toast.error(
        `Airdrop amount exceeds the maximum limit of ${MAX_AIRDROP_SOL} SOL`,
      );
      return;
    }

    let recipient: PublicKey;
    try {
      recipient = mode === "self" ? publicKey : new PublicKey(targetAddress);
    } catch (error) {
      toast.error("Invalid recipient address");
      return;
    }

    setIsProcessing(true);
    try {
      const signature = await connection.requestAirdrop(
        recipient,
        solAmount * LAMPORTS_PER_SOL,
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });
      toast.success("Airdrop successful");
      setAmount("");
      setTargetAddress("");
    } catch (error: any) {
      console.error("Airdrop failed", error);
      if (error?.message?.includes("429")) {
        toast.error(
          "🚫 Devnet faucet limit reached or faucet is empty. Try again later or use https://faucet.solana.com",
        );
      } else {
        toast.error(`Airdrop failed: ${error?.message || error}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Airdrop SOL</CardTitle>
          <CardDescription className="">
            Airdrop SOL to your connected account or a different account
            (Specific to devnet only).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label className="">Choose Airdrop Target</Label>
            <Select value={mode} onValueChange={(v: string) => setMode(v)}>
              <SelectTrigger className="">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent className="">
                <SelectItem value="self" className="">
                  My Account
                </SelectItem>
                <SelectItem value="other" className="">
                  Other Account
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            {mode === "other" && (
              <>
                <Label className="">Recipient Address</Label>
                <Input
                  type="text"
                  className=""
                  placeholder="Enter Solana address"
                  value={targetAddress}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTargetAddress(e.target.value)
                  }
                />
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label className="">Amount (max {MAX_AIRDROP_SOL} SOL)</Label>
            <Input
              type="number"
              className=""
              step="0.1"
              min="0"
              max={MAX_AIRDROP_SOL}
              placeholder="Enter SOL amount"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmount(e.target.value)
              }
            />
          </div>
        </CardContent>
        <CardFooter className="">
          <Button
            onClick={handleAirdrop}
            disabled={
              !publicKey ||
              isProcessing ||
              (mode === "other" && !targetAddress) ||
              !amount
            }
            variant="default"
            size="default"
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Airdrop SOL"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
var stdin_default = Airdrop;
export { stdin_default as default };
