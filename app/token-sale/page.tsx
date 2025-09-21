"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { marketplaceStore, type TokenPool, MARKETPLACE_CONFIG } from "@/lib/marketplace";
import { getBlockchainDataService, type BlockchainToken } from "@/lib/blockchain-data";
import { TokenPoolService } from "@/lib/token-pool";
import { Loader2 } from "lucide-react";

export default function TokenPoolPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [myTokens, setMyTokens] = useState<BlockchainToken[]>([]);
  const [pools, setPools] = useState<TokenPool[]>([]);
  const [loading, setLoading] = useState(false);

  
  const [selectedMint, setSelectedMint] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");

  
  const [liquidityAmount, setLiquidityAmount] = useState<string>("");

  
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");

  const refresh = useCallback(async () => {
    if (!publicKey || !connection) return;
    setLoading(true);
    try {
      const tokens = await getBlockchainDataService(connection).getUserTokens(publicKey);
      setMyTokens(tokens);
      setPools(marketplaceStore.getAllTokenPools());
    } finally { setLoading(false); }
  }, [publicKey, connection]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!publicKey) {
    return (
      <div className="container mx-auto p-6">
        <Card className="">
          <CardContent className="p-6 text-center">Connect your wallet to manage pools.</CardContent>
        </Card>
      </div>
    );
  }

  const selectedToken = useMemo(() => myTokens.find(t => t.mintAddress === selectedMint), [myTokens, selectedMint]);

  const handleCreatePool = async () => {
    if (!publicKey || !connection || !selectedToken) return;
    const price = parseFloat(unitPrice);
    if (!price || price <= 0) return;

    const { pool } = await TokenPoolService.createPool({
      connection,
      owner: publicKey,
      mintAddress: new PublicKey(selectedToken.mintAddress),
      unitPrice: price,
      decimals: selectedToken.decimals,
      metadata: { name: selectedToken.name, symbol: selectedToken.symbol, image: selectedToken.image },
    });
    setPools(marketplaceStore.getAllTokenPools());
  };

  const handleAddLiquidity = async () => {
    if (!publicKey || !connection) return;
    const pool = pools.find(p => p.mintAddress === selectedMint);
    if (!pool) return;

    const amount = parseFloat(liquidityAmount);
    if (!amount || amount <= 0) return;

    const tx = await TokenPoolService.addLiquidity({ connection, provider: publicKey, pool, amount });
    const { blockhash } = await connection.getLatestBlockhash();
    tx.feePayer = publicKey; tx.recentBlockhash = blockhash;
    const sig = await sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, 'confirmed');

    pool.totalLiquidity += amount;
    marketplaceStore.updateTokenPool(pool);
    setPools(marketplaceStore.getAllTokenPools());
  };

  const handleBuy = async () => {
    if (!publicKey || !connection || !selectedPoolId) return;
    const pool = pools.find(p => p.id === selectedPoolId);
    if (!pool) return;

    const amount = parseFloat(buyAmount);
    if (!amount || amount <= 0) return;
    if (amount > pool.totalLiquidity) return;

    const tx = await TokenPoolService.buyFromPool({ connection, buyer: publicKey, pool, amount });
    const { blockhash } = await connection.getLatestBlockhash();
    tx.feePayer = publicKey; tx.recentBlockhash = blockhash;
    const sig = await sendTransaction(tx, connection);
    await connection.confirmTransaction(sig, 'confirmed');

    pool.totalLiquidity -= amount;
    marketplaceStore.updateTokenPool(pool);
    setPools(marketplaceStore.getAllTokenPools());
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Token Liquidity Pools</h1>

      <Alert className="" variant="default">
        <AlertDescription className="">
          Demo fixed-price pool. Tokens deposited are actually held in a pool-owned ATA. Buyers receive those original tokens. Fees ({MARKETPLACE_CONFIG.FEE_PERCENTAGE}%) go to the configured fee wallet.
        </AlertDescription>
      </Alert>

      <Tabs value={selectedPoolId ? "buy" : "manage"} onValueChange={() => {}} className="">
        <TabsList className="grid grid-cols-2 w-fit">
          <TabsTrigger value="manage" className="">Manage</TabsTrigger>
          <TabsTrigger value="buy" className="">Buy</TabsTrigger>
        </TabsList>
        <TabsContent value="manage" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="">
            <CardHeader className=""><CardTitle className="">Create Pool</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="" htmlFor="mint">Token</Label>
                <Input className="" id="mint" type="text" placeholder="Mint address" value={selectedMint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMint(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Paste your token mint or select one below.</p>
              </div>
              <div>
                <Label className="" htmlFor="price">Unit Price (SOL per token)</Label>
                <Input className="" id="price" type="number" value={unitPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnitPrice(e.target.value)} />
              </div>
              <Button onClick={handleCreatePool} className="w-full">Create Pool</Button>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader className=""><CardTitle className="">Add Liquidity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="" htmlFor="mint2">Token Mint</Label>
                <Input className="" id="mint2" type="text" placeholder="Mint address" value={selectedMint} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedMint(e.target.value)} />
              </div>
              <div>
                <Label className="" htmlFor="amount">Amount</Label>
                <Input className="" id="amount" type="number" value={liquidityAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiquidityAmount(e.target.value)} />
              </div>
              <Button onClick={handleAddLiquidity} className="w-full">Deposit</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buy" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="">
            <CardHeader className=""><CardTitle className="">Select Pool</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {pools.map(pool => (
                  <div key={pool.id} className={`p-3 rounded-lg border cursor-pointer ${selectedPoolId === pool.id ? 'bg-muted' : ''}`} onClick={() => setSelectedPoolId(pool.id)}>
                    <div className="flex justify-between">
                      <div className="font-medium">{pool.metadata?.name} ({pool.metadata?.symbol})</div>
                      <div className="text-sm text-muted-foreground">{pool.totalLiquidity.toLocaleString()} tokens</div>
                    </div>
                    <div className="text-sm">Price: {pool.unitPrice} SOL</div>
                  </div>
                ))}
                {pools.length === 0 && <div className="text-sm text-muted-foreground">No pools yet.</div>}
              </div>
              <div>
                <Label className="" htmlFor="buyAmount">Amount to Buy</Label>
                <Input className="" id="buyAmount" type="number" value={buyAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuyAmount(e.target.value)} />
              </div>
              <Button onClick={handleBuy} className="w-full">Buy</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
