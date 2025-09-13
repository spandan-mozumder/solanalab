"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  getAssociatedTokenAddress,
  getMint,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
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

interface TokenInfo {
  balance: number;
  decimals: number;
  mintAuthority: string | null;
  supply: string;
}

const CloseTokenAccount = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [mintAddress, setMintAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const validateAndFetchTokenInfo = async (
    mintAddr: string,
  ): Promise<boolean> => {
    if (!publicKey) return false;

    try {
      const mint = new PublicKey(mintAddr);
      const mintInfo = await getMint(connection, mint);
      const userTokenAddress = await getAssociatedTokenAddress(mint, publicKey);

      let userBalance = 0;

      try {
        const userTokenAccount = await getAccount(connection, userTokenAddress);
        userBalance = Number(userTokenAccount.amount);
      } catch {
        console.log("Token account doesn't exist for this user");
        toast.error("You don't have a token account for this mint address");
        return false;
      }

      const tokenInfoData = {
        balance: userBalance / Math.pow(10, mintInfo.decimals),
        decimals: mintInfo.decimals,
        mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
        supply: (
          Number(mintInfo.supply) / Math.pow(10, mintInfo.decimals)
        ).toString(),
      };

      setTokenInfo(tokenInfoData);
      return true;
    } catch (error) {
      console.error("Error fetching token info:", error);
      toast.error("Invalid mint address or failed to fetch token info");
      setTokenInfo(null);
      return false;
    }
  };

  const handleBurnAllAndClose = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!mintAddress) {
      toast.error("Please enter mint address");
      return;
    }

    const isValid = await validateAndFetchTokenInfo(mintAddress);
    if (!isValid || !tokenInfo) {
      return;
    }

    setIsProcessing(true);

    try {
      const mint = new PublicKey(mintAddress);
      const userTokenAddress = await getAssociatedTokenAddress(mint, publicKey);
      const transaction = new Transaction();

      if (tokenInfo.balance > 0) {
        const burnAmountWithDecimals = BigInt(
          tokenInfo.balance * Math.pow(10, tokenInfo.decimals),
        );
        const { createBurnInstruction } = await import("@solana/spl-token");

        transaction.add(
          createBurnInstruction(
            userTokenAddress,
            mint,
            publicKey,
            burnAmountWithDecimals,
            [],
            TOKEN_PROGRAM_ID,
          ),
        );
      }

      const { createCloseAccountInstruction } = await import(
        "@solana/spl-token"
      );

      transaction.add(
        createCloseAccountInstruction(
          userTokenAddress,
          publicKey,
          publicKey,
          [],
          TOKEN_PROGRAM_ID,
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

      if (tokenInfo.balance > 0) {
        toast.success(
          `Successfully burned ${tokenInfo.balance} tokens and closed account!`,
        );
      } else {
        toast.success("Token account closed successfully!");
      }

      setTokenInfo(null);
      setMintAddress("");
    } catch (error: unknown) {
      console.error("Burn and close failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes("insufficient funds")) {
        toast.error("Insufficient SOL for transaction fees");
      } else if (errorMessage.includes("Account not found")) {
        toast.error("Token account not found or already closed");
      } else if (errorMessage.includes("insufficient account balance")) {
        toast.error("Insufficient token balance");
      } else {
        toast.error("Operation failed. Check console for details.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMintAddressChange = (value: string) => {
    setMintAddress(value);
    setTokenInfo(null);
    if (value && value.length >= 32) {
      setTimeout(() => {
        validateAndFetchTokenInfo(value);
      }, 500);
    }
  };

  return (
    <div className="p-4">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Close Token Account</CardTitle>
          <CardDescription className="">
            Burn all remaining tokens and close the token account. This will
            return the rent-exempt SOL to your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mintAddress" className="">
              Token Mint Address
            </Label>
            <Input
              id="mintAddress"
              type="text"
              className=""
              placeholder="Enter token mint address"
              value={mintAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleMintAddressChange(e.target.value)
              }
            />
          </div>

          {tokenInfo && (
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <h4 className="font-semibold">Token Information</h4>
              <div className="grid grid-cols-2 gap-2">
                <span>Your Balance:</span>
                <span className="font-mono">{tokenInfo.balance} tokens</span>

                <span>Total Supply:</span>
                <span className="font-mono">{tokenInfo.supply} tokens</span>

                <span>Decimals:</span>
                <span className="font-mono">{tokenInfo.decimals}</span>

                <span>Mint Authority:</span>
                <span className="font-mono text-xs">
                  {tokenInfo.mintAuthority
                    ? `${tokenInfo.mintAuthority.slice(0, 8)}...${tokenInfo.mintAuthority.slice(-8)}`
                    : "None"}
                </span>
              </div>

              {tokenInfo.balance > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded dark:bg-yellow-900/20 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    ⚠️ This will burn{" "}
                    <strong>{tokenInfo.balance} tokens</strong> and close the
                    account. This action cannot be undone.
                  </p>
                </div>
              )}

              {tokenInfo.balance === 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded dark:bg-green-900/20 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    ✅ Account has no tokens. Ready to close and reclaim rent
                    SOL.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="">
          <Button
            onClick={handleBurnAllAndClose}
            disabled={!publicKey || isProcessing || !tokenInfo}
            variant="destructive"
            size="default"
            className="w-full"
          >
            {isProcessing
              ? "Processing..."
              : tokenInfo && tokenInfo.balance > 0
                ? `Burn ${tokenInfo.balance} Tokens & Close Account`
                : "Close Token Account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const CloseTokenAccount_default = CloseTokenAccount;
export { CloseTokenAccount_default as default };
