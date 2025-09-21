"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { ModeToggle } from "@/components/ModeToggle";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/app/SolanaProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { TxSummaryDrawer } from "@/components/TxSummaryDrawer";
import { toast } from "react-hot-toast";

function NetworkSwitcher() {
  const { network, setNetwork } = useNetwork();
  return (
    <Select value={network} onValueChange={(v: any) => setNetwork(v)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Network" />
      </SelectTrigger>
      <SelectContent className="">
        <SelectItem value="devnet" className="">Devnet</SelectItem>
        <SelectItem value="testnet" className="">Testnet</SelectItem>
        <SelectItem value="mainnet" className="">Mainnet</SelectItem>
      </SelectContent>
    </Select>
  );
}

function Header() {
  const pathname = usePathname();
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [airdropping, setAirdropping] = useState(false);
  const { network } = useNetwork();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }
      setLoadingBalance(true);
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!mounted) return;
        setBalance(lamports / LAMPORTS_PER_SOL);
      } finally {
        if (mounted) setLoadingBalance(false);
      }
    };
    load();
  }, [connection, publicKey]);

  const requestFaucet = async () => {
    if (!publicKey) return;
    if (network !== "devnet") return;
    try {
      setAirdropping(true);
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
      toast.success("Airdrop 1 SOL successful");
      // refresh balance
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429")) {
        toast.error("Devnet faucet rate limit or empty. Try later or faucet.solana.com");
      } else {
        toast.error("Airdrop failed: " + msg);
      }
    } finally {
      setAirdropping(false);
    }
  };

  const nav = useMemo(
    () => [
      { href: "/", label: "Launchpad" },
      { href: "/nft-marketplace-escrow", label: "NFT Marketplace" },
      { href: "/token-liquidity-pool", label: "Liquidate Token" },
    ],
    [],
  );
  return (
    <header className="w-full py-3 px-4 sm:px-6 lg:px-10 xl:px-30 border-b border-transparent/10 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] overflow-hidden shadow-md flex items-center justify-center bg-white/5 shrink-0">
            <Image
              src="/favicon.ico"
              alt="Tasks"
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold truncate">SolanaLab</h1>
            <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-[260px]">
              Your one stop solution for Sol transactions
            </p>
          </div>
        </div>

          <div className="flex items-center gap-2 md:gap-3">
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <Button
                key={item.href}
                asChild
                variant={pathname === item.href ? "secondary" : "ghost"}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
          <div className="hidden md:block">
            <NetworkSwitcher />
          </div>
          <div className="hidden md:block min-w-[140px] text-right">
            {loadingBalance ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="text-sm text-muted-foreground">
                {balance !== null ? `${balance.toFixed(3)} SOL` : "–"}
              </span>
            )}
          </div>
            {network === "devnet" && (
              <Button className="hidden md:inline-flex" variant="outline" size="sm" onClick={requestFaucet} disabled={!publicKey || airdropping}>
                {airdropping ? "Airdropping…" : "Airdrop 1 SOL"}
              </Button>
            )}
          <div className="hidden md:block">
            <TxSummaryDrawer />
          </div>
          <ModeToggle />
          <div className="hidden md:block">
            <WalletMultiButton />
          </div>

            {/* Mobile menu */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader className="">
                    <SheetTitle className="">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-3 p-4">
                    <WalletMultiButton />
                    <NetworkSwitcher />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Balance</div>
                      {loadingBalance ? (
                        <Skeleton className="h-4 w-24" />
                      ) : (
                        <div className="text-sm">{balance !== null ? `${balance.toFixed(3)} SOL` : "–"}</div>
                      )}
                    </div>
                    {nav.map((item) => (
                      <Button
                        key={item.href}
                        asChild
                        variant={pathname === item.href ? "secondary" : "ghost"}
                      >
                        <Link href={item.href}>{item.label}</Link>
                      </Button>
                    ))}
                    {network === "devnet" && (
                      <Button variant="outline" onClick={requestFaucet} disabled={!publicKey || airdropping}>
                        {airdropping ? "Airdropping…" : "Airdrop 1 SOL"}
                      </Button>
                    )}
                    <TxSummaryDrawer />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
