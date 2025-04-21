import { ethers } from 'ethers';
import { NextResponse } from 'next/server';

/**
 * Generate a wallet with an address ending with the specified suffix
 * @param {string} suffix - The desired suffix for the wallet address
 * @returns {Object} - The generated wallet with address, privateKey and attempts
 */
async function generateWalletWithSuffix(suffix) {
  let attempts = 0;
  const maxAttempts = 1000000; // Safety limit
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Generate a random wallet
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    
    // Check if the address ends with the desired suffix - always case sensitive
    const match = address.endsWith(suffix);
    
    if (match) {
      return {
        address,
        privateKey: wallet.privateKey,
        attempts
      };
    }
    
    // Log progress every 10,000 attempts
    if (attempts % 10000 === 0) {
      console.log(`Generated ${attempts} wallets so far...`);
    }
  }
  
  throw new Error(`Failed to find matching wallet after ${maxAttempts} attempts`);
}

export async function POST(request) {
  try {
    const { suffix } = await request.json();
    
    if (!suffix) {
      return NextResponse.json(
        { error: 'Suffix is required' },
        { status: 400 }
      );
    }
    
    // Generate wallet with matching suffix - always case sensitive
    const wallet = await generateWalletWithSuffix(suffix, true);
    
    return NextResponse.json({
      address: wallet.address,
      privateKey: wallet.privateKey,
      attempts: wallet.attempts
    });
  } catch (error) {
    console.error('Error generating wallet:', error);
    return NextResponse.json(
      { error: 'Failed to generate wallet' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'OK' });
} 