import { toast } from "react-hot-toast";

export interface ErrorHandlerOptions {
  toastId?: string;
  duration?: number;
  action?: string;
  context?: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: "Please connect your wallet to continue",
  INSUFFICIENT_FUNDS: "Insufficient funds for this transaction",
  TRANSACTION_FAILED: "Transaction failed. Please try again",
  NETWORK_ERROR: "Network error. Please check your connection",
  INVALID_INPUT: "Please check your input and try again",
  UPLOAD_FAILED: "Failed to upload file. Please try again",
  METADATA_NOT_FOUND: "Metadata not found for this item",
  UNAUTHORIZED: "You don't have permission to perform this action",
  RATE_LIMITED: "Too many requests. Please wait and try again",
  UNKNOWN_ERROR: "An unexpected error occurred",
  
  TOKEN: {
    CREATION_FAILED: "Failed to create token",
    MINTING_FAILED: "Failed to mint tokens", 
    TRANSFER_FAILED: "Failed to transfer tokens",
    INSUFFICIENT_BALANCE: "Insufficient token balance",
    INVALID_MINT_ADDRESS: "Invalid token mint address",
    MINT_AUTHORITY_REQUIRED: "You need mint authority for this token",
  },
  
  NFT: {
    CREATION_FAILED: "Failed to create NFT",
    UPDATE_FAILED: "Failed to update NFT metadata", 
    TRANSFER_FAILED: "Failed to transfer NFT",
    METADATA_INVALID: "Invalid NFT metadata",
    IMAGE_TOO_LARGE: "Image file must be less than 10MB",
    INVALID_IMAGE: "Please select a valid image file",
  },
  
  MARKETPLACE: {
    LISTING_FAILED: "Failed to create marketplace listing",
    PURCHASE_FAILED: "Failed to complete purchase",
    REMOVE_LISTING_FAILED: "Failed to remove listing",
    INVALID_PRICE: "Please enter a valid price",
    SELF_PURCHASE: "You cannot purchase your own items",
  },
  
  VALIDATION: {
    REQUIRED_FIELDS: "Please fill out all required fields",
    INVALID_ADDRESS: "Please enter a valid Solana address",
    INVALID_AMOUNT: "Please enter a valid amount",
    AMOUNT_TOO_LOW: "Amount must be greater than 0",
    NAME_REQUIRED: "Name is required",
    SYMBOL_REQUIRED: "Symbol is required",
  }
} as const;

export const SUCCESS_MESSAGES = {
  // Token operations
  TOKEN_CREATED: "Token created successfully!",
  TOKEN_MINTED: "Tokens minted successfully!",
  TOKEN_BURNED: "Tokens burned successfully!",
  TOKEN_ACCOUNT_CLOSED: "Token account closed successfully!",
  TRANSFER_COMPLETED: "Transfer completed successfully!",
  
  // NFT operations  
  NFT_CREATED: "NFT created successfully!",
  NFT_UPDATED: "NFT updated successfully!",
  NFT_MINTED: "NFT minted successfully!",
  
  // Upload operations
  METADATA_UPLOADED: "Metadata uploaded successfully!",
  IMAGE_UPLOADED: "Image uploaded successfully!",
} as const;

export const LOADING_MESSAGES = {
  CONNECTING_WALLET: "Connecting wallet...",
  UPLOADING_METADATA: "Uploading metadata to IPFS...",
  UPLOADING_IMAGE: "Uploading image...",
  CREATING_TOKEN: "Creating token on blockchain...",
  MINTING_TOKENS: "Minting tokens...",
  CREATING_NFT: "Creating NFT on blockchain...",
  UPDATING_NFT: "Updating NFT metadata...",
  PROCESSING_TRANSACTION: "Processing transaction...",
  LOADING_DATA: "Loading data...",
  CREATING_LISTING: "Creating marketplace listing...",
  PURCHASING_ITEM: "Processing purchase...",
} as const;

