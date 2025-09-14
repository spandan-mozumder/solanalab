import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";


export interface EscrowAccount {
  id: string;
  seller: PublicKey;
  mintAddress: PublicKey;
  amount: bigint;
  price: number; 
  isActive: boolean;
  createdAt: number;
  type: 'token' | 'nft';
}


export class EscrowMarketplaceService {
  private static escrowKeypairs = new Map<string, Keypair>();
  
  
  static serializeSecretKey(secretKey: Uint8Array): number[] {
    return Array.from(secretKey);
  }
  
  static deserializeSecretKey(arr: number[] | undefined): Uint8Array | undefined {
    if (!arr) return undefined;
    return new Uint8Array(arr);
  }
  
  /**
   * Step 1: Create escrow account and transfer tokens from seller
   */
  static async createTokenEscrow({
    connection,
    seller,
    mintAddress,
    amount,
    decimals,
    priceInSOL,
  }: {
    connection: Connection;
    seller: PublicKey;
    mintAddress: PublicKey;
    amount: number;
    decimals: number;
    priceInSOL: number;
  }): Promise<{ transaction: Transaction; escrowId: string; escrowAccount: EscrowAccount; escrowOwner: PublicKey; escrowSecret: number[] }> {
    
    
    const escrowKeypair = Keypair.generate();
    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    
    this.escrowKeypairs.set(escrowId, escrowKeypair);
    
    const transaction = new Transaction();
    
    
    const sellerTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      seller,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    const escrowTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      escrowKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        seller, 
        escrowTokenAccount,
        escrowKeypair.publicKey, 
        mintAddress,
        TOKEN_PROGRAM_ID
      )
    );
    
    
    const transferAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));
    transaction.add(
      createTransferInstruction(
        sellerTokenAccount, 
        escrowTokenAccount, 
        seller, 
        transferAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    
    const escrowAccount: EscrowAccount = {
      id: escrowId,
      seller,
      mintAddress,
      amount: transferAmount,
      price: priceInSOL,
      isActive: true,
      createdAt: Date.now(),
      type: 'token',
    };
    
    return { 
      transaction, 
      escrowId, 
      escrowAccount,
      escrowOwner: escrowKeypair.publicKey,
      escrowSecret: this.serializeSecretKey(escrowKeypair.secretKey),
    };
  }

  /**
   * Step 2: Execute purchase from escrow
   */
  static async purchaseFromTokenEscrow({
    connection,
    buyer,
    escrowAccount,
    marketplaceFeeWallet,
    escrowSecret,
  }: {
    connection: Connection;
    buyer: PublicKey;
    escrowAccount: EscrowAccount;
    marketplaceFeeWallet: PublicKey;
    escrowSecret?: number[];
  }): Promise<Transaction> {
    
    const transaction = new Transaction();
    let escrowKeypair = this.escrowKeypairs.get(escrowAccount.id);
    if (!escrowKeypair && escrowSecret) {
      const sk = this.deserializeSecretKey(escrowSecret);
      if (sk) escrowKeypair = Keypair.fromSecretKey(sk);
    }
    
    if (!escrowKeypair) {
      throw new Error("Escrow keypair not found - escrow may have expired");
    }
    
    
    const buyerTokenAccount = await getAssociatedTokenAddress(
      escrowAccount.mintAddress,
      buyer,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    const escrowTokenAccount = await getAssociatedTokenAddress(
      escrowAccount.mintAddress,
      escrowKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    let buyerAccountExists = false;
    try {
      await getAccount(connection, buyerTokenAccount, 'confirmed', TOKEN_PROGRAM_ID);
      buyerAccountExists = true;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
        buyerAccountExists = false;
      } else {
        throw error;
      }
    }
    
    if (!buyerAccountExists) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyer, 
          buyerTokenAccount,
          buyer, 
          escrowAccount.mintAddress,
          TOKEN_PROGRAM_ID
        )
      );
    }
    
    
    transaction.add(
      createTransferInstruction(
        escrowTokenAccount, 
        buyerTokenAccount, 
        escrowKeypair.publicKey, 
        escrowAccount.amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    
    const marketplaceFee = escrowAccount.price * 0.025; 
    const sellerProceeds = escrowAccount.price - marketplaceFee;
    
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: escrowAccount.seller,
        lamports: Math.floor(sellerProceeds * LAMPORTS_PER_SOL),
      })
    );
    
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: marketplaceFeeWallet,
        lamports: Math.floor(marketplaceFee * LAMPORTS_PER_SOL),
      })
    );
    
    
    transaction.partialSign(escrowKeypair);
    
    return transaction;
  }

  /**
   * NFT Escrow Creation
   */
  static async createNFTEscrow({
    connection,
    seller,
    mintAddress,
    priceInSOL,
  }: {
    connection: Connection;
    seller: PublicKey;
    mintAddress: PublicKey;
    priceInSOL: number;
  }): Promise<{ transaction: Transaction; escrowId: string; escrowAccount: EscrowAccount; escrowOwner: PublicKey; escrowSecret: number[] }> {
    
    
    const escrowKeypair = Keypair.generate();
    const escrowId = `nft_escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    
    this.escrowKeypairs.set(escrowId, escrowKeypair);
    
    const transaction = new Transaction();
    
    
    const sellerNFTAccount = await getAssociatedTokenAddress(
      mintAddress,
      seller,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    const escrowNFTAccount = await getAssociatedTokenAddress(
      mintAddress,
      escrowKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        seller, 
        escrowNFTAccount,
        escrowKeypair.publicKey, 
        mintAddress,
        TOKEN_PROGRAM_ID
      )
    );
    
    
    transaction.add(
      createTransferInstruction(
        sellerNFTAccount, 
        escrowNFTAccount, 
        seller, 
        BigInt(1), 
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    
    const escrowAccount: EscrowAccount = {
      id: escrowId,
      seller,
      mintAddress,
      amount: BigInt(1),
      price: priceInSOL,
      isActive: true,
      createdAt: Date.now(),
      type: 'nft',
    };
    
    return { 
      transaction, 
      escrowId, 
      escrowAccount, 
      escrowOwner: escrowKeypair.publicKey,
      escrowSecret: this.serializeSecretKey(escrowKeypair.secretKey),
    };
  }

  /**
   * NFT Purchase from Escrow
   */
  static async purchaseNFTFromEscrow({
    connection,
    buyer,
    escrowAccount,
    marketplaceFeeWallet,
    escrowSecret,
  }: {
    connection: Connection;
    buyer: PublicKey;
    escrowAccount: EscrowAccount;
    marketplaceFeeWallet: PublicKey;
    escrowSecret?: number[];
  }): Promise<Transaction> {
    
    const transaction = new Transaction();
    let escrowKeypair = this.escrowKeypairs.get(escrowAccount.id);
    if (!escrowKeypair && escrowSecret) {
      const sk = this.deserializeSecretKey(escrowSecret);
      if (sk) escrowKeypair = Keypair.fromSecretKey(sk);
    }
    
    if (!escrowKeypair) {
      throw new Error("NFT escrow keypair not found");
    }
    
    
    const buyerNFTAccount = await getAssociatedTokenAddress(
      escrowAccount.mintAddress,
      buyer,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    const escrowNFTAccount = await getAssociatedTokenAddress(
      escrowAccount.mintAddress,
      escrowKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    let buyerAccountExists = false;
    try {
      await getAccount(connection, buyerNFTAccount, 'confirmed', TOKEN_PROGRAM_ID);
      buyerAccountExists = true;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
        buyerAccountExists = false;
      }
    }
    
    if (!buyerAccountExists) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyer,
          buyerNFTAccount,
          buyer,
          escrowAccount.mintAddress,
          TOKEN_PROGRAM_ID
        )
      );
    }
    
    
    transaction.add(
      createTransferInstruction(
        escrowNFTAccount, 
        buyerNFTAccount, 
        escrowKeypair.publicKey, 
        BigInt(1), 
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    
    const marketplaceFee = escrowAccount.price * 0.025;
    const sellerProceeds = escrowAccount.price - marketplaceFee;
    
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: escrowAccount.seller,
        lamports: Math.floor(sellerProceeds * LAMPORTS_PER_SOL),
      })
    );
    
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: buyer,
        toPubkey: marketplaceFeeWallet,
        lamports: Math.floor(marketplaceFee * LAMPORTS_PER_SOL),
      })
    );
    
    
    transaction.partialSign(escrowKeypair);
    
    return transaction;
  }

  /**
   * Cancel escrow and return tokens to seller
   */
  static async cancelEscrow({
    connection,
    seller,
    escrowAccount,
  }: {
    connection: Connection;
    seller: PublicKey;
    escrowAccount: EscrowAccount;
  }): Promise<Transaction> {
    
    const transaction = new Transaction();
    const escrowKeypair = this.escrowKeypairs.get(escrowAccount.id);
    
    if (!escrowKeypair) {
      throw new Error("Escrow keypair not found");
    }
    
    
    const sellerTokenAccount = await getAssociatedTokenAddress(
      escrowAccount.mintAddress,
      seller,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    const escrowTokenAccount = await getAssociatedTokenAddress(
      escrowAccount.mintAddress,
      escrowKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );
    
    
    transaction.add(
      createTransferInstruction(
        escrowTokenAccount, 
        sellerTokenAccount, 
        escrowKeypair.publicKey, 
        escrowAccount.amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    
    transaction.partialSign(escrowKeypair);
    
    return transaction;
  }

  /**
   * Get escrow keypair (for signing)
   */
  static getEscrowKeypair(escrowId: string): Keypair | undefined {
    return this.escrowKeypairs.get(escrowId);
  }

  /**
   * Clean up expired escrows
   */
  static cleanupExpiredEscrows(maxAgeMs: number = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [escrowId, keypair] of this.escrowKeypairs.entries()) {
      const created = parseInt(escrowId.split('_')[1]) || 0;
      if (now - created > maxAgeMs) {
        this.escrowKeypairs.delete(escrowId);
      }
    }
  }
}