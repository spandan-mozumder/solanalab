"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  createSetAuthorityInstruction,
  AuthorityType,
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
import { Checkbox } from "@/components/ui/checkbox";

export const ChangeAuthority: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [mintAddress, setMintAddress] = useState("");
  const [newMintAuthority, setNewMintAuthority] = useState("");
  const [newFreezeAuthority, setNewFreezeAuthority] = useState("");
  const [changeMintAuthority, setChangeMintAuthority] = useState(false);
  const [changeFreezeAuthority, setChangeFreezeAuthority] = useState(false);
  const [revokeMintAuthority, setRevokeMintAuthority] = useState(false);
  const [revokeFreezeAuthority, setRevokeFreezeAuthority] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const SERVICE_FEE_PER_CHANGE = 0.1 * LAMPORTS_PER_SOL; 
  const serviceWallet = new PublicKey("11111111111111111111111111111112"); 

  const getNumberOfChanges = () => {
    let changes = 0;
    if (changeMintAuthority || revokeMintAuthority) changes++;
    if (changeFreezeAuthority || revokeFreezeAuthority) changes++;
    return changes;
  };

  const handleChangeAuthority = async () => {
    if (!publicKey) {
      toast.error("Wallet not connected!");
      return;
    }

    if (!mintAddress) {
      toast.error("Please enter a mint address.");
      return;
    }

    const numberOfChanges = getNumberOfChanges();
    if (numberOfChanges === 0) {
      toast.error("Please select at least one authority change.");
      return;
    }

    if (changeMintAuthority && !newMintAuthority) {
      toast.error("Please enter new mint authority address.");
      return;
    }

    if (changeFreezeAuthority && !newFreezeAuthority) {
      toast.error("Please enter new freeze authority address.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Changing authority...");

    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const transaction = new Transaction();

      
      const totalServiceFee = numberOfChanges * SERVICE_FEE_PER_CHANGE;
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: serviceWallet,
          lamports: totalServiceFee,
        }),
      );

      
      if (changeMintAuthority && newMintAuthority) {
        const newMintAuthorityKey = new PublicKey(newMintAuthority);
        transaction.add(
          createSetAuthorityInstruction(
            mintPublicKey,
            publicKey, 
            AuthorityType.MintTokens,
            newMintAuthorityKey,
          ),
        );
      }

      
      if (revokeMintAuthority) {
        transaction.add(
          createSetAuthorityInstruction(
            mintPublicKey,
            publicKey, 
            AuthorityType.MintTokens,
            null, 
          ),
        );
      }

      
      if (changeFreezeAuthority && newFreezeAuthority) {
        const newFreezeAuthorityKey = new PublicKey(newFreezeAuthority);
        transaction.add(
          createSetAuthorityInstruction(
            mintPublicKey,
            publicKey, 
            AuthorityType.FreezeAccount,
            newFreezeAuthorityKey,
          ),
        );
      }

      
      if (revokeFreezeAuthority) {
        transaction.add(
          createSetAuthorityInstruction(
            mintPublicKey,
            publicKey, 
            AuthorityType.FreezeAccount,
            null, 
          ),
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

      const explorerUrl = `https://

      toast.success(
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Authority changed successfully! View on Explorer
        </a>,
        { id: toastId, duration: 8000 },
      );

      
      setMintAddress("");
      setNewMintAuthority("");
      setNewFreezeAuthority("");
      setChangeMintAuthority(false);
      setChangeFreezeAuthority(false);
      setRevokeMintAuthority(false);
      setRevokeFreezeAuthority(false);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Authority change failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Change Token Authority</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant="default"
            className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
          >
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Service Fee:</strong> 0.1 SOL per authority change (Total:{" "}
              {getNumberOfChanges() * 0.1} SOL for {getNumberOfChanges()} change
              {getNumberOfChanges() > 1 ? "s" : ""}).
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

          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-semibold">Mint Authority</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="changeMintAuthority"
                  className=""
                  checked={changeMintAuthority}
                  onCheckedChange={(checked: boolean) => {
                    setChangeMintAuthority(checked);
                    if (checked) setRevokeMintAuthority(false);
                  }}
                />
                <Label
                  htmlFor="changeMintAuthority"
                  className="text-sm font-normal cursor-pointer"
                >
                  Change Mint Authority
                </Label>
              </div>

              {changeMintAuthority && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="newMintAuthority" className="">
                    New Mint Authority Address
                  </Label>
                  <Input
                    id="newMintAuthority"
                    type="text"
                    className=""
                    placeholder="Enter new mint authority address"
                    value={newMintAuthority}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewMintAuthority(e.target.value)
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="revokeMintAuthority"
                  className=""
                  checked={revokeMintAuthority}
                  onCheckedChange={(checked: boolean) => {
                    setRevokeMintAuthority(checked);
                    if (checked) setChangeMintAuthority(false);
                  }}
                />
                <Label
                  htmlFor="revokeMintAuthority"
                  className="text-sm font-normal cursor-pointer"
                >
                  Revoke Mint Authority (Cannot mint more tokens)
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-semibold">Freeze Authority</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="changeFreezeAuthority"
                  className=""
                  checked={changeFreezeAuthority}
                  onCheckedChange={(checked: boolean) => {
                    setChangeFreezeAuthority(checked);
                    if (checked) setRevokeFreezeAuthority(false);
                  }}
                />
                <Label
                  htmlFor="changeFreezeAuthority"
                  className="text-sm font-normal cursor-pointer"
                >
                  Change Freeze Authority
                </Label>
              </div>

              {changeFreezeAuthority && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="newFreezeAuthority" className="">
                    New Freeze Authority Address
                  </Label>
                  <Input
                    id="newFreezeAuthority"
                    type="text"
                    className=""
                    placeholder="Enter new freeze authority address"
                    value={newFreezeAuthority}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewFreezeAuthority(e.target.value)
                    }
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="revokeFreezeAuthority"
                  className=""
                  checked={revokeFreezeAuthority}
                  onCheckedChange={(checked: boolean) => {
                    setRevokeFreezeAuthority(checked);
                    if (checked) setChangeFreezeAuthority(false);
                  }}
                />
                <Label
                  htmlFor="revokeFreezeAuthority"
                  className="text-sm font-normal cursor-pointer"
                >
                  Revoke Freeze Authority (Cannot freeze token accounts)
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="">
          <Button
            onClick={handleChangeAuthority}
            disabled={!publicKey || isLoading || getNumberOfChanges() === 0}
            className="w-full"
          >
            {isLoading
              ? "Processing..."
              : publicKey
                ? `Change Authority (${getNumberOfChanges() * 0.1} SOL)`
                : "Connect Wallet"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
