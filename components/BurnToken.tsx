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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { 
  handleError, 
  validateWalletConnection, 
  validateRequiredFields,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
} from "@/lib/error-handler";

interface TokenInfo {
  balance: number;
  decimals: number;
  mintAuthority: string | null;
  supply: string;
}

const BurnToken = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [mintAddress, setMintAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isBurning, setIsBurning] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [validationError, setValidationError] = useState("");

  const validateAndFetchTokenInfo = async (
    mintAddr: string,
  ): Promise<boolean> => {
    try {
      validateWalletConnection(publicKey);

      const mint = new PublicKey(mintAddr);
      const mintInfo = await getMint(connection, mint);
      const userTokenAddress = await getAssociatedTokenAddress(mint, publicKey!);

      let userBalance = 0;
      let accountExists = false;

      try {
        const userTokenAccount = await getAccount(connection, userTokenAddress);
        userBalance = Number(userTokenAccount.amount);
        accountExists = true;
      } catch {
        console.log("Token account doesn't exist for this user");
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

      if (!accountExists) {
        throw new Error("You don't have a token account for this mint address");
      }

      if (userBalance === 0) {
        throw new Error("You don't have any tokens to burn");
      }

      return true;
    } catch (error) {
      handleError(error, { context: "Failed to fetch token info" });
      setTokenInfo(null);
      return false;
    }
  };

  const handleBurnToken = async () => {
    try {
      // Clear previous validation errors
      setValidationError("");
      
      // Validation
      validateWalletConnection(publicKey);
      
      const requiredFields = {
        'Mint address': mintAddress,
        'Amount': amount
      };
      validateRequiredFields(requiredFields);

      const burnAmount = parseFloat(amount);
      if (burnAmount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      const isValid = await validateAndFetchTokenInfo(mintAddress);
      if (!isValid || !tokenInfo) {
        return;
      }

      if (burnAmount > tokenInfo.balance) {
        throw new Error(
          `Insufficient balance. You have ${tokenInfo.balance} tokens, trying to burn ${burnAmount}`
        );
      }

      const totalSupply = parseFloat(tokenInfo.supply);
      if (burnAmount > totalSupply) {
        throw new Error(
          `Cannot burn more than total supply. Total supply: ${totalSupply} tokens`
        );
      }

      setIsBurning(true);
      const toastId = toast.loading("Burning tokens...");

      const mint = new PublicKey(mintAddress);
      const userTokenAddress = await getAssociatedTokenAddress(mint, publicKey!);
      const burnAmountWithDecimals = BigInt(
        burnAmount * Math.pow(10, tokenInfo.decimals),
      );

      const transaction = new Transaction();
      const { createBurnInstruction } = await import("@solana/spl-token");

      transaction.add(
        createBurnInstruction(
          userTokenAddress,
          mint,
          publicKey!,
          burnAmountWithDecimals,
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

      toast.success(SUCCESS_MESSAGES.TOKEN_BURNED, { id: toastId });
      await validateAndFetchTokenInfo(mintAddress);
      setAmount("");
      
    } catch (error) {
      handleError(error, { context: "Token burn failed" });
      if (error instanceof Error) {
        setValidationError(error.message);
      }
    } finally {
      setIsBurning(false);
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
          <CardTitle className="">Burn Token</CardTitle>
          <CardDescription className="">
            Burn specific amounts of SPL tokens you own. Use Close Token Account
            component to burn all tokens and close the account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {validationError && (
            <Alert variant="destructive" className="">
              <AlertDescription className="">{validationError}</AlertDescription>
            </Alert>
          )}
          
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="burnAmount" className="">
              Amount to Burn
            </Label>
            <Input
              id="burnAmount"
              type="number"
              className=""
              step="0.000000001"
              placeholder="Enter amount to burn"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmount(e.target.value)
              }
              max={tokenInfo?.balance || undefined}
            />

            {tokenInfo && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: {tokenInfo.balance} tokens</span>
                <button
                  type="button"
                  onClick={() => setAmount(tokenInfo.balance.toString())}
                  className="text-primary hover:text-primary/80 underline"
                >
                  Use Max
                </button>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={handleBurnToken}
            disabled={
              !publicKey ||
              isBurning ||
              !tokenInfo ||
              !amount ||
              parseFloat(amount) <= 0
            }
            variant="destructive"
            size="default"
            className="w-full"
          >
            {isBurning ? "Burning..." : "Burn Tokens"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const BurnToken_default = BurnToken;
export { BurnToken_default as default };
