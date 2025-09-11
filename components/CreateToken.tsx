"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";
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

const CreateToken = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [tokenName, setTokenName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(9);
  const [amount, setAmount] = useState(1000);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const uploadToPinata = async (file: File, metadata: any) => {
    try {
      // Upload image first
      const imageFormData = new FormData();
      imageFormData.append("file", file);
      
      const imageResponse = await fetch("/api/pinata/upload-image", {
        method: "POST",
        body: imageFormData,
      });
      
      if (!imageResponse.ok) throw new Error("Image upload failed");
      const imageData = await imageResponse.json();
      
      // Upload metadata with image reference
      const metadataResponse = await fetch("/api/pinata/upload-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...metadata,
          image: `ipfs://${imageData.IpfsHash}`,
        }),
      });
      
      if (!metadataResponse.ok) throw new Error("Metadata upload failed");
      const metadataData = await metadataResponse.json();
      
      return `ipfs://${metadataData.IpfsHash}`;
    } catch (error) {
      console.error("Pinata upload failed:", error);
      return null;
    }
  };

  const handleCreateToken = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!tokenName || !symbol) {
      toast.error("Please enter token name and symbol");
      return;
    }

    setIsCreating(true);
    
    try {
      let metadataUri: string | null = null;
      
      // Upload to Pinata if image is provided
      if (imageFile) {
        toast("Uploading to IPFS...");
        const metadata = {
          name: tokenName,
          symbol,
          description,
          decimals,
        };
        
        metadataUri = await uploadToPinata(imageFile, metadata);
        if (!metadataUri) {
          toast.error("Failed to upload metadata to IPFS");
          return;
        }
      }

      const mint = Keypair.generate();

      // Create mint account and initialize mint
      await createMint(
        connection,
        publicKey as any,
        publicKey,
        publicKey,
        decimals,
        mint
      );

      // Create associated token account for the user and mint tokens to it
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        publicKey as any,
        mint.publicKey,
        publicKey
      );

      await mintTo(
        connection,
        publicKey as any,
        mint.publicKey,
        fromTokenAccount.address,
        publicKey,
        BigInt(amount) * BigInt(10 ** decimals)
      );

      toast.success(`Token created successfully! Mint: ${mint.publicKey.toBase58()}`);
      
      // Reset form
      setTokenName("");
      setSymbol("");
      setDescription("");
      setImageFile(null);
      setAmount(1000);
      setDecimals(9);
      
    } catch (error) {
      toast.error("Token creation failed");
      console.error("Token creation failed", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Token</CardTitle>
        <CardDescription>
          Create a new SPL token with metadata stored on IPFS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenName">Token Name</Label>
          <Input
            id="tokenName"
            placeholder="Enter token name"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol</Label>
          <Input
            id="symbol"
            placeholder="Enter token symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals</Label>
            <Input
              id="decimals"
              type="number"
              value={decimals}
              onChange={(e) => setDecimals(parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Initial Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="Enter token description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">Token Image</Label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleCreateToken} 
          disabled={!publicKey || isCreating} 
          className="w-full cursor-pointer"
        >
          {isCreating ? "Creating..." : "Create Token"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreateToken;
