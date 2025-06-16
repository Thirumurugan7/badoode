"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {  CheckCircle2,  XCircle,  Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { parseEther } from "viem";
import ContractABI from "@/app/purchaseSuffix.json";

const CreateWallet = () => {
  const [contractSuffix, setContractSuffix] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [suggestion, setSuggestion] = useState<string[]>([]);
  const [txnHash, setTxnHash] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { address, isConnected } = useAccount();

  // Enhanced hexadecimal validation with error handling
  const isHexadecimal = (str: string) => /^[0-9a-fA-F]+$/.test(str);

  // Improved input handling with async/await
  const handleSuffixChange = (value: string) => {
    setContractSuffix(value);

    // Generate suggestions for both valid and invalid inputs
    const suggestions = generateSuggestions(value, 4);
    setSuggestion(suggestions);
  };

  const generateSuggestions = (input: string, count: number = 3) => {
    const hexChars = "0123456789abcdef";
    const suggestions = [];

    if (isHexadecimal(input)) {
      // For valid hex input, generate related suggestions
      // 1. Keep the same length but vary some characters
      for (let i = 0; i < count / 2; i++) {
        const chars = input.split('');
        // Randomly change 1-2 characters
        const numChanges = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numChanges; j++) {
          const pos = Math.floor(Math.random() * chars.length);
          chars[pos] = hexChars[Math.floor(Math.random() * 16)];
        }
        suggestions.push(chars.join(''));
      }

      // 2. Generate some invalid but similar suggestions
      for (let i = 0; i < count / 2; i++) {
        const chars = input.split('');
        // Replace 1-2 characters with non-hex characters
        const numChanges = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < numChanges; j++) {
          const pos = Math.floor(Math.random() * chars.length);
          chars[pos] = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // Random letter
        }
        suggestions.push(chars.join(''));
      }
    } else {
      // For invalid input, generate both valid and invalid suggestions
      // 1. Generate valid hex suggestions
      for (let i = 0; i < count / 2; i++) {
        const validSuggestion = input
          .split("")
          .map((char) =>
            hexChars.includes(char.toLowerCase())
              ? char
              : hexChars[Math.floor(Math.random() * 16)]
          )
          .join("")
          .toLowerCase();
        suggestions.push(validSuggestion);
      }

      // 2. Generate invalid suggestions
      for (let i = 0; i < count / 2; i++) {
        const invalidSuggestion = input
          .split("")
          .map((char) =>
            Math.random() > 0.5
              ? char
              : String.fromCharCode(97 + Math.floor(Math.random() * 26)) // Random letter
          )
          .join("")
          .toLowerCase();
        suggestions.push(invalidSuggestion);
      }
    }

    return suggestions;
  };

  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const contractAddress = "0x745B31e60f5D8886CbeA44856e5C999a04595511";

  const purchaseSuffix = async () => {
    setIsProcessing(true);
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
        const response = await fetch("/api/generate-wallet", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            suffix: contractSuffix,
            // network: "sepolia",
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setIsSuccess(true);
        const data = await response.json();
        console.log("Wallet generation successful:", data);
        setWalletAddress(data.address);
        setPrivateKey(data.privateKey);
        setTxnHash(tx);
      } catch (error) {
        console.error("Error generating wallet:", error);
        setIsError(true);
        setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
      }
    } catch (error) {
      console.error("Purchase failed:", error);
      setIsError(true);
      setIsProcessing(false);
      setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred");
    }
  };

  // Full state reset function
  const resetForm = () => {
    setContractSuffix("");
    setIsSuccess(false);
    setIsError(false);
    setErrorMessage("");
    setTxnHash("");
    setWalletAddress("");
    setPrivateKey("");
  };

  return (
    <div className="outfit-font">
      <section className="relative min-h-screen flex items-center justify-center py-20 bg-white">
        <div className="container px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-[#10ad71] wendy-font">
              {isSuccess ? "WALLET CREATED!" : "Create Your Personalized Wallet"}
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Create your wallet with a personalized hexadecimal suffix, making
              your wallet address unique and truly yours. Your identity, your
              brand, embedded in the blockchain.
            </p>

            <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 flex flex-col items-center justify-center space-y-6"
                >
                  <div className="w-20 h-20 flex items-center justify-center rounded-full bg-[#10ad71]">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Successfully Created!
                    </h3>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-600">Wallet Address:</p>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(walletAddress);
                            }}
                            className="h-8 px-2 text-xs bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="font-mono text-xs text-gray-700 break-all bg-gray-50 p-2 rounded">
                          {walletAddress}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-600">Private Key:</p>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(privateKey);
                            }}
                            className="h-8 px-2 text-xs bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="font-mono text-xs text-gray-700 break-all bg-gray-50 p-2 rounded">
                          {privateKey}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      window.open(
                        `https://sepolia.etherscan.io/address/${walletAddress}`,
                        "_blank"
                      )
                    }
                    className="mt-4 bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                  >
                    View on Etherscan
                  </Button>
                </motion.div>
              ) : isError ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 flex flex-col items-center justify-center space-y-6"
                >
                  <div className="w-20 h-20 flex items-center justify-center rounded-full bg-red-500">
                    <XCircle className="h-12 w-12 text-white" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-red-500">
                      Transaction Failed!
                    </h3>
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-500 mb-1">
                        Error Details:
                      </p>
                      <p className="font-mono text-xs text-red-600 break-all">
                        {errorMessage || "Unknown error occurred"}
                      </p>
                      {txnHash && (
                        <>
                          <p className="text-sm text-gray-600 mt-3 mb-1">
                            Transaction Hash:
                          </p>
                          <p className="font-mono text-xs text-gray-700 break-all">
                            {txnHash}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={resetForm}
                      className="bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
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
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        View Failed Transaction
                      </Button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <label
                      htmlFor="contractSuffix"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Wallet Address Suffix
                    </label>
                    <Input
                      id="contractSuffix"
                      value={contractSuffix}
                      onChange={(e) => handleSuffixChange(e.target.value)}
                      placeholder="e.g. 420DE2ED69"
                      className="bg-white border-gray-300 text-gray-900 w-full focus:border-[#10ad71] focus:ring-[#10ad71]"
                    />

                    {contractSuffix && (
                      <div className="absolute z-10 mt-1 w-full rounded-md bg-white border border-gray-200 shadow-lg">
                        <div className="p-2 space-y-2">
                          {!isHexadecimal(contractSuffix) && (
                            <div className="flex items-center justify-between px-2 py-1 text-red-500">
                              <span className="font-mono">
                                {contractSuffix}
                              </span>
                              <span className="text-sm">Not available</span>
                            </div>
                          )}

                          <div className="space-y-1">
                            {suggestion.map((suggestion, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() =>
                                  setContractSuffix(suggestion)
                                }
                              >
                                <span className="font-mono text-gray-900">
                                  {suggestion}
                                </span>
                                <span className={`ml-2 text-xs ${isHexadecimal(suggestion) ? 'text-[#10ad71]' : 'text-red-500'}`}>
                                  {isHexadecimal(suggestion) ? 'Available' : 'Not available'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="mt-1 text-xs text-gray-500">
                      This will be appended to your wallet address for
                      easy identification (0-9, a-f)
                    </p>
                  </div>

                  <Button
                    onClick={isConnected ? purchaseSuffix : undefined}
                    className="w-full bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                    disabled={
                      !contractSuffix ||
                      !isHexadecimal(contractSuffix) ||
                      isProcessing ||
                      !isConnected
                    }
                  >
                    {isConnected ? (
                      isProcessing ? (
                        <div className="flex items-center justify-center">
                                {/* <Loader2 className="h-4 w-4 animate-spin" /> */}
                                Creating Wallet...
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          Create Wallet <Wallet className=" h-4 w-4" />
                        </div>
                      )
                    ) : (
                      "Connect Wallet"
                    )}
                  </Button>
                </motion.div>
              )}

              {/* Processing Screen */}
              {isProcessing && (
                <div className="py-10 flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-[#10ad71] rounded-full animate-spin"></div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl wendy-font font-semibold text-gray-900 mb-2">
                      Processing Transaction
                    </h3>
                    <p className="text-gray-600">
                      Please wait while we create your wallet, this might take upto 2 minutes
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreateWallet;