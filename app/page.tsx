import Airdrop from "@/components/Airdrop";
import Transfer from "@/components/Transfer";
import CreateToken from "@/components/CreateToken";
import BurnToken from "@/components/BurnToken";
import BalanceCard from "@/components/BalanceCard";
import React from "react";

const HomePage = () => {
  return (
    <main className="w-full flex gap-5 md:flex-row sm:flex-col px-10 lg:px-30 py-8">
      <div className="flex flex-col gap-5 flex-1">
        <BalanceCard />
        <Airdrop />
        <Transfer />
      </div>
      <div className="flex flex-col gap-5 flex-1">
        <CreateToken />
        <BurnToken /> 
      </div>
       
    </main>
  );
};

export default HomePage;
