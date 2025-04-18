'use client';

import VanityAddressFinder from '@/components/VanityAddressFinder';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Deploy from '../comp/deploy';

export default function VanityFinderPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Ethereum Vanity Address Finder</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          This tool helps you find a salt value that will generate a contract address with your desired suffix.
          For example, you can search for addresses ending with "b00b5".
        </p>
        <ConnectButton />
        <VanityAddressFinder />

        <Deploy />
        
        <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Enter your desired address suffix (e.g., "b00b5")</li>
            <li>Set a starting salt value and batch size</li>
            <li>Click "Find Vanity Address" to start the search</li>
            <li>The tool will search through possible salt values to find one that generates an address with your desired suffix</li>
            <li>When a match is found, you can use the generated deployment script to deploy your contract with the vanity address</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 