import { fordefiConfig, CONTRACT_ADDRESS, DECIMALS, DESTINATION_ADDRESS } from './config';
import { getProvider } from './get-provider';
import { ethers } from 'ethers';

async function main() {
    let provider = await getProvider(fordefiConfig);
    if (!provider) throw new Error("Failed to initialize provider");
    let web3Provider = new ethers.BrowserProvider(provider); 
    const signer = await web3Provider.getSigner();

    // let abi = [
    //     "function transfer(address to, uint amount)",
    //     "function balanceOf(address a) view returns (uint)"
    //   ]
    // // Write ops
    // const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)
    // const amount = ethers.parseUnits("0.00001", DECIMALS);
    // const tx = await contract.transfer!(DESTINATION_ADDRESS, amount)
    // console.log("Transaction hash:", tx.hash);
  
    // const receipt = await tx.wait();
    // if (receipt) {
    //   console.log("Transaction confirmed in block:", receipt.blockNumber);
    // } else {
    //   console.log("Transaction receipt is null.");
    // }

    // Read ops
    // const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, web3Provider)
    // const balance = await contract.balanceOf(fordefiConfig.address)
    // const humanReadableBalance = ethers.formatUnits(balance, DECIMALS)
    // console.log("Result is: ", humanReadableBalance)

    // BATCHER CONTRACT:
    const BATCHER_CONTRACT_ADDRESS = "0x7D8D7e776aC41c5F819965b2E288b2D03fe517aE";
    const batcherAbi = [
      "function batchSendETHSameAmount(address[] calldata recipients, uint256 amountPerRecipient) external payable",
      "function batchSendTokenDifferentAmounts(address token, address[] calldata recipients, uint256[] calldata amounts) external"
    ];
    const batcherContract = new ethers.Contract(BATCHER_CONTRACT_ADDRESS, batcherAbi, signer);
    const recipients = ["0xED8315fA2Ec4Dd0dA9870Bf8CD57eBf256A90772", "0xF659feEE62120Ce669A5C45Eb6616319D552dD93"];

    // Batch send ETH to multiple recipients (same amount each)
    // const amountPerRecipient = ethers.parseEther("0.00001");
    // const totalValue = amountPerRecipient * BigInt(recipients.length);
    // const batchTx = await batcherContract.batchSendETHSameAmount!(recipients, amountPerRecipient, { value: totalValue });
    // console.log("Batch transaction hash:", batchTx.hash);
    // const batchReceipt = await batchTx.wait();
    // console.log("Batch transaction confirmed in block:", batchReceipt.blockNumber);

    // Batch send ERC20 tokens to multiple recipients (different amount each)
    const token = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" // USDC Mainnet
    const amounts = ["10", "10"];
    const batchTx = await batcherContract.batchSendTokenDifferentAmounts!(token, recipients, amounts);
    console.log("Batch transaction hash:", batchTx.hash);
    const batchReceipt = await batchTx.wait();
    console.log("Batch transaction confirmed in block:", batchReceipt.blockNumber);

  }
  
  main().catch(console.error);