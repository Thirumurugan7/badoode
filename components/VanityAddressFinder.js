import { useState } from 'react';

export default function VanityAddressFinder() {
  const [targetSuffix, setTargetSuffix] = useState('b00b5');
  const [startSalt, setStartSalt] = useState(0);
  const [batchSize, setBatchSize] = useState(100000); // Smaller batch size for API
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ searched: 0, currentBatch: 0 });

  // Function to search a single batch
  const searchBatch = async (start, size, suffix) => {
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
      
      // Update progress
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

  // Function to start the search process
  const startSearch = async () => {
    setIsSearching(true);
    setResult(null);
    setError(null);
    setProgress({ searched: 0, currentBatch: 0 });
    
    let currentStart = parseInt(startSalt);
    const size = parseInt(batchSize);
    let found = false;
    
    try {
      // Search batches until we find a match or hit an error
      while (!found) {
        const batchResult = await searchBatch(currentStart, size, targetSuffix);
        
        if (batchResult.success) {
          // Found a match!

          localStorage.setItem('salt', batchResult.salt);
          setResult(batchResult);
          found = true;
          break;
        }
        
        // Move to the next batch
        currentStart += size;
        
        // Optional: add a limit to prevent infinite loops
        if (progress.currentBatch >= 100) { // Limit to 100 batches
          setResult({
            success: false,
            message: `No matching salt found after searching ${progress.searched.toLocaleString()} salts.`
          });
          break;
        }
      }
    } catch (err) {
      console.error('Error in search process:', err);
      setError(err.message || 'An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };



  return (
    <div className="p-6 max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">Vanity Contract Address Finder</h2>
      
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Target Address Suffix:</label>
        <input
          type="text"
          value={targetSuffix}
          onChange={(e) => setTargetSuffix(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="e.g., b00b5"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Start Salt:</label>
        <input
          type="number"
          value={startSalt}
          onChange={(e) => setStartSalt(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-300 mb-2">Batch Size:</label>
        <input
          type="number"
          value={batchSize}
          onChange={(e) => setBatchSize(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Smaller batch sizes work better with API timeouts (recommended: 100,000 or less)
        </p>
      </div>
      
      <button
        onClick={startSearch}
        disabled={isSearching}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
      >
        {isSearching ? 'Searching...' : 'Find Vanity Address'}
      </button>
      
      {isSearching && (
        <div className="mt-4">
          <p>Searching... Checked {progress.searched.toLocaleString()} salts so far</p>
          <p>Current batch: {progress.currentBatch}</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded">
          <h3 className="font-bold text-lg mb-2 text-green-800 dark:text-green-200">
            {result.success ? 'Found a matching salt!' : 'Search completed'}
          </h3>
          
          {result.success ? (
            <>
              <p><span className="font-semibold">Salt:</span> {result.salt}</p>
              <p><span className="font-semibold">Address:</span> {result.address}</p>
              <p className="mt-2">
                A deployment script has been created at: <code className="bg-green-100 dark:bg-green-800 px-1 py-0.5 rounded">scripts/deploy-with-salt.js</code>
              </p>
            </>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
} 