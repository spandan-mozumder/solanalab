"use client";
import Image from "next/image";
import { ModeToggle } from "@/components/ModeToggle";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

function Header() {
  return (
    <header className="w-full py-4 px-10 lg:px-30 border-b border-transparent/10 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md flex items-center justify-center bg-white/5">
            <Image
              src="/favicon.ico"
              alt="Tasks"
              width={40}
              height={40}
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold">SolanaLab</h1>
            <p className="text-xs text-muted-foreground">
              Your one stop solution for Sol transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModeToggle />
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}

export default Header;
