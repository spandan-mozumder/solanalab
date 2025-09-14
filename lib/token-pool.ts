import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import { TokenPool, marketplaceStore, MARKETPLACE_CONFIG } from "./marketplace";

export class TokenPoolService {
  static serializeSecretKey(secretKey: Uint8Array): number[] { return Array.from(secretKey); }
  static deserializeSecretKey(arr?: number[]) { return arr ? new Uint8Array(arr) : undefined; }

  static async createPool({
    connection,
    owner,
    mintAddress,
    unitPrice,
    decimals,
    metadata,
  }: {
    connection: Connection;
    owner: PublicKey;
    mintAddress: PublicKey;
    unitPrice: number;
    decimals: number;
    metadata?: { name: string; symbol: string; image?: string };
  }): Promise<{ pool: TokenPool; authority: Keypair; }> {
    const authority = Keypair.generate();
    const pool: TokenPool = {
      id: `pool_${Date.now()}_${Math.random().toString(36).slice(2,9)}`,
      mintAddress: mintAddress.toString(),
      owner: owner.toString(),
      unitPrice,
      decimals,
      totalLiquidity: 0,
      createdAt: Date.now(),
      isActive: true,
      poolOwner: authority.publicKey.toString(),
      poolSecret: this.serializeSecretKey(authority.secretKey),
      metadata,
    };
    marketplaceStore.addTokenPool(pool);
    return { pool, authority };
  }

  static async addLiquidity({
    connection,
    provider,
    pool,
    amount,
  }: {
    connection: Connection;
    provider: PublicKey; 
    pool: TokenPool;
    amount: number; 
  }): Promise<Transaction> {
    if (!pool.poolOwner || !pool.poolSecret) throw new Error("Pool authority missing");

    const authority = Keypair.fromSecretKey(this.deserializeSecretKey(pool.poolSecret)!);
    const mint = new PublicKey(pool.mintAddress);

    const providerATA = await getAssociatedTokenAddress(mint, provider, false, TOKEN_PROGRAM_ID);
    const poolATA = await getAssociatedTokenAddress(mint, authority.publicKey, false, TOKEN_PROGRAM_ID);

    const tx = new Transaction();

    
    try {
      await getAccount(connection, poolATA, 'confirmed', TOKEN_PROGRAM_ID);
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError || e instanceof TokenInvalidAccountOwnerError) {
        tx.add(createAssociatedTokenAccountInstruction(provider, poolATA, authority.publicKey, mint, TOKEN_PROGRAM_ID));
      } else { throw e; }
    }

    const raw = BigInt(Math.floor(amount * Math.pow(10, pool.decimals)));
    tx.add(createTransferInstruction(providerATA, poolATA, provider, raw, [], TOKEN_PROGRAM_ID));

    
    tx.partialSign(authority); 
    return tx;
  }

  static async buyFromPool({
    connection,
    buyer,
    pool,
    amount,
  }: {
    connection: Connection;
    buyer: PublicKey;
    pool: TokenPool;
    amount: number; 
  }): Promise<Transaction> {
    if (!pool.poolOwner || !pool.poolSecret) throw new Error("Pool authority missing");
    const authority = Keypair.fromSecretKey(this.deserializeSecretKey(pool.poolSecret)!);
    const mint = new PublicKey(pool.mintAddress);

    const poolATA = await getAssociatedTokenAddress(mint, authority.publicKey, false, TOKEN_PROGRAM_ID);
    const buyerATA = await getAssociatedTokenAddress(mint, buyer, false, TOKEN_PROGRAM_ID);

    const tx = new Transaction();

    
    try {
      await getAccount(connection, buyerATA, 'confirmed', TOKEN_PROGRAM_ID);
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError || e instanceof TokenInvalidAccountOwnerError) {
        tx.add(createAssociatedTokenAccountInstruction(buyer, buyerATA, buyer, mint, TOKEN_PROGRAM_ID));
      } else { throw e; }
    }

    
    const raw = BigInt(Math.floor(amount * Math.pow(10, pool.decimals)));
    tx.add(createTransferInstruction(poolATA, buyerATA, authority.publicKey, raw, [], TOKEN_PROGRAM_ID));

    
    const totalPrice = pool.unitPrice * amount;
    const fee = totalPrice * (MARKETPLACE_CONFIG.FEE_PERCENTAGE / 100);
    const proceeds = totalPrice - fee;

    tx.add(SystemProgram.transfer({ fromPubkey: buyer, toPubkey: new PublicKey(pool.owner), lamports: Math.floor(proceeds * LAMPORTS_PER_SOL) }));
    tx.add(SystemProgram.transfer({ fromPubkey: buyer, toPubkey: new PublicKey(MARKETPLACE_CONFIG.FEE_WALLET), lamports: Math.floor(fee * LAMPORTS_PER_SOL) }));

    tx.partialSign(authority);
    return tx;
  }

  static async removeLiquidity({
    connection,
    owner,
    pool,
    amount,
  }: {
    connection: Connection;
    owner: PublicKey; 
    pool: TokenPool;
    amount: number; 
  }): Promise<Transaction> {
    if (!pool.poolOwner || !pool.poolSecret) throw new Error("Pool authority missing");
    if (owner.toString() !== pool.owner) throw new Error("Only pool owner can withdraw liquidity");

    const authority = Keypair.fromSecretKey(this.deserializeSecretKey(pool.poolSecret)!);
    const mint = new PublicKey(pool.mintAddress);

    const poolATA = await getAssociatedTokenAddress(mint, authority.publicKey, false, TOKEN_PROGRAM_ID);
    const ownerATA = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID);

    const tx = new Transaction();

    
    try { await getAccount(connection, ownerATA, 'confirmed', TOKEN_PROGRAM_ID); }
    catch (e) {
      if (e instanceof TokenAccountNotFoundError || e instanceof TokenInvalidAccountOwnerError) {
        tx.add(createAssociatedTokenAccountInstruction(owner, ownerATA, owner, mint, TOKEN_PROGRAM_ID));
      } else { throw e; }
    }

    const raw = BigInt(Math.floor(amount * Math.pow(10, pool.decimals)));
    tx.add(createTransferInstruction(poolATA, ownerATA, authority.publicKey, raw, [], TOKEN_PROGRAM_ID));

    tx.partialSign(authority);
    return tx;
  }
}
