"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { FC, useCallback, useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw } from "lucide-react";
import {
  EscrowListing,
  marketplaceStore,
  MARKETPLACE_CONFIG,
} from "@/lib/marketplace";
import { getBlockchainDataService, type BlockchainNFT } from "@/lib/blockchain-data";
import { getTokenImageUrl, getDefaultNFTImage } from "@/lib/token-images";
import { EscrowMarketplaceService, EscrowAccount } from "@/lib/escrow-marketplace";

interface NFTWithListing {
  mintAddress: string;
  name: string;
  image?: string;
  symbol?: string;
  isListed: boolean;
  listing?: EscrowListing;
}

const NFTMarketplace: FC = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  
  const [userNFTs, setUserNFTs] = useState<NFTWithListing[]>([]);
  const [allListings, setAllListings] = useState<EscrowListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("market");
  
  
  const [isListingDialogOpen, setIsListingDialogOpen] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTWithListing | null>(null);
  const [listingPrice, setListingPrice] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  
  
  const [purchasing, setPurchasing] = useState<string | null>(null);

  
  const formatPrice = (price: number) => `${price.toFixed(4)} SOL`;
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString();
  const calculateMarketplaceFee = (price: number) => price * (MARKETPLACE_CONFIG.FEE_PERCENTAGE / 100);
  const calculateSellerProceeds = (price: number) => price - calculateMarketplaceFee(price);

  
  const loadUserNFTs = useCallback(async () => {
    if (!publicKey || !connection) return;
    
    setLoading(true);
    try {
      const rawNFTs: BlockchainNFT[] = await getBlockchainDataService(connection).getUserNFTs(publicKey);

      const listings = marketplaceStore.getEscrowListingsByType('nft');
      const mapped: NFTWithListing[] = rawNFTs.map(n => {
        const listing = listings.find(l => l.mintAddress === n.mintAddress && l.seller === publicKey.toString() && l.isActive);
        return {
          mintAddress: n.mintAddress,
          name: n.metadata?.name || `NFT ${n.mintAddress.slice(0, 6)}...`,
          image: n.metadata?.image || "",
          symbol: "NFT",
          isListed: !!listing,
          listing,
        };
      });

      setUserNFTs(mapped);
    } catch (error) {
      console.error('Error loading NFTs:', error);
      toast.error('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  
  const loadMarketplaceListings = useCallback(() => {
    setRefreshing(true);
    try {
      const listings = marketplaceStore.getEscrowListingsByType('nft');
      setAllListings(listings);
    } catch (error) {
      console.error('Error loading marketplace listings:', error);
      toast.error('Failed to load marketplace listings');
    } finally {
      setRefreshing(false);
    }
  }, []);

  
  const createNFTEscrowListing = async () => {
    if (!publicKey || !selectedNFT || !connection) return;
    
    const price = parseFloat(listingPrice);
    
    if (price < MARKETPLACE_CONFIG.MIN_PRICE) {
      toast.error('Price too low');
      return;
    }
    
    setListingLoading(true);
    
    try {
      
      const { transaction, escrowId, escrowAccount, escrowOwner, escrowSecret } = await EscrowMarketplaceService.createNFTEscrow({
        connection,
        seller: publicKey,
        mintAddress: new PublicKey(selectedNFT.mintAddress),
        priceInSOL: price,
      });
      
      
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      
      const signature = await sendTransaction(transaction, connection);
      
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      
      const listing: EscrowListing = {
        id: `nft_escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        escrowId,
        mintAddress: selectedNFT.mintAddress,
        seller: publicKey.toString(),
        amount: 1,
        price,
        type: 'nft',
        isActive: true,
        createdAt: Date.now(),
        escrowOwner: escrowOwner.toString(),
        escrowSecret,
        metadata: {
          name: selectedNFT.name,
          symbol: selectedNFT.symbol || "NFT",
          image: selectedNFT.image,
        },
      };
      
      marketplaceStore.addEscrowListing(listing);
      
      toast.success('NFT listed successfully!');
      setIsListingDialogOpen(false);
      setListingPrice("");
      setSelectedNFT(null);
      
      
      loadUserNFTs();
      loadMarketplaceListings();
      
    } catch (error) {
      console.error('Failed to create NFT escrow listing:', error);
      toast.error('Failed to list NFT');
    } finally {
      setListingLoading(false);
    }
  };

  
  const purchaseNFTFromEscrow = async (listing: EscrowListing) => {
    if (!publicKey || !connection) return;
    
    if (listing.seller === publicKey.toString()) {
      toast.error("You cannot buy your own listing");
      return;
    }
    
    setPurchasing(listing.id);
    
    try {
      
      const escrowAccount: EscrowAccount = {
        id: listing.escrowId,
        seller: new PublicKey(listing.seller),
        mintAddress: new PublicKey(listing.mintAddress),
        amount: BigInt(1),
        price: listing.price,
        isActive: true,
        createdAt: listing.createdAt,
        type: 'nft',
      };
      
      
      const transaction = await EscrowMarketplaceService.purchaseNFTFromEscrow({
        connection,
        buyer: publicKey,
        escrowAccount,
        marketplaceFeeWallet: new PublicKey(MARKETPLACE_CONFIG.FEE_WALLET),
        escrowSecret: listing.escrowSecret,
      });
      
      
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      
      const signature = await sendTransaction(transaction, connection);
      
      
      await connection.confirmTransaction(signature, 'confirmed');
      
      
      marketplaceStore.deactivateEscrowListing(listing.id);
      
      
      marketplaceStore.addTransaction({
        id: `nft_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tokenId: listing.mintAddress,
        buyer: publicKey.toString(),
        seller: listing.seller,
        amount: 1,
        price: listing.price,
        timestamp: Date.now(),
        type: 'nft',
        status: 'completed',
        transactionSignature: signature,
        escrowId: listing.escrowId,
      });
      
      toast.success('NFT purchased successfully!');
      
      
      loadUserNFTs();
      loadMarketplaceListings();
      
    } catch (error) {
      console.error('Failed to purchase NFT:', error);
      toast.error('Failed to purchase NFT');
    } finally {
      setPurchasing(null);
    }
  };

  
  useEffect(() => {
    loadUserNFTs();
    loadMarketplaceListings();
  }, [loadUserNFTs, loadMarketplaceListings]);

  
  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">NFT Marketplace</h2>
            <p className="text-muted-foreground">
              Please connect your wallet to access the NFT marketplace.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">NFT Marketplace</h1>
        <Button
          onClick={() => {
            loadUserNFTs();
            loadMarketplaceListings();
          }}
          variant="outline"
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Alert className="mb-6" variant="default">
        <AlertDescription className="">
          <strong>Escrow NFT Marketplace:</strong> NFTs are held in escrow when listed. 
          Sellers deposit NFTs first, then buyers receive them after payment. 
          Marketplace fee: {MARKETPLACE_CONFIG.FEE_PERCENTAGE}%
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market" className="">Browse Market</TabsTrigger>
          <TabsTrigger value="myNFTs" className="">My NFTs</TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg truncate">{listing.metadata?.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={listing.metadata?.image || getDefaultNFTImage(listing.metadata?.name || '')}
                      alt={listing.metadata?.name || 'NFT'}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.src = getDefaultNFTImage(listing.metadata?.name || '');
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Price:</span>
                      <span className="font-bold text-green-600">{formatPrice(listing.price)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Seller:</span>
                      <span className="text-xs font-mono">
                        {listing.seller.slice(0, 4)}...{listing.seller.slice(-4)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Listed:</span>
                      <span className="text-sm">{formatDate(listing.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="">
                  <Button
                    onClick={() => purchaseNFTFromEscrow(listing)}
                    disabled={purchasing === listing.id || listing.seller === publicKey?.toString()}
                    className="w-full"
                  >
                    {purchasing === listing.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Purchasing...
                      </>
                    ) : listing.seller === publicKey?.toString() ? (
                      "Your Listing"
                    ) : (
                      `Buy for ${formatPrice(listing.price)}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {allListings.length === 0 && (
            <Card className="">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No NFTs listed for sale.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="myNFTs" className="space-y-4">
          {loading ? (
            <Card className="">
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading your NFTs...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {userNFTs.map((nft) => (
                <Card key={nft.mintAddress} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg truncate">{nft.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                      <img
                        src={nft.image || getDefaultNFTImage(nft.name)}
                        alt={nft.name}
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          e.currentTarget.src = getDefaultNFTImage(nft.name);
                        }}
                      />
                    </div>
                    
                    {nft.isListed && nft.listing && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Listed Price:</span>
                          <span className="text-sm font-bold text-green-600">
                            {formatPrice(nft.listing.price)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="">
                    {nft.isListed ? (
                      <Badge variant="secondary" className="w-full justify-center">
                        Listed for Sale
                      </Badge>
                    ) : (
                      <Dialog
                        open={isListingDialogOpen && selectedNFT?.mintAddress === nft.mintAddress}
                        onOpenChange={(open: boolean) => {
                          setIsListingDialogOpen(open);
                          if (!open) {
                            setSelectedNFT(null);
                            setListingPrice("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            className="w-full"
                            onClick={() => {
                              setSelectedNFT(nft);
                              setIsListingDialogOpen(true);
                            }}
                          >
                            List for Sale
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="">
                          <DialogHeader className="">
                            <DialogTitle className="">List {nft.name} for Sale</DialogTitle>
                            <DialogDescription className="">
                              Create an escrow listing. Your NFT will be held securely until sold.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="aspect-square relative rounded-lg overflow-hidden bg-muted mx-auto max-w-48">
                              <img
                                src={nft.image || getDefaultNFTImage(nft.name)}
                                alt={nft.name}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  e.currentTarget.src = getDefaultNFTImage(nft.name);
                                }}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="price" className="">Price (SOL)</Label>
                              <Input
                                className=""
                                id="price"
                                type="number"
                                placeholder="0.00"
                                value={listingPrice}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setListingPrice(e.target.value)}
                                min={MARKETPLACE_CONFIG.MIN_PRICE}
                                step="0.001"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Min: {MARKETPLACE_CONFIG.MIN_PRICE} SOL
                              </p>
                            </div>
                            
                            {listingPrice && (
                              <div className="bg-muted p-3 rounded-lg space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Sale Price:</span>
                                  <span>{formatPrice(parseFloat(listingPrice) || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Marketplace Fee ({MARKETPLACE_CONFIG.FEE_PERCENTAGE}%):</span>
                                  <span>{formatPrice(calculateMarketplaceFee(parseFloat(listingPrice) || 0))}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold">
                                  <span>You'll Receive:</span>
                                  <span>{formatPrice(calculateSellerProceeds(parseFloat(listingPrice) || 0))}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <DialogFooter className="">
                            <Button
                              onClick={createNFTEscrowListing}
                              disabled={listingLoading || !listingPrice}
                              className="w-full"
                            >
                              {listingLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Creating Escrow...
                                </>
                              ) : (
                                "Create Escrow Listing"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
          
          {!loading && userNFTs.length === 0 && (
            <Card className="">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  You don't have any NFTs to list. Create some NFTs first!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NFTMarketplace;