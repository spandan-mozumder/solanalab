"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createUpdateMetadataAccountV2Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { FC, useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { ClipLoader } from "react-spinners";
import { PinataSDK } from "pinata-web3";
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
import { Plus, Trash2, Search } from "lucide-react";

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: NFTAttribute[];
  seller_fee_basis_points?: number;
}

export const EditNFT: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [nftMintAddress, setNftMintAddress] = useState("");
  const [currentMetadata, setCurrentMetadata] = useState<NFTMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<NFTAttribute[]>([
    { trait_type: "", value: "" },
  ]);
  const [externalUrl, setExternalUrl] = useState("");
  const [royaltyPercentage, setRoyaltyPercentage] = useState(0);
  const [keepCurrentImage, setKeepCurrentImage] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  const SERVICE_FEE_LAMPORTS = 0.2 * LAMPORTS_PER_SOL; 
  const serviceWallet = new PublicKey("11111111111111111111111111111112"); 

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
      setKeepCurrentImage(false);
    }
  };

  const loadNFTMetadata = useCallback(async () => {
    if (!nftMintAddress || !publicKey) {
      return;
    }

    setIsLoadingMetadata(true);
    const toastId = toast.loading("Loading NFT metadata...");

    try {
      const mintPublicKey = new PublicKey(nftMintAddress);
      
      
      const metadataAccount = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPublicKey.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];

      const accountInfo = await connection.getAccountInfo(metadataAccount);
      if (!accountInfo) {
        toast.error("NFT metadata not found", { id: toastId });
        return;
      }

      
      
      const metadataResponse = await fetch(`/api/nft-metadata/${nftMintAddress}`);
      if (!metadataResponse.ok) {
        throw new Error("Failed to fetch metadata");
      }

      const metadata: NFTMetadata = await metadataResponse.json();
      setCurrentMetadata(metadata);
      
      
      setNftName(metadata.name || "");
      setNftDescription(metadata.description || "");
      setExternalUrl(metadata.external_url || "");
      setRoyaltyPercentage((metadata.seller_fee_basis_points || 0) / 100);
      
      if (metadata.attributes && metadata.attributes.length > 0) {
        setAttributes(metadata.attributes);
      }

      toast.success("NFT metadata loaded!", { id: toastId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to load metadata: ${errorMessage}`, { id: toastId });
      setCurrentMetadata(null);
    } finally {
      setIsLoadingMetadata(false);
    }
  }, [nftMintAddress, publicKey, connection]);

  const addAttribute = () => {
    setAttributes([...attributes, { trait_type: "", value: "" }]);
  };

  const removeAttribute = (index: number) => {
    if (attributes.length === 1) return;
    const newAttributes = attributes.filter((_, i) => i !== index);
    setAttributes(newAttributes);
  };

  const updateAttribute = (
    index: number,
    field: keyof NFTAttribute,
    value: string
  ) => {
    const newAttributes = [...attributes];
    newAttributes[index][field] = value;
    setAttributes(newAttributes);
  };

  const updateNFTMetadata = useCallback(async () => {
    if (!publicKey || !nftMintAddress || !currentMetadata) {
      toast.error("Missing required data!");
      return;
    }

    if (!nftName) {
      toast.error("Please provide an NFT name.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Updating NFT metadata...");

    let imageUri = currentMetadata.image;

    try {
      
      if (imageFile && !keepCurrentImage) {
        
        const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
        if (!pinataJwt || pinataJwt === 'your_pinata_jwt_token_here') {
          toast.error(
            "Pinata IPFS is not configured. Please add NEXT_PUBLIC_PINATA_JWT to your .env.local file.",
            { id: toastId }
          );
          setIsLoading(false);
          return;
        }

        const pinata = new PinataSDK({
          pinataJwt: pinataJwt,
        });

        const imageUploadResponse = await pinata.upload.file(imageFile);
        imageUri = `https://
        
        toast.loading("New image uploaded, updating metadata...", { id: toastId });
      }

      
      const validAttributes = attributes.filter(
        (attr) => attr.trait_type.trim() && attr.value.trim()
      );

      
      const updatedMetadata = {
        name: nftName,
        description: nftDescription,
        image: imageUri,
        external_url: externalUrl || undefined,
        attributes: validAttributes.length > 0 ? validAttributes : undefined,
        properties: {
          files: [
            {
              uri: imageUri,
              type: imageFile?.type || "image/png",
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
        seller_fee_basis_points: royaltyPercentage * 100,
      };

      
      
      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      if (!pinataJwt || pinataJwt === 'your_pinata_jwt_token_here') {
        toast.error(
          "Pinata IPFS is not configured. Please add NEXT_PUBLIC_PINATA_JWT to your .env.local file.",
          { id: toastId }
        );
        setIsLoading(false);
        return;
      }

      const pinata = new PinataSDK({
        pinataJwt: pinataJwt,
      });

      const jsonBlob = new Blob([JSON.stringify(updatedMetadata)], {
        type: "application/json",
      });

      const jsonFile = new File([jsonBlob], "updated-metadata.json");
      const jsonUploadResponse = await pinata.upload.file(jsonFile);
      const metadataUri = `https://

      toast.loading("Updating NFT on blockchain...", { id: toastId });

      
      const mintPublicKey = new PublicKey(nftMintAddress);
      const metadataAccount = PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          METADATA_PROGRAM_ID.toBuffer(),
          mintPublicKey.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )[0];

      const tx = new Transaction().add(
        
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: serviceWallet,
          lamports: SERVICE_FEE_LAMPORTS,
        }),
        createUpdateMetadataAccountV2Instruction(
          {
            metadata: metadataAccount,
            updateAuthority: publicKey,
          },
          {
            updateMetadataAccountArgsV2: {
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
                sellerFeeBasisPoints: royaltyPercentage * 100,
                collection: null,
                uses: null,
              },
              updateAuthority: publicKey,
              primarySaleHappened: true,
              isMutable: true,
            },
          }
        )
      );

      const signature = await sendTransaction(tx, connection);

      const explorerUrl = `https://

      toast.success(
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          NFT updated successfully! View on Explorer
        </a>,
        { id: toastId, duration: 8000 }
      );

      setIsUpdated(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`NFT update failed: ${errorMessage}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [
    publicKey,
    connection,
    sendTransaction,
    nftMintAddress,
    currentMetadata,
    nftName,
    nftDescription,
    imageFile,
    attributes,
    externalUrl,
    royaltyPercentage,
    keepCurrentImage,
  ]);

  return (
    <div className="p-4">
      {(isLoading || isLoadingMetadata) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <ClipLoader color="white" size={50} />
        </div>
      )}

      <Card className="">
        <CardHeader className="">
          <CardTitle className="">Edit NFT Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant="default"
            className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
          >
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Service Fee:</strong> 0.2 SOL will be charged for editing
              this NFT to cover platform costs.
            </AlertDescription>
          </Alert>

          {/* NFT Mint Address Input */}
          <div className="space-y-2">
            <Label htmlFor="nftMintAddress" className="">
              NFT Mint Address*
            </Label>
            <div className="flex gap-2">
              <Input
                id="nftMintAddress"
                type="text"
                className=""
                placeholder="Enter NFT mint address"
                value={nftMintAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNftMintAddress(e.target.value)
                }
              />
              <Button
                onClick={loadNFTMetadata}
                disabled={!nftMintAddress || !publicKey || isLoadingMetadata}
                variant="outline"
                size="default"
              >
                <Search className="h-4 w-4 mr-1" />
                Load
              </Button>
            </div>
          </div>

          {currentMetadata && (
            <>
              {/* Current Image Preview */}
              <div className="space-y-2">
                <Label className="">Current Image</Label>
                <img
                  src={currentMetadata.image}
                  alt={currentMetadata.name}
                  className="max-w-xs rounded-lg border"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nftName" className="">
                    NFT Name*
                  </Label>
                  <Input
                    id="nftName"
                    type="text"
                    className=""
                    placeholder="My Awesome NFT"
                    value={nftName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNftName(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nftDescription" className="">
                    Description
                  </Label>
                  <Textarea
                    id="nftDescription"
                    className=""
                    placeholder="Describe your NFT..."
                    value={nftDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNftDescription(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageFile" className="">
                    New Image (Optional, Max 10MB)
                  </Label>
                  <Input
                    id="imageFile"
                    type="file"
                    className=""
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imageFile && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        New image: {imageFile.name} (
                        {(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="New preview"
                        className="max-w-xs rounded-lg border"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="externalUrl" className="">
                    External URL (Optional)
                  </Label>
                  <Input
                    id="externalUrl"
                    type="url"
                    className=""
                    placeholder="https://
                    value={externalUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExternalUrl(e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="royaltyPercentage" className="">
                    Royalty Percentage (0-10%)
                  </Label>
                  <Input
                    id="royaltyPercentage"
                    type="number"
                    className=""
                    min={0}
                    max={10}
                    step={0.1}
                    value={royaltyPercentage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRoyaltyPercentage(Number(e.target.value))
                    }
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Attributes</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addAttribute}
                      className=""
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Attribute
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {attributes.map((attribute, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-2 gap-2 items-end"
                      >
                        <div className="space-y-1">
                          <Label className="text-sm">Trait Type</Label>
                          <Input
                            type="text"
                            placeholder="e.g., Color"
                            className=""
                            value={attribute.trait_type}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateAttribute(index, "trait_type", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Value</Label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              placeholder="e.g., Blue"
                              className=""
                              value={attribute.value}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>
                              ) => updateAttribute(index, "value", e.target.value)}
                            />
                            {attributes.length > 1 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeAttribute(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="">
          {!currentMetadata ? (
            <Button
              onClick={loadNFTMetadata}
              disabled={!nftMintAddress || !publicKey || isLoadingMetadata}
              variant="default"
              size="default"
              className="w-full"
            >
              {isLoadingMetadata
                ? "Loading..."
                : !publicKey
                ? "Connect Wallet"
                : "Load NFT Metadata"}
            </Button>
          ) : (
            <Button
              onClick={updateNFTMetadata}
              disabled={!publicKey || isLoading || isUpdated}
              variant="default"
              size="default"
              className="w-full"
            >
              {isLoading
                ? "Updating..."
                : isUpdated
                ? "Updated Successfully!"
                : publicKey
                ? "Update NFT Metadata"
                : "Connect Wallet"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};