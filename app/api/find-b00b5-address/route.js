import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Keep track of used salts
const USED_SALTS_FILE = path.join(process.cwd(), "used-salts.json");

function getUsedSalts() {
  try {
    if (fs.existsSync(USED_SALTS_FILE)) {
      return new Set(JSON.parse(fs.readFileSync(USED_SALTS_FILE, 'utf8')));
    }
  } catch (err) {
    console.error("Error reading used salts:", err);
  }
  return new Set();
}

function addUsedSalt(salt) {
  try {
    const usedSalts = getUsedSalts();
    usedSalts.add(salt);
    fs.writeFileSync(USED_SALTS_FILE, JSON.stringify(Array.from(usedSalts)));
  } catch (err) {
    console.error("Error saving used salt:", err);
  }
}

// API route handler for App Router
export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { targetSuffix = "b00b5", startSalt = 0, endSalt = 100000 } = body;
    
    // Get used salts
    const usedSalts = getUsedSalts();
    
    // Log the search parameters
    console.log(`Searching for address ending with ${targetSuffix} (salts ${startSalt}-${endSalt})`);
    console.log(`Excluding ${usedSalts.size} previously used salts`);
    
    // Get contract info
    const contractInfo = await getContractInfo();
    
    // Search through the assigned range
    const startTime = Date.now();
    let count = 0;
    
    for (let salt = startSalt; salt < endSalt; salt++) {
      // Skip if salt was already used
      if (usedSalts.has(salt.toString())) {
        continue;
      }

      // Convert salt to hex format padded to 32 bytes
      const saltHex = ethers.utils.hexZeroPad(ethers.utils.hexlify(salt), 32);
      
      // Calculate CREATE2 address
      const address = ethers.utils.getCreate2Address(
        contractInfo.vanityDeployerAddress,
        saltHex,
        contractInfo.bytecodeHash
      );
      
      // Check if address ends with our target
      if (address.toLowerCase().endsWith(targetSuffix)) {
        // Found a match!
        console.log(`Found matching salt: ${salt}`);
        console.log(`Predicted address: ${address}`);
        
        // Add to used salts before saving
        addUsedSalt(salt.toString());
        
        // Save the salt information
        const saltInfo = {
          salt: salt,
          deployerAddress: contractInfo.vanityDeployerAddress,
          bytecodeHash: contractInfo.bytecodeHash,
          predictedAddress: address
        };
        
        try {
          const saltInfoPath = path.join(process.cwd(), "found-salt-info.json");
          fs.writeFileSync(saltInfoPath, JSON.stringify(saltInfo, null, 2));
          
          // Create a deployment script with the found salt
          createDeploymentScript(contractInfo, salt);
        } catch (err) {
          console.error("Error saving salt info:", err);
          // Continue even if we can't save to the filesystem
        }
        
        return NextResponse.json({
          success: true,
          salt: salt,
          address: address,
          deployerAddress: contractInfo.vanityDeployerAddress,
          bytecodeHash: contractInfo.bytecodeHash
        });
      }
      
      count++;
      
      // Periodically check elapsed time to avoid timeouts
      if (count % 10000 === 0) {
        const elapsed = Date.now() - startTime;
        // If we're approaching 10 seconds, return a partial result
        if (elapsed > 8000) {
          return NextResponse.json({
            success: false,
            message: `Timeout approaching. Searched ${count.toLocaleString()} salts without finding a match.`,
            searchedRange: { startSalt, currentSalt: salt, endSalt }
          });
        }
      }
    }
    
    // Completed the entire range without finding a match
    return NextResponse.json({
      success: false,
      message: `No matching salt found in range ${startSalt}-${endSalt}`,
      searchedRange: { startSalt, endSalt }
    });
    
  } catch (error) {
    console.error('Error in find-b00b5-address API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get contract information
async function getContractInfo() {
  // In a real implementation, you would:
  // 1. Get this from a database
  // 2. Or from environment variables
  // 3. Or from a cached file
  
  try {
    const infoPath = path.join(process.cwd(), "goerli-contract-info.json");
    if (fs.existsSync(infoPath)) {
      return JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading contract info:", err);
  }
  
  // Fallback to hardcoded values if file doesn't exist
  return {
    deployerAddress: "0x3ae7F2767111D8700F82122A373792B99d605749", // Example address
    vanityDeployerAddress: "0x5c46E63Bc046Fe1109fAEaEC1A6089236DF463C7", // Example address
    bytecodeHash: "0xfdac7e7671aa51d6411fa89c76f4951e07966e438c23782b4b78408722640925" // Example hash
  };
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
  
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "deploy-with-salt.js");
    
    // Ensure the scripts directory exists
    const scriptsDir = path.join(process.cwd(), "scripts");
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    fs.writeFileSync(scriptPath, deployScript);
    console.log("\nCreated deployment script: scripts/deploy-with-salt.js");
  } catch (err) {
    console.error("Error creating deployment script:", err);
  }
} 