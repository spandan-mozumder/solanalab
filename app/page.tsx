import Airdrop from "@/components/Airdrop";
import Transfer from "@/components/Transfer";
import BurnToken from "@/components/BurnToken";
import CloseTokenAccount from "@/components/CloseTokenAccount";
import BalanceCard from "@/components/BalanceCard";
import { CreateToken } from "@/components/CreateToken";

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
        <BurnToken />
        <CloseTokenAccount />
      </div>
    </main>
  );
};
var stdin_default = HomePage;
export { stdin_default as default };
