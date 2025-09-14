"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { FC, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const MintTokens: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [mintAddress, setMintAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState(9);
  const [isLoading, setIsLoading] = useState(false);

  const SERVICE_FEE_LAMPORTS = 0.2 * LAMPORTS_PER_SOL; 
  const serviceWallet = new PublicKey("11111111111111111111111111111112"); 

  const handleMintTokens = async () => {
    if (!publicKey) {
      toast.error("Wallet not connected!");
      return;
    }

    if (!mintAddress || !recipientAddress || !amount) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Minting tokens...");

    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const recipientPublicKey = new PublicKey(recipientAddress);

      
      const recipientTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        recipientPublicKey,
      );

      const transaction = new Transaction();

      
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: serviceWallet,
          lamports: SERVICE_FEE_LAMPORTS,
        }),
      );

      
      let createAccountInstruction = null;
      try {
        await getAccount(connection, recipientTokenAccount);
      } catch (error) {
        
        createAccountInstruction = createAssociatedTokenAccountInstruction(
          publicKey, 
          recipientTokenAccount,
          recipientPublicKey, 
          mintPublicKey,
        );
        transaction.add(createAccountInstruction);
      }

      
      const mintAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
      transaction.add(
        createMintToInstruction(
          mintPublicKey,
          recipientTokenAccount,
          publicKey, 
          mintAmount,
        ),
      );

      const signature = await sendTransaction(transaction, connection);

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      const explorerUrl = `https://

      toast.success(
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Tokens minted successfully! View on Explorer
        </a>,
        { id: toastId, duration: 8000 },
      );

      setMintAddress("");
      setRecipientAddress("");
      setAmount("");
      setDecimals(9);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Minting failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Mint Additional Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant="default"
            className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
          >
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Service Fee:</strong> 0.2 SOL will be charged for minting
              tokens to cover platform costs.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="mintAddress" className="">
              Token Mint Address*
            </Label>
            <Input
              id="mintAddress"
              type="text"
              className=""
              placeholder="Enter token mint address"
              value={mintAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMintAddress(e.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientAddress" className="">
              Recipient Address*
            </Label>
            <Input
              id="recipientAddress"
              type="text"
              className=""
              placeholder="Enter recipient's public key"
              value={recipientAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRecipientAddress(e.target.value)
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="">
                Amount*
              </Label>
              <Input
                id="amount"
                type="number"
                className=""
                placeholder="Enter amount to mint"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAmount(e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="decimals" className="">
                Token Decimals
              </Label>
              <Input
                id="decimals"
                type="number"
                className=""
                min={0}
                max={9}
                value={decimals}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDecimals(Number(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="">
          <Button
            onClick={handleMintTokens}
            disabled={!publicKey || isLoading}
            className="w-full"
          >
            {isLoading
              ? "Minting..."
              : publicKey
                ? "Mint Tokens"
                : "Connect Wallet"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
