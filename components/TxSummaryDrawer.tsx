"use client";
import { useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { ComputeBudgetProgram, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExplorerTxLink } from "@/components/ui/explorer-link";
import { CopyButton } from "@/components/ui/copy-button";

type TxSummary = {
  signature: string;
  slot: number | null;
  blockTime: number | null;
  feeLamports: number | null;
  computeUnitsConsumed?: number;
  computeBudgetSet?: boolean;
  computeUnitPriceMicroLamports?: number;
  priorityFeeLamports?: number;
  instructions: Array<{
    programId: string;
    description: string;
  }>;
};

function hasComputeBudgetInstruction(message: any): boolean {
  try {
    const programIdStr = ComputeBudgetProgram.programId.toBase58();
    return (message.instructions || []).some((ix: any) => {
      const pid = message.staticAccountKeys?.[ix.programIdIndex] || message.accountKeys?.[ix.programIdIndex];
      const pidStr = typeof pid?.toBase58 === "function" ? pid.toBase58() : String(pid);
      return pidStr === programIdStr;
    });
  } catch {
    return false;
  }
}

function formatLamports(l: number | null | undefined) {
  if (!l && l !== 0) return "–";
  return `${(l / LAMPORTS_PER_SOL).toFixed(6)} SOL`;
}

export function TxSummaryDrawer() {
  const { connection } = useConnection();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TxSummary | null>(null);
  const [lastSig, setLastSig] = useState<string | null>(null);

  useEffect(() => {
    const val = typeof window !== "undefined" ? localStorage.getItem("lastTxSig") : null;
    setLastSig(val);
  }, [open]);

  useEffect(() => {
    const onUpdate = () => {
      const v = localStorage.getItem("lastTxSig");
      setLastSig(v);
    };
    window.addEventListener("last-tx-updated", onUpdate as EventListener);
    return () => window.removeEventListener("last-tx-updated", onUpdate as EventListener);
  }, []);

  const fetchSummary = async (sig: string) => {
    try {
      setLoading(true);
      const tx = await connection.getTransaction(sig, {
        maxSupportedTransactionVersion: 0,
      } as any);
      if (!tx) {
        setSummary({
          signature: sig,
          slot: null,
          blockTime: null,
          feeLamports: null,
          instructions: [],
        });
        return;
      }
      const message = tx.transaction.message;
      const instructions = (message.instructions as any[]).map((ix: any) => {
        const pid = (message as any).staticAccountKeys?.[ix.programIdIndex] || (message as any).accountKeys?.[ix.programIdIndex];
        const pidStr: string = typeof pid?.toBase58 === "function" ? pid.toBase58() : String(pid);
        let desc = "Instruction";
        try {
          if (pidStr === SystemProgram.programId.toBase58()) desc = "System";
          else if (pidStr === TOKEN_PROGRAM_ID.toBase58()) desc = "SPL Token";
          else if (pidStr === ComputeBudgetProgram.programId.toBase58()) desc = "Compute Budget";
          else if (pidStr === "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s") desc = "Token Metadata";
        } catch {}
        return { programId: pidStr, description: desc };
      });
      const computeBudgetSet = hasComputeBudgetInstruction(message as any);
      const feeLamports = tx.meta?.fee ?? null;
      const computeUnitsConsumed = (tx.meta as any)?.computeUnitsConsumed ?? undefined;
      let priorityFeeLamports: number | undefined;
      let computeUnitPriceMicroLamports: number | undefined;
      // Without decoding, we cannot get price; leave undefined
      setSummary({
        signature: sig,
        slot: tx.slot ?? null,
        blockTime: tx.blockTime ?? null,
        feeLamports,
        computeUnitsConsumed,
        computeBudgetSet,
        computeUnitPriceMicroLamports,
        priorityFeeLamports,
        instructions,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && lastSig) fetchSummary(lastSig);
  }, [open, lastSig]);

  const blockTimeStr = useMemo(() => {
    if (!summary?.blockTime) return "–";
    try {
      return new Date(summary.blockTime * 1000).toLocaleString();
    } catch {
      return String(summary.blockTime);
    }
  }, [summary?.blockTime]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!lastSig}>Last Tx</Button>
      </DrawerTrigger>
      <DrawerContent className="">
        <DrawerHeader className="">
          <DrawerTitle className="">Transaction Summary</DrawerTitle>
          <DrawerDescription className="">Recent submitted transaction details</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 space-y-3">
          {!summary || loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Signature</div>
              <div className="flex items-center gap-2">
                <code className="text-xs break-all">{summary.signature}</code>
                <CopyButton value={summary.signature} />
                <ExplorerTxLink signature={summary.signature}>Open in Explorer</ExplorerTxLink>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Slot</div>
                  <div>{summary.slot ?? "–"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Block time</div>
                  <div>{blockTimeStr}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Network fee</div>
                  <div>{formatLamports(summary.feeLamports)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Priority fee</div>
                  <div>{formatLamports(summary.priorityFeeLamports)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CU consumed</div>
                  <div>{summary.computeUnitsConsumed ?? "–"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">CU price (micro-lamports)</div>
                  <div>{summary.computeUnitPriceMicroLamports !== undefined ? String(summary.computeUnitPriceMicroLamports) : (summary.computeBudgetSet ? "set (undecoded)" : "–")}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm text-muted-foreground mb-1">Instructions</div>
                <ul className="list-disc pl-5 text-sm">
                  {summary.instructions.map((i, idx) => (
                    <li key={idx}>
                      <span className="text-muted-foreground">{i.description}</span> — {i.programId}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        <DrawerFooter className="">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => lastSig && fetchSummary(lastSig)} disabled={!lastSig || loading}>Refresh</Button>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default TxSummaryDrawer;
