'use client';

import { ethers } from 'ethers';

// Define ABIs directly in the code
const VanityDeployerABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "salt",
        "type": "uint256"
      }
    ],
    "name": "deployWithSalt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "deployedAddress",
        "type": "address"
      }
    ],
    "name": "TargetContractDeployed",
    "type": "event"
  }
];

const WinkTokenABI = [
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function DeployPage() {
  async function deployContract() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      console.log("Deploying with account:", address);
      
      const vanityDeployer = new ethers.Contract(
        "0x5c46E63Bc046Fe1109fAEaEC1A6089236DF463C7",
        VanityDeployerABI,
        signer
      );
      
      // Add gas estimation with override parameters
      const salt = 274859;
      console.log("Deploying with salt:", salt);
      
      // Try to estimate gas first
      try {
        const gasEstimate = await vanityDeployer.estimateGas.deployWithSalt(salt);
        console.log("Estimated gas:", gasEstimate.toString());
        
        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate.mul(120).div(100);
        
        const tx = await vanityDeployer.deployWithSalt(salt, {
          gasLimit: gasLimit,
        });
        
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        
        const deployedEvent = receipt.events.find(e => e.event === "TargetContractDeployed");
        if (!deployedEvent) {
          throw new Error("Deployment event not found in transaction receipt");
        }
        
        const tokenAddress = deployedEvent.args.deployedAddress;
        console.log("\n✅ SUCCESS! Token deployed with vanity address:");
        console.log(`   ${tokenAddress}`);
        
        const winkToken = new ethers.Contract(tokenAddress, WinkTokenABI, signer);
        
        const name = await winkToken.name();
        const symbol = await winkToken.symbol();
        const decimals = await winkToken.decimals();
        const totalSupply = await winkToken.totalSupply();
        const ownerBalance = await winkToken.balanceOf(address);
        
        console.log("\nToken Details:");
        console.log(`- Name: ${name}`);
        console.log(`- Symbol: ${symbol}`);
        console.log(`- Decimals: ${decimals}`);
        console.log(`- Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
        console.log(`- Owner Balance: ${ethers.utils.formatUnits(ownerBalance, decimals)}`);
        
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        
        // Fallback to manual gas limit if estimation fails
        console.log("Attempting deployment with manual gas limit...");
        const tx = await vanityDeployer.deployWithSalt(salt, {
          gasLimit: 3000000, // Manual gas limit
        });
        
        console.log("Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        
        const deployedEvent = receipt.events.find(e => e.event === "TargetContractDeployed");
        if (!deployedEvent) {
          throw new Error("Deployment event not found in transaction receipt");
        }
        
        const tokenAddress = deployedEvent.args.deployedAddress;
        console.log("\n✅ SUCCESS! Token deployed with vanity address:");
        console.log(`   ${tokenAddress}`);
        
        const winkToken = new ethers.Contract(tokenAddress, WinkTokenABI, signer);
        
        const name = await winkToken.name();
        const symbol = await winkToken.symbol();
        const decimals = await winkToken.decimals();
        const totalSupply = await winkToken.totalSupply();
        const ownerBalance = await winkToken.balanceOf(address);
        
        console.log("\nToken Details:");
        console.log(`- Name: ${name}`);
        console.log(`- Symbol: ${symbol}`);
        console.log(`- Decimals: ${decimals}`);
        console.log(`- Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
        console.log(`- Owner Balance: ${ethers.utils.formatUnits(ownerBalance, decimals)}`);
      }
      
    } catch (error) {
      console.error("Error deploying contract:", error);
      if (error.error && error.error.message) {
        console.error("Detailed error:", error.error.message);
      }
      if (error.transaction) {
        console.error("Failed transaction:", error.transaction);
      }
      alert("Error deploying contract. Check console for details.");
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">Deploy Contract</h1>
      <button 
        onClick={deployContract}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Deploy with MetaMask
      </button>
    </div>
  );
}