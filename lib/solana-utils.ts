export const loadMetaplexUtils = async () => {
  const metaplex = await import("@metaplex-foundation/mpl-token-metadata");
  return {
    createCreateMetadataAccountV3Instruction: metaplex.createCreateMetadataAccountV3Instruction,
    METADATA_PROGRAM_ID: metaplex.PROGRAM_ID,
  };
};

export const loadSplTokenUtils = async () => {
  const splToken = await import("@solana/spl-token");
  return {
    createMint: splToken.createMint,
    createAccount: splToken.createAccount,
    createMintToInstruction: splToken.createMintToInstruction,
    createSetAuthorityInstruction: splToken.createSetAuthorityInstruction,
    AuthorityType: splToken.AuthorityType,
    getMint: splToken.getMint,
    TOKEN_PROGRAM_ID: splToken.TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress: splToken.getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction: splToken.createAssociatedTokenAccountInstruction,
    createTransferInstruction: splToken.createTransferInstruction,
    createBurnInstruction: splToken.createBurnInstruction,
    createCloseAccountInstruction: splToken.createCloseAccountInstruction,
    getAccount: splToken.getAccount,
  };
};