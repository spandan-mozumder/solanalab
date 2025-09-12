"use client"

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// This component is now self-contained and does not rely on any custom contexts
export const CreateToken: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  // Form state
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDescription, setTokenDescription] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState(9);
  const [tokenAmount, setTokenAmount] = useState(1000000);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [tokenMintAddress, setTokenMintAddress] = useState("");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const createToken = useCallback(async () => {
    if (!publicKey) {
      toast.error("Wallet not connected!");
      return;
    }
    if (!imageFile || !tokenName || !tokenSymbol) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading("Uploading metadata to IPFS...");
    
    let metadataUri = "";
    try {
      const pinata = new PinataSDK({
        pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
      });

      const imageUploadResponse = await pinata.upload.file(imageFile);
      const ipfsImageUri = `https://ipfs.io/ipfs/${imageUploadResponse.IpfsHash}`;

      const json = {
        name: tokenName,
        symbol: tokenSymbol,
        description: tokenDescription,
        image: ipfsImageUri,
      };

      const jsonBlob = new Blob([JSON.stringify(json)], {
        type: "application/json",
      });

      const jsonFile = new File([jsonBlob], "metadata.json");
      const jsonUploadResponse = await pinata.upload.file(jsonFile);
      metadataUri = `https://ipfs.io/ipfs/${jsonUploadResponse.IpfsHash}`;

      toast.success("Metadata uploaded!", { id: toastId });
    } catch (error: any) {
      toast.error(`Metadata upload failed: ${error.message}`, { id: toastId });
      setIsLoading(false);
      return;
    }

    try {
      toast.loading("Creating token on Solana...", { id: toastId });
      const lamports = await getMinimumBalanceForRentExemptMint(connection);
      const mintKeypair = Keypair.generate();
      
      const associatedTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey
      );

      const tx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          tokenDecimals,
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
                name: tokenName,
                symbol: tokenSymbol,
                uri: metadataUri,
                creators: null,
                sellerFeeBasisPoints: 0,
                collection: null,
                uses: null,
              },
              isMutable: false,
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
            tokenAmount * Math.pow(10, tokenDecimals)
        )
      );

      const signature = await sendTransaction(tx, connection, {
        signers: [mintKeypair],
      });
      
      // <-- CHANGED: Hardcoded cluster to 'devnet'
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      
      toast.success(
        <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="underline">
          Token created! View on Explorer
        </a>,
        { id: toastId, duration: 8000 }
      );
      
      setTokenMintAddress(mintKeypair.publicKey.toString());

    } catch (error: any) {
      toast.error(`Token creation failed: ${error.message}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [
    publicKey,
    connection,
    sendTransaction,
    // <-- REMOVED: networkConfiguration dependency
    tokenName,
    tokenSymbol,
    tokenDescription,
    tokenDecimals,
    tokenAmount,
    imageFile,
  ]);

  return (
    <div className="mx-auto max-w-2xl p-4">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <ClipLoader color="white" size={50} />
        </div>
      )}
      
      {!tokenMintAddress ? (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">Create SPL Token</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName" className="">Token Name*</Label>
                <Input
                  id="tokenName"
                  type="text"
                  className=""
                  placeholder="My Awesome Token"
                  value={tokenName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tokenSymbol" className="">Symbol*</Label>
                <Input
                  id="tokenSymbol"
                  type="text"
                  className=""
                  placeholder="AWESOME"
                  value={tokenSymbol}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenSymbol(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tokenDescription" className="">Description</Label>
                <Textarea
                  id="tokenDescription"
                  className=""
                  placeholder="A token for my community!"
                  value={tokenDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTokenDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageFile" className="">Image*</Label>
                <Input
                  id="imageFile"
                  type="file"
                  className=""
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imageFile && (
                  <p className="text-sm text-muted-foreground">{imageFile.name}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenDecimals" className="">Decimals</Label>
                  <Input
                    id="tokenDecimals"
                    type="number"
                    className=""
                    min={0}
                    max={9}
                    value={tokenDecimals}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenDecimals(Number(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tokenAmount" className="">Amount to Mint</Label>
                  <Input
                    id="tokenAmount"
                    type="number"
                    className=""
                    min={0}
                    value={tokenAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenAmount(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="">
            <Button
              onClick={createToken}
              disabled={!publicKey || isLoading}
              variant="default"
              size="default"
              className="w-full"
            >
              {isLoading ? "Creating..." : publicKey ? "Create My Token" : "Connect Wallet"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="">
          <CardHeader className="">
            <CardTitle className="">Token Created Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="">Mint Address</Label>
              <div className="break-all font-mono text-sm p-2 bg-muted rounded">
                {tokenMintAddress}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="">Explorer Link</Label>
              <a
                className="text-primary hover:underline text-sm"
                href={`https://explorer.solana.com/address/${tokenMintAddress}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
              >
                View on Solana Explorer
              </a>
            </div>
          </CardContent>
          <CardFooter className="">
            <Button 
              onClick={() => setTokenMintAddress("")}
              variant="outline"
              size="default"
              className="w-full"
            >
              Create Another Token
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};