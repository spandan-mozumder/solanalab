import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, AccountLayout, getMint } from "@solana/spl-token";
import { Metaplex } from "@metaplex-foundation/js";

export interface BlockchainNFT {
  mintAddress: string;
  metadata: {
    name: string;
    description: string;
    image: string;
    attributes?: Array<{ trait_type: string; value: string }>;
  };
  isListed: boolean;
  listingId?: string;
}

export interface BlockchainToken {
  mintAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  image?: string;
  isListed: boolean;
  listingId?: string;
}

export class BlockchainDataService {
  private connection: Connection;
  private metaplex: Metaplex;

  constructor(connection: Connection) {
    this.connection = connection;
    this.metaplex = new Metaplex(connection);
  }

  async getUserNFTs(walletAddress: PublicKey): Promise<BlockchainNFT[]> {
    try {
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(walletAddress, {
        programId: TOKEN_PROGRAM_ID,
      });

      const nfts: BlockchainNFT[] = [];

      for (const tokenAccountInfo of tokenAccounts.value) {
        try {
          const tokenAccountData = AccountLayout.decode(tokenAccountInfo.account.data);
          const mintAddress = new PublicKey(tokenAccountData.mint);
          
          
          const mintInfo = await getMint(this.connection, mintAddress);
          
          if (mintInfo.supply === BigInt(1) && mintInfo.decimals === 0) {
            
            try {
              const metadataAccount = this.metaplex
                .nfts()
                .pdas()
                .metadata({ mint: mintAddress });

              const metadataAccountInfo = await this.connection.getAccountInfo(metadataAccount);
              
              if (metadataAccountInfo) {
                
                const nft = await this.metaplex.nfts().findByMint({ mintAddress });
                
                if (nft.jsonLoaded) {
                  nfts.push({
                    mintAddress: mintAddress.toString(),
                    metadata: {
                      name: nft.name || "Unnamed NFT",
                      description: nft.json?.description || "No description",
                      image: nft.json?.image || "",
                      attributes: nft.json?.attributes?.map((attr: any) => ({
                        trait_type: attr.trait_type || attr.name || "",
                        value: attr.value?.toString() || "",
                      })) || [],
                    },
                    isListed: false, 
                  });
                } else {
                  
                  nfts.push({
                    mintAddress: mintAddress.toString(),
                    metadata: {
                      name: nft.name || "Unnamed NFT",
                      description: "NFT metadata not available",
                      image: "",
                      attributes: [],
                    },
                    isListed: false,
                  });
                }
              }
            } catch (metadataError) {
              console.log(`Could not fetch metadata for NFT ${mintAddress.toString()}:`, metadataError);
              
              nfts.push({
                mintAddress: mintAddress.toString(),
                metadata: {
                  name: `NFT ${mintAddress.toString().slice(0, 8)}...`,
                  description: "Metadata not available",
                  image: "",
                  attributes: [],
                },
                isListed: false,
              });
            }
          }
        } catch (tokenError) {
          console.log("Error processing token account:", tokenError);
          continue;
        }
      }

      return nfts;
    } catch (error) {
      console.error("Error fetching user NFTs:", error);
      return [];
    }
  }

  
  async getUserTokens(walletAddress: PublicKey): Promise<BlockchainToken[]> {
    try {
      
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(walletAddress, {
        programId: TOKEN_PROGRAM_ID,
      });

      const tokens: BlockchainToken[] = [];

      for (const tokenAccountInfo of tokenAccounts.value) {
        try {
          const tokenAccountData = AccountLayout.decode(tokenAccountInfo.account.data);
          const mintAddress = new PublicKey(tokenAccountData.mint);
          const balance = Number(tokenAccountData.amount);

          
          if (balance === 0) continue;

          
          const mintInfo = await getMint(this.connection, mintAddress);

          
          if (mintInfo.supply === BigInt(1) && mintInfo.decimals === 0) continue;

          try {
            
            const metadataAccount = this.metaplex
              .nfts()
              .pdas()
              .metadata({ mint: mintAddress });

            const metadataAccountInfo = await this.connection.getAccountInfo(metadataAccount);
            
            let tokenName = `Token ${mintAddress.toString().slice(0, 8)}...`;
            let tokenSymbol = "UNKNOWN";
            let tokenImage = "";

            if (metadataAccountInfo) {
              try {
                const tokenMetadata = await this.metaplex.nfts().findByMint({ mintAddress });
                tokenName = tokenMetadata.name || tokenName;
                tokenSymbol = tokenMetadata.symbol || tokenSymbol;
                
                
                if (tokenMetadata.json?.image) {
                  tokenImage = tokenMetadata.json.image;
                }
              } catch (metadataError) {
                console.log(`Could not load metadata for token ${mintAddress.toString()}`);
              }
            }

            tokens.push({
              mintAddress: mintAddress.toString(),
              symbol: tokenSymbol,
              name: tokenName,
              decimals: mintInfo.decimals,
              balance: balance,
              image: tokenImage,
              isListed: false, 
            });
          } catch (metadataError) {
            
            tokens.push({
              mintAddress: mintAddress.toString(),
              symbol: `T${mintAddress.toString().slice(0, 4)}`,
              name: `Token ${mintAddress.toString().slice(0, 8)}...`,
              decimals: mintInfo.decimals,
              balance: balance,
              image: "", 
              isListed: false,
            });
          }
        } catch (tokenError) {
          console.log("Error processing token account:", tokenError);
          continue;
        }
      }

      return tokens;
    } catch (error) {
      console.error("Error fetching user tokens:", error);
      return [];
    }
  }

  
  async getNFTMetadata(mintAddress: string) {
    try {
      const mint = new PublicKey(mintAddress);
      const nft = await this.metaplex.nfts().findByMint({ mintAddress: mint });
      
      return {
        name: nft.name || "Unnamed NFT",
        description: nft.json?.description || "No description",
        image: nft.json?.image || "",
        attributes: nft.json?.attributes?.map((attr: any) => ({
          trait_type: attr.trait_type || attr.name || "",
          value: attr.value?.toString() || "",
        })) || [],
      };
    } catch (error) {
      console.error("Error fetching NFT metadata:", error);
      return {
        name: "Unnamed NFT",
        description: "Metadata not available",
        image: "",
        attributes: [],
      };
    }
  }
}


let blockchainDataService: BlockchainDataService | null = null;

export function getBlockchainDataService(connection: Connection): BlockchainDataService {
  if (!blockchainDataService) {
    blockchainDataService = new BlockchainDataService(connection);
  }
  return blockchainDataService;
}