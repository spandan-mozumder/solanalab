import Airdrop from "@/components/Airdrop";
import Transfer from "@/components/Transfer";
import BurnToken from "@/components/BurnToken";
import CloseTokenAccount from "@/components/CloseTokenAccount";
import BalanceCard from "@/components/BalanceCard";
import { CreateToken } from "@/components/CreateToken";
import { RevokeAuthority } from "@/components/RevokeAuthority";
import CreateNFT from "@/components/CreateNFT";

const HomePage = () => {
  return (
    <main className="w-full flex xl:flex-row flex-col md:px-20 lg:px-40 px-5 py-8">
      <div className="flex flex-col flex-1">
        <BalanceCard />
        <Airdrop />
        <Transfer />
        <CreateNFT />
      </div>
      <div className="flex flex-col flex-1">
        <CreateToken />
        <RevokeAuthority />
        <BurnToken />
        <CloseTokenAccount />
      </div>
    </main>
  );
};

const HomePage_default = HomePage;
export { HomePage_default as default };
