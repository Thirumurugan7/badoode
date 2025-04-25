import { Worker } from "worker_threads";
import fs from "fs";
import os from "os";
import path from "path";

// Number of CPU cores to use
const numCPUs = Math.max(1, os.cpus().length - 1); // Leave one core free for system

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract parameters from request body
    const { targetSuffix = "b00b5", maxBatches = 100, batchSize = 1000000 } = req.body;
    
    // Start the search process
    const result = await findVanityAddress(targetSuffix, maxBatches, batchSize);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in find-b00b5-address API:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function findVanityAddress(targetSuffix, maxBatches, batchSize) {
  console.log(`Using ${numCPUs} CPU cores to find a contract address ending with ${targetSuffix}`);
  
  // Step 1: Get deployment addresses and bytecode hash
  console.log("\nStep 1: Getting contract information from Hardhat...");
  
  // Get contract info (this would need to be adapted to your Next.js environment)
  const contractInfo = await getContractInfo();
  
  console.log("Contract information:");
  console.log(`- Deployer address: ${contractInfo.deployerAddress}`);
  console.log(`- VanityContractDeployer address: ${contractInfo.vanityDeployerAddress}`);
  console.log(`- Bytecode hash: ${contractInfo.bytecodeHash}`);
  
  // Save this information for later use
  const infoPath = path.join(process.cwd(), "goerli-contract-info.json");
  fs.writeFileSync(infoPath, JSON.stringify(contractInfo, null, 2));
  
  // Step 2: Search for a matching salt
  console.log(`\nStep 2: Searching for address ending with: ${targetSuffix}`);
  
  // Create a worker file
  const workerFilePath = path.join(process.cwd(), "worker.js");
  createWorkerFile(workerFilePath);
  
  // Set up search parameters
  let currentBatch = 1;
  let activeWorkers = 0;
  let foundSalt = null;
  
  // Create a promise that will resolve when a salt is found or all batches are searched
  return new Promise((resolve) => {
    // Function to create and launch a worker
    function launchWorker(workerId) {
      if (currentBatch >= maxBatches || foundSalt !== null) {
        return false; // No more batches to search or salt already found
      }
      
      const startSalt = currentBatch * batchSize;
      const endSalt = startSalt + batchSize;
      currentBatch++;
      activeWorkers++;
      
      console.log(`Worker ${workerId}: Searching salts ${startSalt.toLocaleString()} to ${endSalt.toLocaleString()}`);
      
      const worker = new Worker(workerFilePath, {
        workerData: {
          id: workerId,
          deployerAddress: contractInfo.vanityDeployerAddress,
          bytecodeHash: contractInfo.bytecodeHash,
          targetSuffix: targetSuffix,
          startSalt: startSalt,
          endSalt: endSalt
        }
      });
      
      worker.on('message', (message) => {
        if (message.type === 'progress') {
          // Worker is reporting progress
          console.log(`Worker ${message.id}: Checked ${message.count.toLocaleString()} salts at ${message.rate.toLocaleString()}/sec`);
        } else if (message.type === 'complete') {
          // Worker finished its batch without finding a match
          console.log(`Worker ${message.id}: Completed range ${message.startSalt.toLocaleString()} to ${message.endSalt.toLocaleString()}`);
          activeWorkers--;
          
          // Launch a new worker for the next batch
          if (!launchWorker(workerId)) {
            console.log(`Worker ${workerId} finished - no more work available`);
            
            // If all workers are done, resolve the promise
            if (activeWorkers === 0) {
              console.log("\nAll workers have completed their search.");
              console.log(`No matching salt found after searching ${currentBatch * batchSize} salts.`);
              
              // Clean up the worker file
              try { fs.unlinkSync(workerFilePath); } catch (e ) { console.log(e); }
              
              resolve({
                success: false,
                message: `No matching salt found after searching ${currentBatch * batchSize} salts.`
              });
            }
          }
        } else if (message.type === 'found') {
          // A worker found a matching salt!
          console.log(`\n✅ Worker ${message.id} found a matching salt: ${message.salt}`);
          console.log(`Predicted address: ${message.address}`);
          
          foundSalt = message.salt;
          foundAddress = message.address;
          
          // Save the salt information
          const saltInfo = {
            salt: message.salt,
            deployerAddress: contractInfo.vanityDeployerAddress,
            bytecodeHash: contractInfo.bytecodeHash,
            predictedAddress: message.address
          };
          
          const saltInfoPath = path.join(process.cwd(), "found-salt-info.json");
          fs.writeFileSync(saltInfoPath, JSON.stringify(saltInfo, null, 2));
          
          // Create a deployment script with the found salt
          createDeploymentScript(contractInfo, message.salt);
          
          // Clean up the worker file
          try { fs.unlinkSync(workerFilePath); } catch (e) { console.log(e); }
          
          // Resolve the promise with the found salt
          resolve({
            success: true,
            salt: message.salt,
            address: message.address,
            deployerAddress: contractInfo.vanityDeployerAddress,
            bytecodeHash: contractInfo.bytecodeHash
          });
          
          // Terminate all workers
          process.exit(0);
        }
      });
      
      worker.on('error', (err) => {
        console.error(`Worker ${workerId} error:`, err);
        activeWorkers--;
        
        // If a worker errors, try to launch a new one
        if (!launchWorker(workerId)) {
          console.log(`Worker ${workerId} finished with error - no more work available`);
          
          // If all workers are done, resolve the promise
          if (activeWorkers === 0) {
            // Clean up the worker file
            try { fs.unlinkSync(workerFilePath); } catch (e ) { console.log(e); }
            
            resolve({
              success: false,
              message: `No matching salt found after searching ${currentBatch * batchSize} salts.`
            });
          }
        }
      });
      
      return true; // Successfully launched worker
    }
    
    // Launch workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
      launchWorker(i);
    }
  });
}

