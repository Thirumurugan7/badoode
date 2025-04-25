'use client';

import {  Loader2 } from "lucide-react";
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";

import { useState, useEffect } from "react";


type SearchResult = {
  success: boolean;
  salt?: string;
  message?: string;
};

export default function VanityFinderPage() {

  // const [contractSuffix, setContractSuffix] = useState<string>("");

  const contractSuffix = "";

  // const [startSalt, setStartSalt] = useState<string>("");

  const startSalt = "";

  // const [batchSize, setBatchSize] = useState<number>(1000);

  const batchSize = 1000;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [result, setResult] = useState<SearchResult>({ success: false });
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ searched: number; currentBatch: number }>({
    searched: 0,
    currentBatch: 0
  });
  const [buttonText, setButtonText] = useState("Connect Wallet");

  const {  isConnected } = useAccount();

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
      
      console.log("progress", progress);
      
      return data;
    } catch (err) {
      console.error('Error searching batch:', err);
      throw err;
    }
  };

  const handleNextStep = async () => {
    if (!isConnected) return;

    
    console.log("Searching for address...");
    console.log("error", error);
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await searchBatch(parseInt(startSalt), batchSize, contractSuffix);
      console.log("result", result);
      // setResult(result);
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