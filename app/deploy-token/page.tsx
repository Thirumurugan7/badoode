'use client';

import { Rocket, CheckCircle2, ArrowRight, XCircle, Loader2 } from "lucide-react";
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { parseEther } from "viem";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import ContractABI from "@/app/vanity.json";

// Add proper type for the result state
type SearchResult = {
  success: boolean;
  salt?: string;
  message?: string;
} | null;

export default function VanityFinderPage() {

  const [currentStep, setCurrentStep] = useState(0);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [contractSuffix, setContractSuffix] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [suggestion, setSuggestion] = useState<string[]>([]);
  const [txnHash, setTxnHash] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");

  // const [targetSuffix, setTargetSuffix] = useState('');
  const [startSalt, setStartSalt] = useState(0);
  const [batchSize, setBatchSize] = useState(100000); // Smaller batch size for API
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ searched: number; currentBatch: number }>({
    searched: 0,
    currentBatch: 0
  });


  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { address, isConnected } = useAccount();

  // Enhanced hexadecimal validation with error handling
  const isHexadecimal = (str: string) => /^[0-9a-fA-F]+$/.test(str);

  // Improved input handling with async/await
  const handleSuffixChange = (value: string) => {
    setContractSuffix(value);

    if (!isHexadecimal(value)) {
      const fallbackSuggestions = generateFallbackSuggestions(value, 4); // Generate 4 suggestions
      setSuggestion(fallbackSuggestions);
    } else {
      setSuggestion([]); // Clear suggestions for valid input
    }
  };

  const generateFallbackSuggestions = (input: string, count: number = 3) => {
    const hexChars = "0123456789abcdef";

    const generateSingleSuggestion = () =>
      input
        .split("")
        .map((char) =>
          hexChars.includes(char.toLowerCase())
            ? char
            : hexChars[Math.floor(Math.random() * 16)]
        )
        .join("")
        .toLowerCase();

    return Array.from({ length: count }, generateSingleSuggestion);
  };

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const contractAddress = "0x745B31e60f5D8886CbeA44856e5C999a04595511";

  const purchaseSuffix = async () => {
    try {
      const tx = await writeContractAsync({
        address: contractAddress,
        abi: ContractABI,
        functionName: "suffixPurchase",
        value: parseEther("0.01"), // Convert ETH to wei (e.g., 0.01 ETH)
        chain: sepolia,
        account: address as `0x${string}`,
      });

      await publicClient?.waitForTransactionReceipt({ hash: tx });
      try {
        const response = await fetch("http://localhost:3000/api/deploy-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokenName: tokenName,
            tokenSymbol: tokenSymbol,
            targetSuffix: contractSuffix,
            initialSupply: "8008135",
            decimals: 18,
            network: "goerli",
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setIsSuccess(true);
        const data = await response.json();
        console.log("Deployment successful:", data);
        setTokenAddress(data.tokenAddress);
        setTxnHash(data.tokenAddress);
      } catch (error) {
        console.error("Error deploying token:", error);
        setIsError(true);
        // Add error handling UI feedback here
      }
      // setTxnHash(tx);
      console.log("txnhash", tx);
    } catch (error) {
      console.error("Purchase failed:", error);
      setIsError(true);
    }
  };

  useEffect(() => {
    console.log("isSearching state changed:", isSearching);
  }, [isSearching]);

  const searchBatch = async (
    start: number,
    size: number,
    suffix: string
  ): Promise<SearchResult> => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/find-b00b5-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetSuffix: suffix,
          startSalt: start,
          endSalt: start + size,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API response:", data);
      
      setProgress(prev => ({
        ...prev,
        searched: prev.searched + size,
        currentBatch: prev.currentBatch + 1
      }));
      
      return data;
    } catch (err) {
      console.error('Error searching batch:', err);
      throw err;
    } finally {
      setIsSearching(false);
    }
  };

  const startSearch = async (): Promise<boolean> => {
    setIsSearching(true);
    setResult(null);
    setError(null);
    setProgress({ searched: 0, currentBatch: 0 });
    
    let currentStart = parseInt(String(startSalt));
    const size = parseInt(String(batchSize));
    let found = false;
    
    try {
      while (!found) {
        const batchResult = await searchBatch(currentStart, size, contractSuffix);
        
        if (batchResult?.success) {
          if (batchResult.salt) {
            localStorage.setItem('salt', batchResult.salt);
          }
          setResult(batchResult);
          found = true;
          break;
        }
        
        currentStart += size;
        
        if (progress.currentBatch >= 100) {
          setResult({
            success: false,
            message: `No matching salt found after searching ${progress.searched.toLocaleString()} salts.`
          });
          break;
        }
      }
      
      return found; // Return true if a match was found
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching';
      console.error('Error in search process:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsSearching(false);
    }
  };

  // Update handleNextStep to wait for search completion
  const handleNextStep = async () => {
    if (currentStep === 0) {
      if (!isHexadecimal(contractSuffix)) {
        alert("Address suffix must be a valid hexadecimal value.");
        return;
      }

      try {
        const searchSuccessful = await startSearch();
        if (searchSuccessful) {
          setCurrentStep(currentStep + 1);
        } else {
          alert("Failed to find a matching address. Please try again.");
        }
      } catch (error) {
        console.error("Search failed:", error);
        alert("Search failed. Please try again.");
      }
      return;
    }

    if (currentStep === 1) {
      if (!tokenName || !tokenSymbol) {
        alert("Enter token name and symbol to proceed.");
        return;
      }

      setIsProcessing(true);

      try {
        await purchaseSuffix();
      } catch (error) {
        console.error("Transaction failed:", error);
        alert("Transaction failed. Please try again.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  // Full state reset function
  const resetForm = () => {
    setCurrentStep(0);
    setTokenName("");
    setTokenSymbol("");
    setContractSuffix("");
    setIsSuccess(false);
    setIsError(false);
    setErrorMessage("");
    setTxnHash("");
  };

  return (
    <div className=" outfit-font">
    <section className="relative min-h-screen flex items-center justify-center py-20 bg-gradient-to-bl from-black via-black to-gray-500 rounded-b-[10px]">
      <div className="container px-4 ">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-white">
            {isSuccess ? "TOKEN LAUNCHED!" : "Personalize Your Token"}
          </h2>
          <p className=" text-gray-400 text-center mb-8 ">
            Create your token with a personalized hexadecimal suffix, making
            your token address unique and truly yours. Your identity, your
            brand, embedded in the blockchain.
          </p>

          <Card className="p-6 bg-gray-900/50 border border-gray-800 backdrop-blur-sm rounded-2xl shadow-xl">
            {isSuccess ? (
              /* Success Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center justify-center space-y-6"
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-gray-300 to-white">
                  <CheckCircle2 className="h-12 w-12 text-gray-900" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">
                    Successfully Claimed!
                  </h3>
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 mb-1">Token Name:</p>
                    <p className="font-medium text-white">{tokenName}</p>
                    <p className="text-sm text-gray-400 mt-3 mb-1">
                      Token Symbol:
                    </p>
                    <p className="font-medium text-white">{tokenSymbol}</p>
                    <p className="text-sm text-gray-400 mt-3 mb-1">
                      Personalized Token Address:
                    </p>
                    <p className="font-mono text-xs text-white break-all">
                      {tokenAddress}
                    </p>
                  </div>
                </div>
                {/* <Button
                  onClick={resetForm}
                  className="mt-4 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900"
                >
                  Create Another Token
                </Button> */}
                <Button
                  onClick={() =>
                    window.open(
                      `https://sepolia.etherscan.io/address/${tokenAddress}`,
                      "_blank"
                    )
                  }
                  className="mt-4 bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900"
                >
                  View Transaction
                </Button>
              </motion.div>
            ) : isError ? (
              /* Error Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 flex flex-col items-center justify-center space-y-6"
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-red-400 to-red-600">
                  <XCircle className="h-12 w-12 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-red-400">
                    Transaction Failed!
                  </h3>
                  <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-red-900/50">
                    <p className="text-sm text-red-400 mb-1">
                      Error Details:
                    </p>
                    <p className="font-mono text-xs text-red-300 break-all">
                      {errorMessage || "Unknown error occurred"}
                    </p>
                    {txnHash && (
                      <>
                        <p className="text-sm text-gray-400 mt-3 mb-1">
                          Transaction Hash:
                        </p>
                        <p className="font-mono text-xs text-gray-300 break-all">
                          {txnHash}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={resetForm}
                    className="bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-900"
                  >
                    Try Again
                  </Button>
                  {txnHash && (
                    <Button
                      onClick={() =>
                        window.open(
                          `https://sepolia.etherscan.io/tx/${txnHash}`,
                          "_blank"
                        )
                      }
                      className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                    >
                      View Failed Transaction
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <>
                {/* Progress Indicator */}
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    {[0, 1].map((step) => (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg mb-2
                          ${
                            currentStep === step
                              ? "bg-gradient-to-r from-gray-600 to-gray-800 text-white"
                              : currentStep > step
                              ? "bg-gradient-to-r from-gray-300 to-white text-gray-900"
                              : "bg-gray-800 text-gray-400"
                          }`}
                        >
                          {currentStep > step ? "✓" : step + 1}
                        </div>
                        <span
                          className={`text-xs ${
                            currentStep >= step
                              ? "text-gray-200"
                              : "text-gray-500"
                          }`}
                        >
                          {step === 0
                            ? "Personalize token address"
                            : "Token Details"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-4 mb-2">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800 rounded-full"></div>
                    <div
                      className="absolute top-0 left-0 h-1 bg-gradient-to-r from-gray-500 to-white rounded-full transition-all duration-300"
                      style={{ width: currentStep === 0 ? "50%" : "100%" }}
                    ></div>
                  </div>
                </div>

                {/* Step 1: Token Details */}
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="relative">
                      <label
                        htmlFor="contractSuffix"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Token Address Suffix
                      </label>
                      <Input
                        id="contractSuffix"
                        value={contractSuffix}
                        onChange={(e) => handleSuffixChange(e.target.value)}
                        placeholder="e.g. 420DE2ED69"
                        className="bg-gray-800 border-gray-700 text-white w-full"
                      />

                      {contractSuffix && !isHexadecimal(contractSuffix) && (
                        <div className="absolute z-10 mt-1 w-full rounded-md bg-gray-800 border border-gray-700 shadow-lg">
                          <div className="p-2 space-y-2">
                            {/* Current invalid input display */}
                            <div className="flex items-center justify-between px-2 py-1 text-red-400">
                              <span className="font-mono">
                                {contractSuffix}
                              </span>
                              <span className="text-sm">Not available</span>
                            </div>

                            {/* Suggestions header */}
                            {/* <div className="px-2 text-xs font-medium text-gray-400">
                              Available suggestions:
                            </div> */}

                            {/* Suggestions list */}
                            <div className="space-y-1">
                              {suggestion.map((suggestion, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-700/50 transition-colors"
                                  onClick={() =>
                                    setContractSuffix(suggestion)
                                  }
                                >
                                  <span className="font-mono text-white">
                                    {suggestion}
                                  </span>
                                  <span className="ml-2 text-xs text-green-400">
                                    Available
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="mt-1 text-xs text-gray-400">
                        This will be appended to your token address for
                        easy identification
                      </p>
                    </div>

                    <Button
                      onClick={isConnected ? handleNextStep : undefined}
                      className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={
                        !contractSuffix ||
                        !isHexadecimal(contractSuffix) ||
                        isSearching  ||
                        !isConnected
                      }
                    >
                      {isConnected ? (
                        <>
                          {isSearching ? (
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Searching for address...</span>
                            </div>
                          ) : (
                            'Find Vanity Address'
                          )}
                        </>
                      ) : (
                        "Connect Wallet"
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Contract Configuration */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="tokenName"
                          className="block text-sm font-medium text-gray-300 mb-1"
                        >
                          Token Name
                        </label>
                        <Input
                          id="tokenName"
                          value={tokenName}
                          onChange={(e) => setTokenName(e.target.value)}
                          placeholder="e.g. Degen"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tokenSymbol"
                          className="block text-sm font-medium text-gray-300 mb-1"
                        >
                          Token Symbol
                        </label>
                        <Input
                          id="tokenSymbol"
                          value={tokenSymbol}
                          onChange={(e) => setTokenSymbol(e.target.value)}
                          placeholder="e.g. DGEN"
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleNextStep}
                      disabled={!tokenName || !tokenSymbol || isProcessing}
                      className="w-full bg-gray-600 hover:bg-gray-700"
                    >
                      Launch Token <Rocket className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {/* Processing Screen */}
                {isProcessing && (
                  <div className="py-10 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-gray-700 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-white rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-gray-200 mb-2">
                        Processing Transaction
                      </h3>
                      <p className="text-gray-400">
                        Please wait while we create your token, this might take upto 2 minutes
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </section>
  </div>
  );  
} 