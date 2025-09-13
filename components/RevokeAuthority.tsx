"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  createSetAuthorityInstruction,
  AuthorityType,
  getMint,
  Mint,
} from "@solana/spl-token";
import { FC, useCallback, useState } from "react";
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

export const RevokeAuthority: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [mintAddress, setMintAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mintInfo, setMintInfo] = useState<Mint | null>(null);

  const validateMintAddress = useCallback(async () => {
    if (!mintAddress || !publicKey) {
      return;
    }

    try {
      const mintPubkey = new PublicKey(mintAddress);
      const mint = await getMint(connection, mintPubkey);
      setMintInfo(mint);
      toast.success("Valid mint address found!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Invalid mint address: ${errorMessage}`);
      setMintInfo(null);
    }
  }, [mintAddress, publicKey, connection]);

  const revokeMintAuthority = useCallback(async () => {
    if (!publicKey || !mintAddress) {
      toast.error("Wallet not connected or mint address not provided!");
      return;
    }

    if (!mintInfo) {
      toast.error("Please validate the mint address first!");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Revoking mint authority...");

    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          mintPubkey,
          publicKey,
          AuthorityType.MintTokens,
          null,
        ),
      );

      const signature = await sendTransaction(tx, connection);

      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

      toast.success(
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Mint authority revoked! View on Explorer
        </a>,
        { id: toastId, duration: 8000 },
      );

      // Refresh mint info
      await validateMintAddress();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to revoke mint authority: ${errorMessage}`, {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, mintAddress, mintInfo, connection, sendTransaction, validateMintAddress]);

  const revokeFreezeAuthority = useCallback(async () => {
    if (!publicKey || !mintAddress) {
      toast.error("Wallet not connected or mint address not provided!");
      return;
    }

    if (!mintInfo) {
      toast.error("Please validate the mint address first!");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Revoking freeze authority...");

    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      const tx = new Transaction().add(
        createSetAuthorityInstruction(
          mintPubkey,
          publicKey,
          AuthorityType.FreezeAccount,
          null,
        ),
      );

      const signature = await sendTransaction(tx, connection);

      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

      toast.success(
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Freeze authority revoked! View on Explorer
        </a>,
        { id: toastId, duration: 8000 },
      );

      // Refresh mint info
      await validateMintAddress();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to revoke freeze authority: ${errorMessage}`, {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, mintAddress, mintInfo, connection, sendTransaction, validateMintAddress]);

  return (
    <div className="p-4">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Revoke Token Authority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mintAddress" className="">Token Mint Address*</Label>
            <div className="flex gap-2">
              <Input
                id="mintAddress"
                type="text"
                placeholder="Enter token mint address..."
                value={mintAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMintAddress(e.target.value)
                }
                className="flex-1"
              />
              <Button
                onClick={validateMintAddress}
                disabled={!mintAddress || !publicKey}
                variant="outline"
              >
                Validate
              </Button>
            </div>
          </div>

          {mintInfo && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Token Information</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Decimals:</Label>
                    <p className="font-mono">{mintInfo.decimals}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supply:</Label>
                    <p className="font-mono">
                      {(Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Mint Authority:</Label>
                    <p className="font-mono text-xs break-all">
                      {mintInfo.mintAuthority?.toString() || "None (Revoked)"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Freeze Authority:</Label>
                    <p className="font-mono text-xs break-all">
                      {mintInfo.freezeAuthority?.toString() || "None (Revoked)"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="space-x-2">
          <Button
            onClick={revokeMintAuthority}
            disabled={
              !publicKey ||
              !mintInfo ||
              isLoading ||
              !mintInfo.mintAuthority ||
              mintInfo.mintAuthority.toString() !== publicKey.toString()
            }
            variant="destructive"
            className="flex-1"
          >
            {isLoading ? "Processing..." : "Revoke Mint Authority"}
          </Button>
          <Button
            onClick={revokeFreezeAuthority}
            disabled={
              !publicKey ||
              !mintInfo ||
              isLoading ||
              !mintInfo.freezeAuthority ||
              mintInfo.freezeAuthority.toString() !== publicKey.toString()
            }
            variant="destructive"
            className="flex-1"
          >
            {isLoading ? "Processing..." : "Revoke Freeze Authority"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};