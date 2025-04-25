import { Worker } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { NextResponse } from 'next/server';

// Number of CPU cores to use (leave one free for system)
const numCPUs = Math.max(1, os.cpus().length - 1);

// Keep track of active searches
const activeSearches = new Map();

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      targetSuffix = "b00b5", 
      vanityDeployerAddress,
      bytecodeHash,
      startSalt = 0,
      batchSize = 1000000
    } = body;
    
    if (!vanityDeployerAddress || !bytecodeHash) {
      return NextResponse.json(
        { error: 'VanityDeployerAddress and bytecodeHash are required' },
        { status: 400 }
      );
    }
    
    // Generate a unique search ID
    const searchId = Date.now().toString();
    
    // Start the search process
    const searchPromise = startSaltSearch(
      searchId,
      targetSuffix,
      vanityDeployerAddress,
      bytecodeHash,
      startSalt,
      batchSize
    );
    
    // Store the search promise
    activeSearches.set(searchId, searchPromise);
    
    // Return immediately with the search ID
    return NextResponse.json({
      searchId,
      message: `Search started for address ending with ${targetSuffix}`,
      status: 'searching',
      numWorkers: numCPUs
    });
    
  } catch (error) {
    console.error('Error in search-salt API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check search status
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchId = searchParams.get('id');
  
  if (!searchId) {
    return NextResponse.json(
      { error: 'Search ID is required' },
      { status: 400 }
    );
  }
  
  // Check if the search exists
  if (!activeSearches.has(searchId)) {
    // Check if we have a result file for this search
    const resultsDir = path.join(process.cwd(), 'salt-results');
    const resultPath = path.join(resultsDir, `${searchId}.json`);
    
    if (fs.existsSync(resultPath)) {
      try {
        const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
        return NextResponse.json(result);
      } catch (err) {
        return NextResponse.json(
          { error: 'Failed to read search result', err },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Search not found' },
      { status: 404 }
    );
  }
  
  // Return the current status
  return NextResponse.json({
    searchId,
    status: 'searching',
    message: 'Search is in progress'
  });
}

// Function to start the salt search
async function startSaltSearch(
  searchId,
  targetSuffix,
  vanityDeployerAddress,
  bytecodeHash,
  startSalt,
  batchSize
) {
  console.log(`
=== Starting Vanity Address Search (ID: ${searchId}) ===
Target Suffix: ${targetSuffix}
VanityDeployer: ${vanityDeployerAddress}
Bytecode Hash: ${bytecodeHash}
Using ${numCPUs} CPU cores for search
  `);
  
  // Create directory for worker scripts and results
  const workersDir = path.join(process.cwd(), 'salt-workers');
  const resultsDir = path.join(process.cwd(), 'salt-results');
  
  if (!fs.existsSync(workersDir)) {
    fs.mkdirSync(workersDir, { recursive: true });
  }
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Create worker script
  const workerScriptPath = path.join(workersDir, `worker-${searchId}.js`);
  
  const workerScript = `
    const { parentPort, workerData } = require('worker_threads');
    const { ethers } = require('ethers');
    
    const { id, deployerAddress, bytecodeHash, targetSuffix, startSalt, endSalt } = workerData;
    
    // Start the search
    const workerStartTime = Date.now();
    let lastReportTime = workerStartTime;
    let count = 0;
    
    // Search through the assigned range
    for (let salt = startSalt; salt < endSalt; salt++) {
      // Convert salt to hex format padded to 32 bytes
      const saltHex = "0x" + salt.toString(16).padStart(64, '0');
      
      // Calculate CREATE2 address
      const address = ethers.utils.getCreate2Address(
        deployerAddress,
        saltHex,
        bytecodeHash
      );
      
      // Check if address ends with our target
      if (address.toLowerCase().endsWith(targetSuffix)) {
        // Found a match!
        parentPort.postMessage({
          type: 'found',
          id: id,
          salt: salt,
          address: address
        });
        process.exit(0);
      }
      
      count++;
      
      // Report progress every 5 seconds
      const now = Date.now();
      if (now - lastReportTime > 5000) {
        const duration = (now - workerStartTime) / 1000;
        const rate = Math.floor(count / duration);
        
        parentPort.postMessage({
          type: 'progress',
          id: id,
          count: count,
          rate: rate
        });
        
        lastReportTime = now;
        count = 0; // Reset count after reporting
      }
    }
    
    // Completed the entire range without finding a match
    parentPort.postMessage({
      type: 'complete',
      id: id,
      startSalt: startSalt,
      endSalt: endSalt
    });
  `;
  
  fs.writeFileSync(workerScriptPath, workerScript);
  
  // Parameters for the search
  const maxBatches = 100; // We'll search up to 100 million salts
  let currentBatch = Math.floor(startSalt / batchSize);
  let activeWorkers = 0;
  
  // For progress reporting
  // let totalChecked = 0;
  
  return new Promise((resolve) => {
    // Function to save the result
    function saveResult(result) {
      const resultPath = path.join(resultsDir, `${searchId}.json`);
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      
      // Clean up worker script
      try {
        fs.unlinkSync(workerScriptPath);
      } catch (err) {
        console.error(`Failed to delete worker script: ${err.message}`);
      }
      
      // Remove from active searches
      activeSearches.delete(searchId);
      
      return result;
    }
    
    // Function to launch a worker
    function launchWorker(workerId) {
      if (currentBatch >= maxBatches) {
        return false; // No more batches to search
      }
      
      const workerStartSalt = currentBatch * batchSize;
      const workerEndSalt = workerStartSalt + batchSize;
      currentBatch++;
      activeWorkers++;
      
      console.log(`Worker ${workerId}: Searching salts ${workerStartSalt.toLocaleString()} to ${workerEndSalt.toLocaleString()}`);
      
      const worker = new Worker(workerScriptPath, {
        workerData: {
          id: workerId,
          deployerAddress: vanityDeployerAddress,
          bytecodeHash: bytecodeHash,
          targetSuffix: targetSuffix,
          startSalt: workerStartSalt,
          endSalt: workerEndSalt
        }
      });
      
      worker.on('message', (message) => {
        if (message.type === 'progress') {
          // Worker is reporting progress
          // totalChecked += message.count;
          console.log(`Worker ${message.id}: Checked ${message.count} salts at ${message.rate}/sec`);
        } else if (message.type === 'complete') {
          // Worker finished its batch without finding a match
          console.log(`Worker ${message.id}: Completed range ${message.startSalt.toLocaleString()} to ${message.endSalt.toLocaleString()}`);
          worker.terminate();
          activeWorkers--;
          
          // Launch a new worker for the next batch
          if (!launchWorker(workerId)) {
            console.log(`Worker ${workerId} finished - no more work available`);
            
            // If all workers are done, resolve the promise
            if (activeWorkers === 0) {
              console.log("\nAll workers have completed their search.");
              console.log(`No matching salt found after searching ${currentBatch * batchSize} salts.`);
              
              const result = {
                searchId,
                success: false,
                status: 'completed',
                message: `No matching salt found after searching ${currentBatch * batchSize} salts.`,
                searchedRange: { startSalt, endSalt: currentBatch * batchSize }
              };
              
              resolve(saveResult(result));
            }
          }
        } else if (message.type === 'found') {
          // A worker found a matching salt!
          console.log(`\n✅ Worker ${message.id} found a matching salt: ${message.salt}`);
          console.log(`Predicted address: ${message.address}`);
          
          // Terminate all workers
          terminateAllWorkers();
          
          const result = {
            searchId,
            success: true,
            status: 'completed',
            salt: message.salt,
            address: message.address,
            deployerAddress: vanityDeployerAddress,
            bytecodeHash: bytecodeHash
          };
          
          resolve(saveResult(result));
        }
      });
      
      worker.on('error', (err) => {
        console.error(`Worker ${workerId} error:`, err);
        worker.terminate();
        activeWorkers--;
        
        // If a worker errors, try to launch a new one
        if (!launchWorker(workerId)) {
          console.log(`Worker ${workerId} finished with error - no more work available`);
          
          // If all workers are done, resolve the promise
          if (activeWorkers === 0) {
            console.log("\nAll workers have completed their search.");
            
            const result = {
              searchId,
              success: false,
              status: 'error',
              message: `Search failed: ${err.message}`,
              searchedRange: { startSalt, endSalt: currentBatch * batchSize }
            };
            
            resolve(saveResult(result));
          }
        }
      });
      
      return true; // Successfully launched worker
    }
    
    // Function to terminate all workers
    function terminateAllWorkers() {
      // This is a simplified version - in a real implementation,
      // you would keep track of all worker instances and terminate them
      process.removeAllListeners();
    }
    
    // Launch workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
      launchWorker(i);
    }
    
    // Set a timeout to prevent hanging searches
    setTimeout(() => {
      terminateAllWorkers();
      
      const result = {
        searchId,
        success: false,
        status: 'timeout',
        message: 'Search timed out after 5 minutes',
        searchedRange: { startSalt, endSalt: currentBatch * batchSize }
      };
      
      resolve(saveResult(result));
    }, 5 * 60 * 1000); // 5 minutes timeout
  });
}

// // Helper function to create a deployment script
// function createDeploymentScript(contractInfo, salt, tokenName, tokenSymbol, tokenDecimals, tokenSupply, targetSuffix) {
//   const deployScript = `
//   // deploy-${tokenSymbol.toLowerCase()}-${targetSuffix}.js
//   const { ethers } = require("hardhat");
  
//   async function main() {
//     const [deployer] = await ethers.getSigners();
//     console.log("Deploying with account:", deployer.address);
    
//     // Connect to the VanityContractDeployer for this specific token
//     const vanityDeployer = await ethers.getContractAt(
//       "VanityContractDeployer", 
//       "${contractInfo.vanityDeployerAddress}"
//     );
    
//     // Deploy with the found salt
//     console.log("\\nDeploying token with salt: ${salt}");
//     console.log("- Name: ${tokenName}");
//     console.log("- Symbol: ${tokenSymbol}");
//     console.log("- Decimals: ${tokenDecimals}");
//     console.log("- Supply: ${tokenSupply}");
    
//     const tx = await vanityDeployer.deployWithSalt(${salt});
//     console.log("Transaction hash:", tx.hash);
//     console.log("Waiting for transaction confirmation...");
//     const receipt = await tx.wait();
    
//     // Get the deployed token address from the event
//     const deployedEvent = receipt.events.find(e => e.event === "TargetContractDeployed");
//     const tokenAddress = deployedEvent.args.deployedAddress;
    
//     console.log("\\n✅ SUCCESS! Token deployed with address:");
//     console.log(\`   \${tokenAddress}\`);
    
//     // Verify the address ends with our target suffix
//     if (tokenAddress.toLowerCase().endsWith("${targetSuffix}")) {
//       console.log("✅ Address correctly ends with: ${targetSuffix}");
//     } else {
//       console.log("❌ WARNING: Address does NOT end with: ${targetSuffix}");
//       console.log("   This suggests an inconsistency in the CREATE2 implementation.");
//     }
    
//     // Connect to the deployed token
//     const WinkToken = await ethers.getContractFactory("WinkToken");
//     const winkToken = await WinkToken.attach(tokenAddress);
    
//     // Verify token details
//     const name = await winkToken.name();
//     const symbol = await winkToken.symbol();
//     const decimals = await winkToken.decimals();
//     const totalSupply = await winkToken.totalSupply();
//     const ownerBalance = await winkToken.balanceOf(deployer.address);
    
//     console.log("\\nToken Details:");
//     console.log(\`- Name: \${name}\`);
//     console.log(\`- Symbol: \${symbol}\`);
//     console.log(\`- Decimals: \${decimals}\`);
//     console.log(\`- Total Supply: \${ethers.utils.formatUnits(totalSupply, decimals)}\`);
//     console.log(\`- Owner Balance: \${ethers.utils.formatUnits(ownerBalance, decimals)}\`);
    
//     console.log("\\nExplorer Link:");
//     console.log(\`https://sepolia.basescan.org/address/\${tokenAddress}\`);
//   }
  
//   main()
//     .then(() => process.exit(0))
//     .catch(error => {
//       console.error(error);
//       process.exit(1);
//     });
//   `;
  
//   try {
//     const scriptsDir = path.join(process.cwd(), "scripts");
//     if (!fs.existsSync(scriptsDir)) {
//       fs.mkdirSync(scriptsDir, { recursive: true });
//     }
    
//     const scriptPath = path.join(scriptsDir, `deploy-${tokenSymbol.toLowerCase()}-${targetSuffix}.js`);
//     fs.writeFileSync(scriptPath, deployScript);
//     console.log(`\nCreated deployment script: ${scriptPath}`);
//   } catch (err) {
//     console.error("Error creating deployment script:", err);
//   }
// } 