import Airdrop from "@/components/Airdrop";
import Transfer from "@/components/Transfer";
import BurnToken from "@/components/BurnToken";
import CloseTokenAccount from "@/components/CloseTokenAccount";
import BalanceCard from "@/components/BalanceCard";
import { CreateToken } from "@/components/CreateToken";
import { RevokeAuthority } from "@/components/RevokeAuthority";

const HomePage = () => {
  return (
    <main className="w-full flex md:flex-row flex-col px-10 lg:px-30 py-8">
      <div className="flex flex-col flex-1">
        <BalanceCard />
        <Airdrop />
        <Transfer />
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