// Helper function to get contract information
async function getContractInfo() {
  // In a real Next.js API, you might want to:
  // 1. Use a cached version of this information
  // 2. Call a separate service that handles Hardhat interactions
  // 3. Use ethers.js directly with your deployed contracts
  
  // For this example, we'll simulate getting the contract info
  // In a production environment, you'd need to adapt this to your setup
  
  // Check if we already have the contract info
  const infoPath = path.join(process.cwd(), "goerli-contract-info.json");
  if (fs.existsSync(infoPath)) {
    return JSON.parse(fs.readFileSync(infoPath, 'utf8'));
  }
  
  // This is a placeholder - in a real app, you'd need to implement
  // a way to get this information that works in the Next.js environment
  return {
    deployerAddress: "0xYourDeployerAddress",
    tokenFactoryAddress: "0xYourTokenFactoryAddress",
    vanityDeployerAddress: "0xYourVanityDeployerAddress",
    bytecodeHash: "0xYourBytecodeHash"
  };
}

// Helper function to create the worker file
function createWorkerFile(filePath) {
  const workerCode = `
    const { parentPort, workerData } = require('worker_threads');
    const { ethers } = require('ethers');
    
    // Worker thread
    const { id, deployerAddress, bytecodeHash, targetSuffix, startSalt, endSalt } = workerData;
    
    // Start the search
    const workerStartTime = Date.now();
    let lastReportTime = workerStartTime;
    let count = 0;
    
    // Search through the assigned range
    for (let salt = startSalt; salt < endSalt; salt++) {
      // Convert salt to hex format padded to 32 bytes
      const saltHex = ethers.utils.hexZeroPad(ethers.utils.hexlify(salt), 32);
      
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
  
  fs.writeFileSync(filePath, workerCode);
}

// Helper function to create a deployment script
function createDeploymentScript(contractInfo, salt) {
  const deployScript = `
  // deploy-with-salt.js
  const { ethers } = require("hardhat");
  
  async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Connect to the previously deployed VanityContractDeployer
    const vanityDeployer = await ethers.getContractAt(
      "VanityContractDeployer", 
      "${contractInfo.vanityDeployerAddress}"
    );
    
    // Deploy with the found salt
    console.log("Deploying with salt: ${salt}");
    const tx = await vanityDeployer.deployWithSalt(${salt});
    const receipt = await tx.wait();
    
    // Get the deployed token address from the event
    const deployedEvent = receipt.events.find(e => e.event === "TargetContractDeployed");
    const tokenAddress = deployedEvent.args.deployedAddress;
    
    console.log("\\n✅ SUCCESS! Token deployed with vanity address:");
    console.log(\`   \${tokenAddress}\`);
    
    // Connect to the deployed token
    const WinkToken = await ethers.getContractFactory("WinkToken");
    const winkToken = await WinkToken.attach(tokenAddress);
    
    // Verify token details
    const name = await winkToken.name();
    const symbol = await winkToken.symbol();
    const decimals = await winkToken.decimals();
    const totalSupply = await winkToken.totalSupply();
    const ownerBalance = await winkToken.balanceOf(deployer.address);
    
    console.log("\\nToken Details:");
    console.log(\`- Name: \${name}\`);
    console.log(\`- Symbol: \${symbol}\`);
    console.log(\`- Decimals: \${decimals}\`);
    console.log(\`- Total Supply: \${ethers.utils.formatUnits(totalSupply, decimals)}\`);
    console.log(\`- Owner Balance: \${ethers.utils.formatUnits(ownerBalance, decimals)}\`);
    
    console.log("\\nGoerli Explorer Link:");
    console.log(\`https://goerli.etherscan.io/address/\${tokenAddress}\`);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  `;
  
  const scriptPath = path.join(process.cwd(), "scripts", "deploy-with-salt.js");
  
  // Ensure the scripts directory exists
  const scriptsDir = path.join(process.cwd(), "scripts");
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  fs.writeFileSync(scriptPath, deployScript);
  console.log("\nCreated deployment script: scripts/deploy-with-salt.js");
  console.log("Run it with: npx hardhat run scripts/deploy-with-salt.js --network goerli");
} 