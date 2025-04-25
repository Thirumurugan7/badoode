
  // deploy- base-b00b2.js
  const { ethers } = require("hardhat");
  
  async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Connect to the VanityContractDeployer for this specific token
    const vanityDeployer = await ethers.getContractAt(
      "VanityContractDeployer", 
      "0x5c46E63Bc046Fe1109fAEaEC1A6089236DF463C7"
    );
    
    // Deploy with the found salt
    console.log("\nDeploying token with salt: 3984369");
    console.log("- Name: BASE Token");
    console.log("- Symbol:  BASE");
    console.log("- Decimals: 18");
    console.log("- Supply: 1000000");
    
    const tx = await vanityDeployer.deployWithSalt(3984369);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    
    // Get the deployed token address from the event
    const deployedEvent = receipt.events.find(e => e.event === "TargetContractDeployed");
    const tokenAddress = deployedEvent.args.deployedAddress;
    
    console.log("\n✅ SUCCESS! Token deployed with address:");
    console.log(`   ${tokenAddress}`);
    
    // Verify the address ends with our target suffix
    if (tokenAddress.toLowerCase().endsWith("b00b2")) {
      console.log("✅ Address correctly ends with: b00b2");
    } else {
      console.log("❌ WARNING: Address does NOT end with: b00b2");
      console.log("   This suggests an inconsistency in the CREATE2 implementation.");
    }
    
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
    
    console.log("\nExplorer Link:");
    console.log(`https://sepolia.basescan.org/address/${tokenAddress}`);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
  