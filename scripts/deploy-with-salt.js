
  // deploy-with-salt.js
  const { ethers } = require("hardhat");
  
  async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Connect to the previously deployed VanityContractDeployer
    const vanityDeployer = await ethers.getContractAt(
      "VanityContractDeployer", 
      "0x5c46E63Bc046Fe1109fAEaEC1A6089236DF463C7"
    );
    
    // Deploy with the found salt
    console.log("Deploying with salt: 485");
    const tx = await vanityDeployer.deployWithSalt(485);
    const receipt = await tx.wait();
    
    // Get the deployed token address from the event
    const deployedEvent = receipt.events.find(e => e.event === "TargetContractDeployed");
    const tokenAddress = deployedEvent.args.deployedAddress;
    
    console.log("\n✅ SUCCESS! Token deployed with vanity address:");
    console.log(`   ${tokenAddress}`);
    
    // Connect to the deployed token
    const WinkToken = await ethers.getContractFactory("WinkToken");
    const winkToken = await WinkToken.attach(tokenAddress);
    
    // Verify token details
    const name = await winkToken.name();
    const symbol = await winkToken.symbol();
    const decimals = await winkToken.decimals();
    const totalSupply = await winkToken.totalSupply();
    const ownerBalance = await winkToken.balanceOf(deployer.address);
    
    console.log("\nToken Details:");
    console.log(`- Name: ${name}`);
    console.log(`- Symbol: ${symbol}`);
    console.log(`- Decimals: ${decimals}`);
    console.log(`- Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
    console.log(`- Owner Balance: ${ethers.utils.formatUnits(ownerBalance, decimals)}`);
    
    console.log("\nGoerli Explorer Link:");
    console.log(`https://goerli.etherscan.io/address/${tokenAddress}`);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  