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

type SearchResult = {
  success: boolean;
  salt?: string;
  message?: string;
};

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
  const [startSalt, setStartSalt] = useState<string>("");
  const [batchSize, setBatchSize] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<SearchResult>({ success: false });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ searched: number; currentBatch: number }>({
    searched: 0,
    currentBatch: 0
  });
  const [buttonText, setButtonText] = useState("Connect Wallet");

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: sepolia.id });
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    setButtonText(isConnected ? "Find Vanity Address" : "Connect Wallet");
  }, [isConnected]);

  const searchBatch = async (
    start: number,
    size: number,
    suffix: string
  ): Promise<SearchResult> => {
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
      
      setProgress(prev => ({
        ...prev,
        searched: prev.searched + size,
        currentBatch: prev.currentBatch + 1
      }));
      
      return data;
    } catch (err) {
      console.error('Error searching batch:', err);
      throw err;
    }
  };

  const handleNextStep = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchBatch(parseInt(startSalt), batchSize, contractSuffix);
      setResult(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="outfit-font">
      <section className="relative min-h-screen flex items-center justify-center py-20 bg-gradient-to-bl from-black via-black to-gray-500 rounded-b-[10px]">
        <div className="container px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="p-6 bg-gray-900/50 border border-gray-800 backdrop-blur-sm rounded-2xl shadow-xl">
              <Button
                onClick={handleNextStep}
                className="w-full bg-gray-600 hover:bg-gray-700"
                disabled={!isConnected || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Searching for address...</span>
                  </div>
                ) : (
                  buttonText
                )}
              </Button>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
} 