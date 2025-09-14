import { PublicKey } from "@solana/web3.js";

export interface NFTListing {
  id: string;
  mintAddress: string;
  seller: string;
  price: number; 
  listedAt: number;
  isActive: boolean;
  metadata?: NFTMetadata;
}

export interface TokenListing {
  id: string;
  mintAddress: string;
  seller: string;
  amount: number;
  pricePerToken: number;
  totalPrice: number;
  symbol: string;
  name: string;
  decimals: number;
  image?: string;
  listedAt: number;
  isActive: boolean;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  decimals: number;
}

export interface MarketplaceTransaction {
  id: string;
  tokenId: string;
  buyer: string;
  seller: string;
  amount: number;
  price: number;
  timestamp: number;
  type: 'token' | 'nft';
  status: 'pending' | 'completed' | 'failed';
  transactionSignature?: string;
  escrowId?: string;
}

export interface EscrowListing {
  id: string;
  escrowId: string;
  mintAddress: string;
  seller: string;
  amount: number;
  price: number;
  type: 'token' | 'nft';
  isActive: boolean;
  createdAt: number;
  
  escrowOwner?: string; 
  escrowSecret?: number[]; 
  metadata?: {
    name: string;
    symbol: string;
    image?: string;
    decimals?: number;
  };
}


export interface TokenPool {
  id: string;
  mintAddress: string;
  owner: string; 
  unitPrice: number; 
  decimals: number;
  totalLiquidity: number; 
  createdAt: number;
  isActive: boolean;
  
  poolOwner?: string;
  poolSecret?: number[];
  
  metadata?: {
    name: string;
    symbol: string;
    image?: string;
  };
}


export const MARKETPLACE_CONFIG = {
  FEE_PERCENTAGE: 2.5, 
  FEE_WALLET: "11111111111111111111111111111112", 
  MIN_PRICE: 0.001, 
  MAX_PRICE: 1000000, 
};


export class MarketplaceStore {
  private nftListings: Map<string, NFTListing>;
  private tokenListings: Map<string, TokenListing>;
  private transactions: MarketplaceTransaction[];
  private escrowListings: Map<string, EscrowListing>;
  private tokenPools: Map<string, TokenPool>;
  private readonly NFT_STORAGE_KEY = 'solanalab_nft_listings';
  private readonly TOKEN_STORAGE_KEY = 'solanalab_token_listings';
  private readonly TRANSACTION_STORAGE_KEY = 'solanalab_transactions';
  private readonly ESCROW_STORAGE_KEY = 'solanalab_escrow_listings';
  private readonly POOL_STORAGE_KEY = 'solanalab_token_pools';