export function handleError(
  error: unknown, 
  options: ErrorHandlerOptions = {}
): void {
  const { toastId, duration = 4000, action = "operation", context } = options;
  
  let message: string;
  let details: any = null;

  if (error instanceof AppError) {
    message = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    message = getErrorMessage(error.message, action);
    details = error.message;
  } else if (typeof error === 'string') {
    message = getErrorMessage(error, action);
  } else {
    message = ERROR_MESSAGES.UNKNOWN_ERROR;
    details = error;
  }

  if (context) {
    console.error(`Error in ${context}:`, { message, details, originalError: error });
  }

  toast.error(message, { 
    id: toastId,
    duration,
    style: {
      maxWidth: '500px',
    }
  });
}

function getErrorMessage(errorText: string, action: string): string {
  const lowerError = errorText.toLowerCase();
  
  if (lowerError.includes('insufficient funds') || lowerError.includes('insufficient lamports')) {
    return ERROR_MESSAGES.INSUFFICIENT_FUNDS;
  }
  
  if (lowerError.includes('user rejected') || lowerError.includes('user denied')) {
    return `${action} was cancelled by user`;
  }
  
  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (lowerError.includes('429') || lowerError.includes('rate limit')) {
    return ERROR_MESSAGES.RATE_LIMITED;
  }
  
  if (lowerError.includes('unauthorized') || lowerError.includes('forbidden')) {
    return ERROR_MESSAGES.UNAUTHORIZED;
  }
  
  if (lowerError.includes('invalid public key') || lowerError.includes('invalid address')) {
    return ERROR_MESSAGES.VALIDATION.INVALID_ADDRESS;
  }

  return `${action} failed: ${errorText}`;
}

export function showSuccessToast(
  message: string, 
  options: { toastId?: string; duration?: number } = {}
): void {
  const { toastId, duration = 3000 } = options;
  
  toast.success(message, { 
    id: toastId,
    duration,
    style: {
      maxWidth: '500px',
    }
  });
}

export function showLoadingToast(
  message: string,
  options: { toastId?: string } = {}
): string {
  const { toastId } = options;
  
  return toast.loading(message, { 
    id: toastId,
    style: {
      maxWidth: '500px',
    }
  });
}

export function validateWalletConnection(publicKey: any): boolean {
  if (!publicKey) {
    handleError(new AppError(ERROR_MESSAGES.WALLET_NOT_CONNECTED));
    return false;
  }
  return true;
}

export function validateRequiredFields(fields: Record<string, any>): boolean {
  const emptyFields = Object.entries(fields).filter(([_, value]) => 
    value === '' || value === null || value === undefined
  );
  
  if (emptyFields.length > 0) {
    handleError(new AppError(ERROR_MESSAGES.VALIDATION.REQUIRED_FIELDS));
    return false;
  }
  return true;
}

export function validateAmount(amount: string | number): boolean {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount) || numAmount <= 0) {
    handleError(new AppError(ERROR_MESSAGES.VALIDATION.AMOUNT_TOO_LOW));
    return false;
  }
  return true;
}

export function validateSolanaAddress(address: string): boolean {
  try {
    const { PublicKey } = require('@solana/web3.js');
    new PublicKey(address);
    return true;
  } catch {
    handleError(new AppError(ERROR_MESSAGES.VALIDATION.INVALID_ADDRESS));
    return false;
  }
}

export class AsyncOperationHandler {
  private toastId: string | null = null;
  private isLoading = false;

  constructor(private setLoading?: (loading: boolean) => void) {}

  async execute<T>(
    operation: () => Promise<T>,
    options: {
      loadingMessage: string;
      successMessage?: string;
      errorAction?: string;
      context?: string;
    }
  ): Promise<T | null> {
    const { loadingMessage, successMessage, errorAction = "operation", context } = options;
    
    if (this.isLoading) {
      return null;
    }

    try {
      this.isLoading = true;
      this.setLoading?.(true);
      this.toastId = showLoadingToast(loadingMessage);

      const result = await operation();

      if (successMessage) {
        showSuccessToast(successMessage, { toastId: this.toastId });
      } else {
        toast.dismiss(this.toastId);
      }

      return result;
    } catch (error) {
      handleError(error, { 
        toastId: this.toastId || undefined, 
        action: errorAction,
        context 
      });
      return null;
    } finally {
      this.isLoading = false;
      this.setLoading?.(false);
      this.toastId = null;
    }
  }
}