'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface SaltSearchProps {
  onSaltFound: (salt: string, address: string) => void;
}

export default function SaltSearch({ onSaltFound }: SaltSearchProps) {
  const [targetSuffix, setTargetSuffix] = useState('b00b5');
  const [tokenName, setTokenName] = useState('BASE Token');
  const [tokenSymbol, setTokenSymbol] = useState('BASE');
  const [isSearching, setIsSearching] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ searched: 0, rate: 0 });
  const [error, setError] = useState<string | null>(null);

  // Poll for search status when searchId is available
  useEffect(() => {
    if (!searchId || !isSearching) return;
    console.log("progress", progress);
    

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/search-salt?id=${searchId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Poll response:", data);

        if (data.status === 'completed') {
          clearInterval(interval);
          setIsSearching(false);

          if (data.success) {
            // Salt found!
            console.log("Salt found:", data.salt);
            localStorage.setItem('salt', data.salt.toString());
            localStorage.setItem('tokenName', tokenName);
            localStorage.setItem('tokenSymbol', tokenSymbol);
            localStorage.setItem('vanityDeployerAddress', data.deployerAddress);
            onSaltFound(data.salt.toString(), data.address);
          } else {
            setError(data.message || 'Search completed without finding a matching salt');
          }
        } else if (data.status === 'error' || data.status === 'timeout') {
          clearInterval(interval);
          setIsSearching(false);
          setError(data.message || 'Search failed');
        }
      } catch (err) {
        console.error('Error checking search status:', err);
        // Don't clear the interval on network errors - keep trying
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [searchId, isSearching, onSaltFound, tokenName, tokenSymbol]);

  const startSearch = async () => {
    setIsSearching(true);
    setError(null);
    setSearchId(null);
    setProgress({ searched: 0, rate: 0 });

    try {
      const response = await fetch('/api/search-salt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetSuffix,
          tokenName,
          tokenSymbol,
          tokenDecimals: 18,
          tokenSupply: '1000000',
          startSalt: 0,
          batchSize: 1000000
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Search started:", data);
      setSearchId(data.searchId);
    } catch (err) {
      setIsSearching(false);
      setError(err instanceof Error ? err.message : 'Failed to start search');
    }
  };

  // Validate hexadecimal input
  const isHexadecimal = (str: string) => /^[0-9a-fA-F]+$/.test(str);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="targetSuffix" className="block text-sm font-medium text-gray-700 mb-1">
          Target Address Suffix
        </label>
        <Input
          id="targetSuffix"
          value={targetSuffix}
          onChange={(e) => setTargetSuffix(e.target.value)}
          placeholder="e.g. b00b5"
          className="bg-white border-gray-300 text-gray-900"
          disabled={isSearching}
        />
        {targetSuffix && !isHexadecimal(targetSuffix) && (
          <p className="mt-1 text-xs text-red-500">
            Suffix must be a valid hexadecimal value (0-9, a-f)
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tokenName" className="block text-sm font-medium text-gray-700 mb-1">
          Token Name
        </label>
        <Input
          id="tokenName"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          placeholder="e.g. BASE Token"
          className="bg-white border-gray-300 text-gray-900"
          disabled={isSearching}
        />
      </div>

      <div>
        <label htmlFor="tokenSymbol" className="block text-sm font-medium text-gray-700 mb-1">
          Token Symbol
        </label>
        <Input
          id="tokenSymbol"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value)}
          placeholder="e.g. BASE"
          className="bg-white border-gray-300 text-gray-900"
          disabled={isSearching}
        />
      </div>

      <Button
        onClick={startSearch}
        disabled={isSearching || !isHexadecimal(targetSuffix) || !tokenName || !tokenSymbol}
        className="w-full bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
      >
        {isSearching ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching for address...</span>
          </div>
        ) : (
          'Find Vanity Address'
        )}
      </Button>

      {isSearching && (
        <div className="mt-2 text-sm text-gray-600">
          <p>Searching for an address ending with: {targetSuffix}</p>
          <p>This may take several minutes. Please be patient.</p>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
} 