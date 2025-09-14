import { Funnel_Display } from "next/font/google";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ThemeProvider } from "./ThemeProvider";
import SolanaProvider from "./SolanaProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "react-hot-toast";

const funnelDisplay = Funnel_Display({
  variable: "--font-funnel-display",
  subsets: ["latin"],
});
const metadata = {
  title: "SolanaLab",
  description: "A playground for Solana developers to experiment and play with Solana transactions.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${funnelDisplay.className} ${funnelDisplay.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SolanaProvider>
            <div className="bg-gradient-hero w-full flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster />
            </div>
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
export { RootLayout as default, metadata };
