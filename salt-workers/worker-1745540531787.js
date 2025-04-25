
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
  