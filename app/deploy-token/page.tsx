'use client';

import { Rocket, CheckCircle2, ArrowRight, XCircle, Loader2 } from "lucide-react";
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { parseEther } from "viem";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import ContractABI from "@/app/purchaseSuffix.json";

import { ethers } from "ethers";
import Deploy from "../comp/deploy";

// Add proper type for the result state
type SearchResult = {
  success: boolean;
  salt?: string;
  message?: string;
  address: string;
  deployerAddress: string;
} | null;

const TokenFactoryABI =[
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "initialSupply",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      }
    ],
    "name": "getWinkTokenBytecode",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  }
];

const VanityDeployerABI = [
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "_bytecode",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
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
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
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
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function VanityFinderPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [tokenName, setTokenName] = useState("BASE Token");
  const [tokenSymbol, setTokenSymbol] = useState("BASE");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [tokenSupply, setTokenSupply] = useState("1000000");
  const [targetSuffix, setTargetSuffix] = useState("b00b5");
  const [contractSuffix, setContractSuffix] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [deployerAddress, setDeployerAddress] = useState("");
  const [txnHash, setTxnHash] = useState("");
  const [vanityDeployerAddress, setVanityDeployerAddress] = useState("");
  const [bytecodeHash, setBytecodeHash] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchId, setSearchId] = useState<string | null>(null);

  // Step 1: Deploy VanityContractDeployer with token bytecode
  async function deployVanityDeployer() {
    setIsProcessing(true);
    setError(null);
    setErrorMessage("");

    if (!window.ethereum) {
      setErrorMessage("Please install MetaMask!");
      setIsProcessing(false);
      setIsError(true);
      return;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      console.log("Deploying with account:", address);
      
      // Connect to the TokenFactory
      const tokenFactory = new ethers.Contract(
        "0xA5286AFfF5e52d15A67482A1cfc326a900757857", // TokenFactory address
        TokenFactoryABI,
        signer
      );
      


      console.log("Connected to TokenFactory");
      console.log("Generating token bytecode...");
      
      // Generate token bytecode
      const tokenBytecode = await tokenFactory.getWinkTokenBytecode(
        tokenName,
        tokenSymbol,
        tokenDecimals,
        ethers.utils.parseUnits(tokenSupply, tokenDecimals),
        address
      );
      
      console.log("Token bytecode generated");
      
      // Deploy VanityContractDeployer with the token bytecode
      console.log("Deploying VanityContractDeployer...");
      
      // Create contract factory for VanityContractDeployer
      const vanityDeployerFactory = new ethers.ContractFactory(
        VanityDeployerABI,
        "608060405234801561000f575f80fd5b50604051611ce8380380611ce883398181016040528101906100319190610193565b805f908161003f91906103e7565b50506104b6565b5f604051905090565b5f80fd5b5f80fd5b5f80fd5b5f80fd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6100a58261005f565b810181811067ffffffffffffffff821117156100c4576100c361006f565b5b80604052505050565b5f6100d6610046565b90506100e2828261009c565b919050565b5f67ffffffffffffffff8211156101015761010061006f565b5b61010a8261005f565b9050602081019050919050565b8281835e5f83830152505050565b5f610137610132846100e7565b6100cd565b9050828152602081018484840111156101535761015261005b565b5b61015e848285610117565b509392505050565b5f82601f83011261017a57610179610057565b5b815161018a848260208601610125565b91505092915050565b5f602082840312156101a8576101a761004f565b5b5f82015167ffffffffffffffff8111156101c5576101c4610053565b5b6101d184828501610166565b91505092915050565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f600282049050600182168061022857607f821691505b60208210810361023b5761023a6101e4565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f6008830261029d7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610262565b6102a78683610262565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f6102eb6102e66102e1846102bf565b6102c8565b6102bf565b9050919050565b5f819050919050565b610304836102d1565b610318610310826102f2565b84845461026e565b825550505050565b5f90565b61032c610320565b6103378184846102fb565b505050565b5b8181101561035a5761034f5f82610324565b60018101905061033d565b5050565b601f82111561039f5761037081610241565b61037984610253565b81016020851015610388578190505b61039c61039485610253565b83018261033c565b50505b505050565b5f82821c905092915050565b5f6103bf5f19846008026103a4565b1980831691505092915050565b5f6103d783836103b0565b9150826002028217905092915050565b6103f0826101da565b67ffffffffffffffff8111156104095761040861006f565b5b6104138254610211565b61041e82828561035e565b5f60209050601f83116001811461044f575f841561043d578287015190505b61044785826103cc565b8655506104ae565b601f19841661045d86610241565b5f5b828110156104845784890151825560018201915060208501945060208101905061045f565b868310156104a1578489015161049d601f8916826103b0565b8355505b6001600288020188555050505b505050505050565b611825806104c35f395ff3fe608060405234801561000f575f80fd5b5060043610610091575f3560e01c806399e23c921161006457806399e23c9214610156578063a3ef52f214610187578063a6c8fe3a146101b7578063e58ed8f9146101e7578063f3fd08ee1461020357610091565b806336e6c7f41461009557806363866255146100c557806370cf2b7a146100f6578063872077df14610126575b5f80fd5b6100af60048036038101906100aa9190610a28565b610221565b6040516100bc9190610a92565b60405180910390f35b6100df60048036038101906100da9190610be7565b610306565b6040516100ed929190610c5b565b60405180910390f35b610110600480360381019061010b9190610c82565b61032b565b60405161011d9190610d29565b60405180910390f35b610140600480360381019061013b9190610a28565b6104cf565b60405161014d9190610a92565b60405180910390f35b610170600480360381019061016b9190610d49565b6104e5565b60405161017e929190610dc4565b60405180910390f35b6101a1600480360381019061019c9190610e15565b61059a565b6040516101ae9190610e6f565b60405180910390f35b6101d160048036038101906101cc9190610a28565b6106ac565b6040516101de9190610a92565b60405180910390f35b61020160048036038101906101fc9190610f26565b6106fc565b005b61020b61070e565b6040516102189190610d29565b60405180910390f35b5f805f80805461023090610f9a565b80601f016020809104026020016040519081016040528092919081815260200182805461025c90610f9a565b80156102a75780601f1061027e576101008083540402835291602001916102a7565b820191905f5260205f20905b81548152906001019060200180831161028a57829003601f168201915b50505050509050838151602083015ff59150813b6102c3575f80fd5b7f5c2cf7b115a5d943fa11d730c947a439f2895d25576349163d4c5e7d3c3f2abc82856040516102f4929190610fca565b60405180910390a18192505050919050565b5f805f610312846106ac565b905061031e818661059a565b8192509250509250929050565b60605f8290505f60028251610340919061101e565b14610380576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610377906110a8565b60405180910390fd5b5f6002825161038f91906110f3565b67ffffffffffffffff8111156103a8576103a7610ac3565b5b6040519080825280601f01601f1916602001820160405280156103da5781602001600182028036833780820191505090505b5090505f5b82518110156104c4575f601061041185848151811061040157610400611123565b5b602001015160f81c60f81b610799565b61041b919061115c565b90505f6104508560018561042f9190611198565b815181106104405761043f611123565b5b602001015160f81c60f81b610799565b9050808261045e91906111cb565b60f81b8460028561046f91906110f3565b815181106104805761047f611123565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff191690815f1a90535050506002816104bd9190611198565b90506103df565b508092505050919050565b5f806104da83610221565b905080915050919050565b5f805f6103e884116104f757836104fb565b6103e85b90505f8590505f828761050e9190611198565b90505b80821015610557575f610523836106ac565b905061052f818a61059a565b156105435782819550955050505050610592565b828061054e906111ff565b93505050610511565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610589906112b6565b60405180910390fd5b935093915050565b5f80836040516020016105ad9190611319565b60405160208183030381529060405290505f6105c88461032b565b90508151815111156105de575f925050506106a6565b5f5b815181101561069e578181815181106105fc576105fb611123565b5b602001015160f81c60f81b7effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff19168382845186516106399190611333565b6106439190611198565b8151811061065457610653611123565b5b602001015160f81c60f81b7effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614610691575f93505050506106a6565b80806001019150506105e0565b506001925050505b92915050565b5f60ff60f81b30835f6040516106c29190611402565b60405180910390206040516020016106dd94939291906114ac565b604051602081830303815290604052805190602001205f1c9050919050565b805f908161070a9190611684565b5050565b5f805461071a90610f9a565b80601f016020809104026020016040519081016040528092919081815260200182805461074690610f9a565b80156107915780601f1061076857610100808354040283529160200191610791565b820191905f5260205f20905b81548152906001019060200180831161077457829003601f168201915b505050505081565b5f7f300000000000000000000000000000000000000000000000000000000000000060f81c60ff168260f81c60ff161015801561080257507f390000000000000000000000000000000000000000000000000000000000000060f81c60ff168260f81c60ff1611155b15610840577f300000000000000000000000000000000000000000000000000000000000000060f81c8260f81c6108399190611753565b90506109df565b7f610000000000000000000000000000000000000000000000000000000000000060f81c60ff168260f81c60ff16101580156108a857507f660000000000000000000000000000000000000000000000000000000000000060f81c60ff168260f81c60ff1611155b156108f2577f610000000000000000000000000000000000000000000000000000000000000060f81c8260f81c600a6108e191906111cb565b6108eb9190611753565b90506109df565b7f410000000000000000000000000000000000000000000000000000000000000060f81c60ff168260f81c60ff161015801561095a57507f460000000000000000000000000000000000000000000000000000000000000060f81c60ff168260f81c60ff1611155b156109a4577f410000000000000000000000000000000000000000000000000000000000000060f81c8260f81c600a61099391906111cb565b61099d9190611753565b90506109df565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109d6906117d1565b60405180910390fd5b919050565b5f604051905090565b5f80fd5b5f80fd5b5f819050919050565b610a07816109f5565b8114610a11575f80fd5b50565b5f81359050610a22816109fe565b92915050565b5f60208284031215610a3d57610a3c6109ed565b5b5f610a4a84828501610a14565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610a7c82610a53565b9050919050565b610a8c81610a72565b82525050565b5f602082019050610aa55f830184610a83565b92915050565b5f80fd5b5f80fd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b610af982610ab3565b810181811067ffffffffffffffff82111715610b1857610b17610ac3565b5b80604052505050565b5f610b2a6109e4565b9050610b368282610af0565b919050565b5f67ffffffffffffffff821115610b5557610b54610ac3565b5b610b5e82610ab3565b9050602081019050919050565b828183375f83830152505050565b5f610b8b610b8684610b3b565b610b21565b905082815260208101848484011115610ba757610ba6610aaf565b5b610bb2848285610b6b565b509392505050565b5f82601f830112610bce57610bcd610aab565b5b8135610bde848260208601610b79565b91505092915050565b5f8060408385031215610bfd57610bfc6109ed565b5b5f83013567ffffffffffffffff811115610c1a57610c196109f1565b5b610c2685828601610bba565b9250506020610c3785828601610a14565b9150509250929050565b5f8115159050919050565b610c5581610c41565b82525050565b5f604082019050610c6e5f830185610c4c565b610c7b6020830184610a83565b9392505050565b5f60208284031215610c9757610c966109ed565b5b5f82013567ffffffffffffffff811115610cb457610cb36109f1565b5b610cc084828501610bba565b91505092915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f610cfb82610cc9565b610d058185610cd3565b9350610d15818560208601610ce3565b610d1e81610ab3565b840191505092915050565b5f6020820190508181035f830152610d418184610cf1565b905092915050565b5f805f60608486031215610d6057610d5f6109ed565b5b5f84013567ffffffffffffffff811115610d7d57610d7c6109f1565b5b610d8986828701610bba565b9350506020610d9a86828701610a14565b9250506040610dab86828701610a14565b9150509250925092565b610dbe816109f5565b82525050565b5f604082019050610dd75f830185610db5565b610de46020830184610a83565b9392505050565b610df481610a72565b8114610dfe575f80fd5b50565b5f81359050610e0f81610deb565b92915050565b5f8060408385031215610e2b57610e2a6109ed565b5b5f610e3885828601610e01565b925050602083013567ffffffffffffffff811115610e5957610e586109f1565b5b610e6585828601610bba565b9150509250929050565b5f602082019050610e825f830184610c4c565b92915050565b5f67ffffffffffffffff821115610ea257610ea1610ac3565b5b610eab82610ab3565b9050602081019050919050565b5f610eca610ec584610e88565b610b21565b905082815260208101848484011115610ee657610ee5610aaf565b5b610ef1848285610b6b565b509392505050565b5f82601f830112610f0d57610f0c610aab565b5b8135610f1d848260208601610eb8565b91505092915050565b5f60208284031215610f3b57610f3a6109ed565b5b5f82013567ffffffffffffffff811115610f5857610f576109f1565b5b610f6484828501610ef9565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680610fb157607f821691505b602082108103610fc457610fc3610f6d565b5b50919050565b5f604082019050610fdd5f830185610a83565b610fea6020830184610db5565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f611028826109f5565b9150611033836109f5565b92508261104357611042610ff1565b5b828206905092915050565b5f82825260208201905092915050565b7f48657820737472696e67206d7573742068617665206576656e206c656e6774685f82015250565b5f61109260208361104e565b915061109d8261105e565b602082019050919050565b5f6020820190508181035f8301526110bf81611086565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6110fd826109f5565b9150611108836109f5565b92508261111857611117610ff1565b5b828204905092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f60ff82169050919050565b5f61116682611150565b915061117183611150565b925082820261117f81611150565b9150808214611191576111906110c6565b5b5092915050565b5f6111a2826109f5565b91506111ad836109f5565b92508282019050808211156111c5576111c46110c6565b5b92915050565b5f6111d582611150565b91506111e083611150565b9250828201905060ff8111156111f9576111f86110c6565b5b92915050565b5f611209826109f5565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361123b5761123a6110c6565b5b600182019050919050565b7f4e6f206d61746368696e672073616c7420666f756e642077697468696e2061745f8201527f74656d707473206c696d69740000000000000000000000000000000000000000602082015250565b5f6112a0602c8361104e565b91506112ab82611246565b604082019050919050565b5f6020820190508181035f8301526112cd81611294565b9050919050565b5f8160601b9050919050565b5f6112ea826112d4565b9050919050565b5f6112fb826112e0565b9050919050565b61131361130e82610a72565b6112f1565b82525050565b5f6113248284611302565b60148201915081905092915050565b5f61133d826109f5565b9150611348836109f5565b92508282039050818111156113605761135f6110c6565b5b92915050565b5f81905092915050565b5f819050815f5260205f209050919050565b5f815461138e81610f9a565b6113988186611366565b9450600182165f81146113b257600181146113c7576113f9565b60ff19831686528115158202860193506113f9565b6113d085611370565b5f5b838110156113f1578154818901526001820191506020810190506113d2565b838801955050505b50505092915050565b5f61140d8284611382565b915081905092915050565b5f7fff0000000000000000000000000000000000000000000000000000000000000082169050919050565b5f819050919050565b61145d61145882611418565b611443565b82525050565b5f819050919050565b61147d611478826109f5565b611463565b82525050565b5f819050919050565b5f819050919050565b6114a66114a182611483565b61148c565b82525050565b5f6114b7828761144c565b6001820191506114c78286611302565b6014820191506114d7828561146c565b6020820191506114e78284611495565b60208201915081905095945050505050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026115437fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82611508565b61154d8683611508565b95508019841693508086168417925050509392505050565b5f819050919050565b5f61158861158361157e846109f5565b611565565b6109f5565b9050919050565b5f819050919050565b6115a18361156e565b6115b56115ad8261158f565b848454611514565b825550505050565b5f90565b6115c96115bd565b6115d4818484611598565b505050565b5b818110156115f7576115ec5f826115c1565b6001810190506115da565b5050565b601f82111561163c5761160d81611370565b611616846114f9565b81016020851015611625578190505b611639611631856114f9565b8301826115d9565b50505b505050565b5f82821c905092915050565b5f61165c5f1984600802611641565b1980831691505092915050565b5f611674838361164d565b9150826002028217905092915050565b61168d82610cc9565b67ffffffffffffffff8111156116a6576116a5610ac3565b5b6116b08254610f9a565b6116bb8282856115fb565b5f60209050601f8311600181146116ec575f84156116da578287015190505b6116e48582611669565b86555061174b565b601f1984166116fa86611370565b5f5b82811015611721578489015182556001820191506020850194506020810190506116fc565b8683101561173e578489015161173a601f89168261164d565b8355505b6001600288020188555050505b505050505050565b5f61175d82611150565b915061176883611150565b9250828203905060ff811115611781576117806110c6565b5b92915050565b7f496e76616c6964206865782063686172616374657200000000000000000000005f82015250565b5f6117bb60158361104e565b91506117c682611787565b602082019050919050565b5f6020820190508181035f8301526117e8816117af565b905091905056fea2646970667358221220dd6f057819f8a8ca513a01816862184379cd9ece0098f738d5c4e4b8d9cc553964736f6c634300081a0033",
        signer
      );

      // const vanityDeployerFactoryr = await vanityDeployerFactory.deploy(tokenBytecode);
      // // await vanityDeployerFactory.deployed();

      // console.log("VanityDeployerFactory deployed to:", vanityDeployerFactoryr.address);
      
      // Deploy the contract
      const vanityDeployer = await vanityDeployerFactory.deploy(tokenBytecode);
      await vanityDeployer.deployed();
      
      console.log("VanityContractDeployer deployed to:", vanityDeployer.address);
      
      // Calculate bytecode hash
      const bytecodeHash = ethers.utils.keccak256(tokenBytecode);
      console.log("Bytecode hash:", bytecodeHash);
      
      // Save the deployment info
      setVanityDeployerAddress(vanityDeployer.address);
      setBytecodeHash(bytecodeHash);
      
      // Store in localStorage for later use
      localStorage.setItem('vanityDeployerAddress', vanityDeployer.address);
      localStorage.setItem('bytecodeHash', bytecodeHash);
      localStorage.setItem('tokenName', tokenName);
      localStorage.setItem('tokenSymbol', tokenSymbol);
      localStorage.setItem('tokenDecimals', tokenDecimals.toString());
      localStorage.setItem('tokenSupply', tokenSupply);
      
      // Move to the next step
      setCurrentStep(1);
      setIsProcessing(false);
      
    } catch (error: any) {
      console.error("Error deploying VanityContractDeployer:", error);
      setIsError(true);
      setErrorMessage(error.message || "Failed to deploy VanityContractDeployer");
      setIsProcessing(false);
    }
  }
  
  // Step 2: Find a salt value that will generate a contract address with the desired suffix
  async function findSalt() {
    setIsSearching(true);
    setError(null);
    setErrorMessage("");
    
    try {
      // Get the stored values
      const storedVanityDeployerAddress = localStorage.getItem('vanityDeployerAddress') || vanityDeployerAddress;
      const storedBytecodeHash = localStorage.getItem('bytecodeHash') || bytecodeHash;
      
      if (!storedVanityDeployerAddress || !storedBytecodeHash) {
        throw new Error("VanityContractDeployer address or bytecode hash not found. Please complete step 1 first.");
      }
      
      // Start the salt search
      const response = await fetch('/api/search-salt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetSuffix,
          vanityDeployerAddress: storedVanityDeployerAddress,
          bytecodeHash: storedBytecodeHash,
          startSalt: 0,
          batchSize: 1000000
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Search started:", data);
      setSearchId(data.searchId);
      
      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const pollResponse = await fetch(`/api/search-salt?id=${data.searchId}`);
          
          if (!pollResponse.ok) {
            throw new Error(`HTTP error! status: ${pollResponse.status}`);
          }
          
          const pollData = await pollResponse.json();
          console.log("Poll response:", pollData);

          if (pollData.status === 'completed') {
            clearInterval(pollInterval);
            setIsSearching(false);

            if (pollData.success) {
              // Salt found!
              console.log("Salt found:", pollData.salt);
              localStorage.setItem('salt', pollData.salt.toString());
              setSearchResult({
                success: true,
                salt: pollData.salt.toString(),
                address: pollData.address,
                deployerAddress: pollData.deployerAddress
              });
              
              // Move to the next step
              setCurrentStep(2);
            } else {
              setError(new Error(pollData.message || 'Search completed without finding a matching salt'));
              setErrorMessage(pollData.message || 'Search completed without finding a matching salt');
              setIsError(true);
            }
          } else if (pollData.status === 'error' || pollData.status === 'timeout') {
            clearInterval(pollInterval);
            setIsSearching(false);
            setError(new Error(pollData.message || 'Search failed'));
            setErrorMessage(pollData.message || 'Search failed');
            setIsError(true);
          }
        } catch (err) {
          console.error('Error checking search status:', err);
          // Don't clear the interval on network errors - keep trying
        }
      }, 2000); // Poll every 2 seconds
      
    } catch (error: any) {
      console.error("Error starting salt search:", error);
      setIsSearching(false);
      setIsError(true);
      setErrorMessage(error.message || "Failed to start salt search");
    }
  }
  
  // Step 3: Deploy the token contract using the found salt
  async function deployContract() {
    setIsProcessing(true);
    setError(null);
    setErrorMessage("");

    const storedSalt = localStorage.getItem('salt');
    const storedVanityDeployerAddress = localStorage.getItem('vanityDeployerAddress') || vanityDeployerAddress;
    
    if (!storedSalt) {
      setErrorMessage("Salt value not found. Please complete the salt search first.");
      setIsProcessing(false);
      setIsError(true);
      return;
    }

    if (!storedVanityDeployerAddress) {
      setErrorMessage("VanityContractDeployer address not found. Please complete step 1 first.");
      setIsProcessing(false);
      setIsError(true);
      return;
    }

    if (!window.ethereum) {
      setErrorMessage("Please install MetaMask!");
      setIsProcessing(false);
      setIsError(true);
      return;
    }
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      console.log("Deploying with account:", address);
      
      // Connect to the VanityContractDeployer
      const vanityDeployer = new ethers.Contract(
        storedVanityDeployerAddress,
        VanityDeployerABI,
        signer
      );


      console.log("VanityDeployer address:", vanityDeployer.address);
      console.log("Deploying with salt:", storedSalt);
      
      try {
        // Estimate gas for the deployment
        const gasEstimate = await vanityDeployer.estimateGas.deployWithSalt(storedSalt);
        console.log("Estimated gas:", gasEstimate.toString());
        
        const gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
        
        // Send the transaction
        const tx = await vanityDeployer.deployWithSalt(storedSalt, {
          gasLimit: gasLimit,
        });
        
        console.log("Transaction hash:", tx.hash);
        setTxnHash(tx.hash);
        
        // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);
        
        // Find the deployment event
        const deployedEvent = receipt.events?.find((e: any) => {
          return e.event === "TargetContractDeployed";
        });
        
        if (!deployedEvent) {
          // Try to find by topic if event name isn't available
          const eventByTopic = receipt.events[0]
          console.log("Event by topic:", eventByTopic);
          if (!eventByTopic) {
            throw new Error("Deployment event not found in transaction receipt");
          }
          
          // Extract address from data
          const data = eventByTopic;
          const deployedTokenAddress = eventByTopic.address;

          console.log("\n✅ SUCCESS! Token deployed with vanity address:");
          console.log(`   ${deployedTokenAddress}`);
          
          // Update state with the deployed token address
          setTokenAddress(deployedTokenAddress.toLowerCase());
          setDeployerAddress(address);
          setIsSuccess(true);
        } else {
          // Extract address from event args
          const deployedTokenAddress = deployedEvent.args.deployedAddress;
          
          console.log("\n✅ SUCCESS! Token deployed with vanity address:");
          console.log(`   ${deployedTokenAddress}`);
          
          // Update state with the deployed token address
          setTokenAddress(deployedTokenAddress.toLowerCase());
          setDeployerAddress(address);
          setIsSuccess(true);
        }
        
        // Connect to the deployed token
        const winkToken = new ethers.Contract(tokenAddress, WinkTokenABI, signer);
        
        // Try to read token details with retries
        let attempts = 0;
        const maxAttempts = 5;
        const delayBetweenAttempts = 3000; // 3 seconds
        
        while (attempts < maxAttempts) {
          try {
            const [name, symbol, decimals, totalSupply, ownerBalance] = await Promise.all([
              winkToken.name(),
              winkToken.symbol(),
              winkToken.decimals(),
              winkToken.totalSupply(),
              winkToken.balanceOf(address)
            ]);
            
            console.log("\nToken Details:");
            console.log(`- Name: ${name}`);
            console.log(`- Symbol: ${symbol}`);
            console.log(`- Decimals: ${decimals}`);
            console.log(`- Total Supply: ${ethers.utils.formatUnits(totalSupply, decimals)}`);
            console.log(`- Owner Balance: ${ethers.utils.formatUnits(ownerBalance, decimals)}`);
            
            // Successfully read token details
            break;
          } catch (error) {
            console.log(`Attempt ${attempts + 1}/${maxAttempts} to read token details failed. Retrying...`);
            attempts++;
            
            if (attempts >= maxAttempts) {
              console.error("Failed to read token details after multiple attempts");
            } else {
              await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
            }
          }
        }
        
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        
        // Fallback to manual gas limit if estimation fails
        console.log("Attempting deployment with manual gas limit...");
        const tx = await vanityDeployer.deployWithSalt(storedSalt, {
          gasLimit: 3000000, // Manual gas limit
        });
        
        console.log("Transaction hash:", tx.hash);
        setTxnHash(tx.hash);
        
        const receipt = await tx.wait();
        
        // Find the deployment event
        const deployedEvent = receipt.events?.find((e: any) => {
          return e.event === "TargetContractDeployed";
        });
        
        if (!deployedEvent) {
          // Try to find by topic if event name isn't available
          const eventByTopic = receipt.events?.find((e: any) => {
            return e.topics && e.topics[0] === "0x5c2cf7b115a5d943fa11d730c947a439f2895d25576349163d4c5e7d3c3f2abc";
          });
          
          if (!eventByTopic) {
            throw new Error("Deployment event not found in transaction receipt");
          }
          
          // Extract address from data
          const data = eventByTopic.data;
          const deployedTokenAddress = ethers.utils.getAddress("0x" + data.slice(-40));
          
          console.log("\n✅ SUCCESS! Token deployed with vanity address:");
          console.log(`   ${deployedTokenAddress}`);
          
          setTokenAddress(deployedTokenAddress);
          setDeployerAddress(address);
          setIsSuccess(true);
        } else {
          // Extract address from event args
          const deployedTokenAddress = deployedEvent.args.deployedAddress;
          
          console.log("\n✅ SUCCESS! Token deployed with vanity address:");
          console.log(`   ${deployedTokenAddress}`);
          
          setTokenAddress(deployedTokenAddress);
          setDeployerAddress(address);
          setIsSuccess(true);
        }
      }
      
    } catch (error: any) {
      console.error("Error deploying contract:", error);
      setIsError(true);
      setErrorMessage(error.message || "Failed to deploy contract");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-8 mt-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl wendy-font">
            Vanity Address Generator
          </h1>
          <p className="mt-3 text-xl text-gray-500 sm:mt-4">
            Create tokens with custom vanity addresses
          </p>
        </div>

        <div className="mt-10">
          <Card className="p-6 bg-white shadow-lg rounded-lg">
            {isSuccess ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 wendy-font">
                    Token Deployed Successfully!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your token has been deployed with a vanity address
                  </p>
                  <div className="bg-gray-100 p-4 rounded-md mb-6">
                    <p className="text-sm text-gray-500 mb-1">Token Address:</p>
                    <p className="font-mono text-gray-800 break-all">{tokenAddress}</p>
                  </div>
                  <div className="flex space-x-4">
                    <a
                      href={`https://sepolia.etherscan.io/address/${tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-[#10ad71] hover:bg-[#0d8a5a] text-white py-2 px-4 rounded-md text-sm font-medium"
                    >
                      View on Explorer
                    </a>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${txnHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md text-sm font-medium"
                    >
                      View Transaction
                    </a>
                  </div>
                </div>
              </div>
            ) : isError ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 wendy-font">
                    Error
                  </h3>
                  <p className="text-red-600 mb-4">{errorMessage}</p>
                  <Button
                    onClick={() => {
                      setIsError(false);
                      setError(null);
                      setErrorMessage("");
                    }}
                    className="bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    {["Token Setup", "Find Salt", "Deploy Token"].map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-center ${
                          index <= currentStep
                            ? "text-[#10ad71]"
                            : "text-gray-400"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                            index <= currentStep
                              ? "bg-[#10ad71] text-white"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-sm hidden sm:inline">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative mt-4 mb-2">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-full"></div>
                    <div
                      className="absolute top-0 left-0 h-1 bg-[#10ad71] rounded-full transition-all duration-300"
                      style={{ width: currentStep === 0 ? "33%" : currentStep === 1 ? "66%" : "100%" }}
                    ></div>
                  </div>
                </div>

                {/* Step 1: Token Setup */}
                {currentStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="tokenName"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Token Name
                        </label>
                        <Input
                          id="tokenName"
                          value={tokenName}
                          onChange={(e) => setTokenName(e.target.value)}
                          placeholder="e.g. BASE Token"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tokenSymbol"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Token Symbol
                        </label>
                        <Input
                          id="tokenSymbol"
                          value={tokenSymbol}
                          onChange={(e) => setTokenSymbol(e.target.value)}
                          placeholder="e.g. BASE"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tokenSupply"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Token Supply
                        </label>
                        <Input
                          id="tokenSupply"
                          value={tokenSupply}
                          onChange={(e) => setTokenSupply(e.target.value)}
                          placeholder="e.g. 1000000"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={deployVanityDeployer}
                      disabled={!tokenName || !tokenSymbol || !tokenSupply || isProcessing}
                      className="w-full bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Deploying...</span>
                        </div>
                      ) : (
                        'Deploy VanityContractDeployer'
                      )}
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Find Salt */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="targetSuffix"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Target Address Suffix
                        </label>
                        <Input
                          id="targetSuffix"
                          value={targetSuffix}
                          onChange={(e) => setTargetSuffix(e.target.value)}
                          placeholder="e.g. b00b5"
                          className="bg-white border-gray-300 text-gray-900"
                          disabled={isSearching}
                        />
                        {targetSuffix && !/^[0-9a-fA-F]+$/.test(targetSuffix) && (
                          <p className="mt-1 text-xs text-red-500">
                            Suffix must be a valid hexadecimal value (0-9, a-f)
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={findSalt}
                      disabled={isSearching || !targetSuffix || !/^[0-9a-fA-F]+$/.test(targetSuffix)}
                      className="w-full bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                    >
                      {isSearching ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Searching for salt...</span>
                        </div>
                      ) : (
                        'Find Salt Value'
                      )}
                    </Button>
                    
                    {isSearching && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Searching for an address ending with: {targetSuffix}</p>
                        <p>This may take several minutes. Please be patient.</p>
                      </div>
                    )}
                    
                    {searchResult && searchResult.success && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                        <h4 className="text-green-800 font-medium mb-2">Salt Found!</h4>
                        <p className="text-green-700 mb-1">Salt value: {searchResult.salt}</p>
                        <p className="text-green-700 mb-2">Predicted address: {searchResult.address}</p>
                        <Button
                          onClick={() => setCurrentStep(2)}
                          className="w-full bg-[#10ad71] hover:bg-[#0d8a5a] text-white mt-2"
                        >
                          Continue to Deployment
                        </Button>
                      </div>
                    )}
                    
                    {errorMessage && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                        {errorMessage}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 3: Deploy Token */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
                      <h4 className="text-blue-800 font-medium mb-2">Ready to Deploy</h4>
                      <p className="text-blue-700 mb-1">Token Name: {tokenName}</p>
                      <p className="text-blue-700 mb-1">Token Symbol: {tokenSymbol}</p>
                      <p className="text-blue-700 mb-1">Token Supply: {tokenSupply}</p>
                      <p className="text-blue-700 mb-1">Target Suffix: {targetSuffix}</p>
                      <p className="text-blue-700">Salt Value: {localStorage.getItem('salt')}</p>
                    </div>
                    
                    <Button
                      onClick={deployContract}
                      disabled={isProcessing}
                      className="w-full bg-[#10ad71] hover:bg-[#0d8a5a] text-white"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Deploying Token...</span>
                        </div>
                      ) : (
                        'Deploy Token with Vanity Address'
                      )}
                    </Button>
                    
                    {errorMessage && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                        {errorMessage}
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}