  constructor() {
    this.nftListings = new Map();
    this.tokenListings = new Map();
    this.transactions = [];
    this.escrowListings = new Map();
    this.tokenPools = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return; 

    try {
      
      const nftData = localStorage.getItem(this.NFT_STORAGE_KEY);
      if (nftData) {
        const listings = JSON.parse(nftData) as NFTListing[];
        listings.forEach(listing => {
          this.nftListings.set(listing.id, listing);
        });
      }

      
      const tokenData = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (tokenData) {
        const listings = JSON.parse(tokenData) as TokenListing[];
        listings.forEach(listing => {
          this.tokenListings.set(listing.id, listing);
        });
      }

      
      const transactionData = localStorage.getItem(this.TRANSACTION_STORAGE_KEY);
      if (transactionData) {
        this.transactions = JSON.parse(transactionData) as MarketplaceTransaction[];
      }

      
      const escrowData = localStorage.getItem(this.ESCROW_STORAGE_KEY);
      if (escrowData) {
        const listings = JSON.parse(escrowData) as EscrowListing[];
        listings.forEach(listing => {
          this.escrowListings.set(listing.id, listing);
        });
      }

      
      const poolData = localStorage.getItem(this.POOL_STORAGE_KEY);
      if (poolData) {
        const pools = JSON.parse(poolData) as TokenPool[];
        pools.forEach(pool => this.tokenPools.set(pool.id, pool));
      }
    } catch (error) {
      console.error('Error loading marketplace data from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return; 

    try {
      
      const nftListings = Array.from(this.nftListings.values());
      localStorage.setItem(this.NFT_STORAGE_KEY, JSON.stringify(nftListings));

      
      const tokenListings = Array.from(this.tokenListings.values());
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(tokenListings));

      
      localStorage.setItem(this.TRANSACTION_STORAGE_KEY, JSON.stringify(this.transactions));

      
      const escrowListings = Array.from(this.escrowListings.values());
      localStorage.setItem(this.ESCROW_STORAGE_KEY, JSON.stringify(escrowListings));

      
      const tokenPools = Array.from(this.tokenPools.values());
      localStorage.setItem(this.POOL_STORAGE_KEY, JSON.stringify(tokenPools));
    } catch (error) {
      console.error('Error saving marketplace data to storage:', error);
    }
  }

  
  addNFTListing(listing: NFTListing): void {
    this.nftListings.set(listing.id, listing);
    this.saveToStorage();
  }

  removeNFTListing(id: string): boolean {
    const removed = this.nftListings.delete(id);
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  updateNFTListing(id: string, updates: Partial<NFTListing>): boolean {
    const existing = this.nftListings.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.nftListings.set(id, updated);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getNFTListing(id: string): NFTListing | undefined {
    return this.nftListings.get(id);
  }

  getAllNFTListings(): NFTListing[] {
    return Array.from(this.nftListings.values()).filter(listing => listing.isActive);
  }

  getNFTListingsByOwner(owner: string): NFTListing[] {
    return this.getAllNFTListings().filter(listing => listing.seller === owner);
  }

  
  addTokenListing(listing: TokenListing): void {
    this.tokenListings.set(listing.id, listing);
    this.saveToStorage();
  }

  removeTokenListing(id: string): boolean {
    const removed = this.tokenListings.delete(id);
    if (removed) {
      this.saveToStorage();
    }
    return removed;
  }

  updateTokenListing(id: string, updates: Partial<TokenListing>): boolean {
    const existing = this.tokenListings.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.tokenListings.set(id, updated);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  getTokenListing(id: string): TokenListing | undefined {
    return this.tokenListings.get(id);
  }

  getAllTokenListings(): TokenListing[] {
    return Array.from(this.tokenListings.values()).filter(listing => listing.isActive);
  }

  getTokenListingsByOwner(owner: string): TokenListing[] {
    return this.getAllTokenListings().filter(listing => listing.seller === owner);
  }

  getTokenListingsByMint(mintAddress: string): TokenListing[] {
    return this.getAllTokenListings().filter(listing => listing.mintAddress === mintAddress);
  }

  
  addTransaction(transaction: MarketplaceTransaction): void {
    this.transactions.push(transaction);
    this.saveToStorage();
  }

  getTransactionsByUser(userAddress: string): MarketplaceTransaction[] {
    return this.transactions.filter(
      tx => tx.buyer === userAddress || tx.seller === userAddress
    );
  }

  getAllTransactions(): MarketplaceTransaction[] {
    return [...this.transactions];
  }

  
  searchNFTListings(query: string): NFTListing[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllNFTListings().filter(listing =>
      listing.metadata?.name?.toLowerCase().includes(lowercaseQuery) ||
      listing.metadata?.description?.toLowerCase().includes(lowercaseQuery) ||
      listing.mintAddress.toLowerCase().includes(lowercaseQuery)
    );
  }

  searchTokenListings(query: string): TokenListing[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllTokenListings().filter(listing =>
      listing.name.toLowerCase().includes(lowercaseQuery) ||
      listing.symbol.toLowerCase().includes(lowercaseQuery)
    );
  }

  
  getMarketplaceStats() {
    const nftListings = this.getAllNFTListings();
    const tokenListings = this.getAllTokenListings();
    const escrowListings = this.getAllEscrowListings();
    
    return {
      totalNFTListings: nftListings.length,
      totalTokenListings: tokenListings.length,
      totalEscrowListings: escrowListings.length,
      totalTransactions: this.transactions.length,
      totalVolume: this.transactions.reduce((sum, tx) => sum + tx.price, 0),
    };
  }

  
  addEscrowListing(listing: EscrowListing): void {
    this.escrowListings.set(listing.id, listing);
    this.saveToStorage();
  }

  getEscrowListing(id: string): EscrowListing | undefined {
    return this.escrowListings.get(id);
  }

  getAllEscrowListings(): EscrowListing[] {
    return Array.from(this.escrowListings.values()).filter(listing => listing.isActive);
  }

  getEscrowListingsByType(type: 'token' | 'nft'): EscrowListing[] {
    return this.getAllEscrowListings().filter(listing => listing.type === type);
  }

  deactivateEscrowListing(id: string): boolean {
    const listing = this.escrowListings.get(id);
    if (listing) {
      listing.isActive = false;
      this.escrowListings.set(id, listing);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  removeEscrowListing(id: string): boolean {
    const deleted = this.escrowListings.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  
  addTokenPool(pool: TokenPool): void {
    this.tokenPools.set(pool.id, pool);
    this.saveToStorage();
  }

  getTokenPool(id: string): TokenPool | undefined {
    return this.tokenPools.get(id);
  }

  getAllTokenPools(): TokenPool[] {
    return Array.from(this.tokenPools.values()).filter(p => p.isActive);
  }

  getTokenPoolsByMint(mintAddress: string): TokenPool[] {
    return this.getAllTokenPools().filter(p => p.mintAddress === mintAddress);
  }

  updateTokenPool(pool: TokenPool): void {
    if (this.tokenPools.has(pool.id)) {
      this.tokenPools.set(pool.id, pool);
      this.saveToStorage();
    }
  }
}

export const marketplaceStore = new MarketplaceStore();


export const generateListingId = (): string => {
  return `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatPrice = (price: number): string => {
  return `${price.toFixed(4)} SOL`;
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString();
};

export const calculateMarketplaceFee = (price: number): number => {
  return (price * MARKETPLACE_CONFIG.FEE_PERCENTAGE) / 100;
};

export const calculateSellerProceeds = (price: number): number => {
  return price - calculateMarketplaceFee(price);
};