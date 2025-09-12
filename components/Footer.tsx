"use client";
function Footer() {
  return <footer className="w-full py-6 px-10 lg:px-30 border-t border-transparent/10">
      <div className="text-sm text-muted-foreground flex items-center justify-between">
        <div>© {(/* @__PURE__ */ new Date()).getFullYear()} SolanaLab</div>
        <div className="opacity-80">Built on Solana • Privacy-focused</div>
      </div>
    </footer>;
}
export {
  Footer as default
};
