"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { FC, useCallback, useMemo, useState } from "react";
import type React from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2 } from "lucide-react";

interface NFTAttribute {
  trait_type: string;
  value: string;
}

export const CreateNFT: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<NFTAttribute[]>([
    { trait_type: "", value: "" },
  ]);
  const [externalUrl, setExternalUrl] = useState("");
  const [royaltyPercentage, setRoyaltyPercentage] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [nftMintAddress, setNftMintAddress] = useState("");

  const serviceWalletStr = process.env.NEXT_PUBLIC_SERVICE_WALLET || "";
  const serviceFeeSol = Number(process.env.NEXT_PUBLIC_SERVICE_FEE_SOL || 0);
  const serviceWallet = useMemo(() => {
    try {
      return serviceWalletStr ? new PublicKey(serviceWalletStr) : null;
    } catch {
      return null;
    }
  }, [serviceWalletStr]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image file must be less than 10MB");
        return;
      }
      setImageFile(file);
    }
  };

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { trait_type: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateAttribute = (index: number, field: keyof NFTAttribute, value: string) => {
    setAttributes((prev) => {
      const next = [...prev];
      next[index][field] = value;
      return next;
    });
  };

  const getClusterParam = () => {
    const ep = connection.rpcEndpoint.toLowerCase();
    if (ep.includes("devnet")) return "devnet";
    if (ep.includes("testnet")) return "testnet";
    return "mainnet";
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/pinata/upload-image", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Failed to upload image to IPFS");
    const data = await res.json();
    const hash = data.IpfsHash || data.ipfsHash || data.Hash;
    if (!hash) throw new Error("Missing IPFS hash for image");
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  };

  const uploadMetadata = async (metadata: Record<string, unknown>): Promise<string> => {
    const res = await fetch("/api/pinata/upload-metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    });
    if (!res.ok) throw new Error("Failed to upload metadata to IPFS");
    const data = await res.json();
    const hash = data.IpfsHash || data.ipfsHash || data.Hash;
    if (!hash) throw new Error("Missing IPFS hash for metadata");
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  };

  const createNFT = useCallback(async () => {
    if (!publicKey) {
      toast.error("Wallet not connected!");
      return;
    }
    if (!imageFile || !nftName.trim()) {
      toast.error("Please provide an image and NFT name.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Uploading image to IPFS...");

    try {
      const imageUri = await uploadImage(imageFile);

      const validAttributes = attributes.filter((a) => a.trait_type.trim() && a.value.trim());
      const metadataJson = {
        name: nftName,
        description: nftDescription || undefined,
        image: imageUri,
        external_url: externalUrl || undefined,
        attributes: validAttributes.length ? validAttributes : undefined,
        properties: {
          files: [
            {
              uri: imageUri,
              type: imageFile.type || "image/png",
            },
          ],
          category: "image",
          creators: [
            {
              address: publicKey.toString(),
              share: 100,
            },
          ],
        },
        seller_fee_basis_points: Math.max(0, Math.min(1000, Math.round(royaltyPercentage * 100))),
      };

      toast.loading("Uploading metadata to IPFS...", { id: toastId });
      const metadataUri = await uploadMetadata(metadataJson);

      toast.loading("Creating NFT on Solana...", { id: toastId });

      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();

      const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, publicKey);

      const ix: any[] = [];
      if (serviceWallet && serviceFeeSol > 0) {
        ix.push(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: serviceWallet,
            lamports: Math.floor(serviceFeeSol * LAMPORTS_PER_SOL),
          }),
        );
      }

      const metadataPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        METADATA_PROGRAM_ID,
      )[0];

      ix.push(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(mintKeypair.publicKey, 0, publicKey, publicKey),
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPda,
            mint: mintKeypair.publicKey,
            mintAuthority: publicKey,
            payer: publicKey,
            updateAuthority: publicKey,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: nftName,
                symbol: "NFT",
                uri: metadataUri,
                creators: [
                  {
                    address: publicKey,
                    verified: true,
                    share: 100,
                  },
                ],
                sellerFeeBasisPoints: Math.max(
                  0,
                  Math.min(1000, Math.round(royaltyPercentage * 100)),
                ),
                collection: null,
                uses: null,
              },
              isMutable: true,
              collectionDetails: null,
            },
          },
        ),
        createAssociatedTokenAccountInstruction(publicKey, ata, publicKey, mintKeypair.publicKey),
        createMintToInstruction(mintKeypair.publicKey, ata, publicKey, 1),
      );

      const tx = new Transaction().add(...ix);
      const signature = await sendTransaction(tx, connection, { signers: [mintKeypair] });
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("lastTxSig", signature);
          window.dispatchEvent(new Event("last-tx-updated"));
        }
      } catch {}

      const cluster = getClusterParam();
      const url = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
      toast.success(
        (
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
            NFT created successfully! View on Explorer
          </a>
        ),
        { id: toastId, duration: 8000 },
      );

  setNftMintAddress(mintKeypair.publicKey.toString());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to create NFT: ${msg}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [
    publicKey,
    connection,
    sendTransaction,
    nftName,
    nftDescription,
    imageFile,
    attributes,
    externalUrl,
    royaltyPercentage,
    serviceWallet,
    serviceFeeSol,
  ]);

  return (
    <div className="p-4">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <ClipLoader color="white" size={50} />
        </div>
      )}

      {!nftMintAddress ? (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">Create NFT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceWallet && serviceFeeSol > 0 ? (
              <Alert
                variant="default"
                className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
              >
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Service Fee:</strong> {serviceFeeSol} SOL will be charged to cover
                  platform costs.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nftName" className="">NFT Name*</Label>
                <Input
                  id="nftName"
                  type="text"
                  placeholder="My Awesome NFT"
                  value={nftName}
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNftName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nftDescription" className="">Description</Label>
                <Textarea
                  id="nftDescription"
                  placeholder="Describe your NFT..."
                  value={nftDescription}
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNftDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageFile" className="">Image* (Max 10MB)</Label>
                <Input id="imageFile" type="file" accept="image/*" className="" onChange={handleImageChange} />
                {imageFile && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="max-w-xs rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="externalUrl" className="">External URL (Optional)</Label>
                <Input
                  id="externalUrl"
                  type="url"
                  placeholder="https://your-site.xyz/item/123"
                  value={externalUrl}
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="royaltyPercentage" className="">Royalty Percentage (0-10%)</Label>
                <Input
                  id="royaltyPercentage"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={royaltyPercentage}
                  className=""
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoyaltyPercentage(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label className="">Attributes (Optional)</Label>
                <div className="space-y-2">
                  {attributes.map((attr, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <Input
                        type="text"
                        placeholder="Trait type (e.g., Background)"
                        value={attr.trait_type}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAttribute(index, "trait_type", e.target.value)}
                        className="md:col-span-2"
                      />
                      <Input
                        type="text"
                        placeholder="Value (e.g., Blue)"
                        value={attr.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateAttribute(index, "value", e.target.value)}
                        className="md:col-span-2"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeAttribute(index)}
                        disabled={attributes.length === 1}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" onClick={addAttribute}>
                    <Plus className="h-4 w-4 mr-2" /> Add attribute
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button onClick={createNFT} disabled={!publicKey || isLoading || !nftName || !imageFile}>
              Create NFT
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">NFT Created</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Mint Address:</p>
            <p className="font-mono break-all text-sm">{nftMintAddress}</p>
            <a
              href={`https://explorer.solana.com/address/${nftMintAddress}?cluster=${getClusterParam()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              View Mint on Explorer
            </a>
          </CardContent>
          <CardFooter className="">
            <Button variant="outline" onClick={() => setNftMintAddress("")}>Create another</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default CreateNFT;