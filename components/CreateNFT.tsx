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

  const SERVICE_FEE_LAMPORTS = 0.3 * LAMPORTS_PER_SOL; 
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
    }
  };

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

  const createNFT = useCallback(async () => {
    if (!publicKey) {
      toast.error("Wallet not connected!");
      return;
    }
    if (!imageFile || !nftName) {
      toast.error("Please provide an image and NFT name.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Uploading metadata to IPFS...");

    let metadataUri = "";
    try {
      
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
      const ipfsImageUri = `https://

      
      const validAttributes = attributes.filter(
        (attr) => attr.trait_type.trim() && attr.value.trim()
      );

      
      const nftMetadata = {
        name: nftName,
        description: nftDescription,
        image: ipfsImageUri,
        external_url: externalUrl || undefined,
        attributes: validAttributes.length > 0 ? validAttributes : undefined,
        properties: {
          files: [
            {
              uri: ipfsImageUri,
              type: imageFile.type,
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

      const jsonBlob = new Blob([JSON.stringify(nftMetadata)], {
        type: "application/json",
      });

      const jsonFile = new File([jsonBlob], "metadata.json");
      const jsonUploadResponse = await pinata.upload.file(jsonFile);
      metadataUri = `https://

      toast.success("Metadata uploaded!", { id: toastId });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Metadata upload failed: ${errorMessage}`, { id: toastId });
      setIsLoading(false);
      return;
    }

    try {
      toast.loading("Creating NFT on Solana...", { id: toastId });
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();

      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );

      const tx = new Transaction().add(
        
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: serviceWallet,
          lamports: SERVICE_FEE_LAMPORTS,
        }),
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          0, 
          publicKey,
          publicKey,
          TOKEN_PROGRAM_ID
        ),
        createCreateMetadataAccountV3Instruction(
          {
            metadata: PublicKey.findProgramAddressSync(
              [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mintKeypair.publicKey.toBuffer(),
              ],
              METADATA_PROGRAM_ID
            )[0],
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
                sellerFeeBasisPoints: royaltyPercentage * 100,
                collection: null,
                uses: null,
              },
              isMutable: true, 
              collectionDetails: null,
            },
          }
        ),
        createAssociatedTokenAccountInstruction(
          publicKey,
          associatedTokenAccount,
          publicKey,
          mintKeypair.publicKey
        ),
        createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAccount,
          publicKey,
          1 
        )
      );

      const signature = await sendTransaction(tx, connection, {
        signers: [mintKeypair],
      });

      const explorerUrl = `https://

      toast.success(
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          NFT created successfully! View on Explorer
        </a>,
        { id: toastId, duration: 8000 }
      );

      setNftMintAddress(mintKeypair.publicKey.toString());
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`NFT creation failed: ${errorMessage}`, { id: toastId });
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
            <Alert
              variant="default"
              className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
            >
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Service Fee:</strong> 0.3 SOL will be charged for
                creating this NFT to cover platform costs.
              </AlertDescription>
            </Alert>

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
                  Image* (Max 10MB)
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
                      {imageFile.name} (
                      {(imageFile.size / 1024 / 1024).toFixed(2)} MB)
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
          </CardContent>
          <CardFooter className="">
            <Button
              onClick={createNFT}
              disabled={!publicKey || isLoading}
              variant="default"
              size="default"
              className="w-full"
            >
              {isLoading
                ? "Creating..."
                : publicKey
                ? "Create NFT"
                : "Connect Wallet"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">NFT Created Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="">NFT Mint Address</Label>
              <div className="break-all font-mono text-sm p-2 bg-muted rounded">
                {nftMintAddress}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="">Explorer Link</Label>
              <a
                className="text-primary hover:underline text-sm"
                href={`https://
                target="_blank"
                rel="noreferrer"
              >
                View on Solana Explorer
              </a>
            </div>
          </CardContent>
          <CardFooter className="">
            <Button
              onClick={() => setNftMintAddress("")}
              variant="outline"
              size="default"
              className="w-full"
            >
              Create Another NFT
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};