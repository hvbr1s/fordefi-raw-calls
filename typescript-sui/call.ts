import { submitTransactionToFordefi } from './serialize-tx';
import { Transaction } from '@mysten/sui/transactions';
import { fordefiConfig, suiNetwork } from './configs';
import { SuiClient } from '@mysten/sui/client';

async function requestAddStake() {
  const client = new SuiClient({ url: suiNetwork });

  // we fetch the current epoch
  const systemState = await client.getLatestSuiSystemState();
  const currentEpoch = Number(systemState.epoch);
  console.log(`Current epoch: ${currentEpoch}`);

  // Optional: List available validators for staking
  // console.log('Available validators:');
  // systemState.activeValidators.forEach((validator, index) => {
  //   console.log(`${index + 1}. Name: ${validator.name}`);
  //   console.log(`   Validator Address: ${validator.suiAddress}`);
  //   console.log(`   Staking Pool ID: ${validator.stakingPoolId}`);
  // });

  const tx = new Transaction();
  tx.setSender(fordefiConfig.senderAddress);
  tx.setGasOwner(fordefiConfig.senderAddress);
  
  // split IKA coins to create staking amount
  const [stakeCoins] = tx.splitCoins(tx.gas, [tx.pure.u64(1000000000)]);
  
  tx.moveCall({
    target: "0x1234a::validator::request_add_stake",
    arguments: [
      tx.object("VALIDATOR_OBJECT_ID_HERE"), // object
      stakeCoins,                            // IKA to stake
      tx.pure.u64(currentEpoch),             // epoch
      tx.pure.bool(false),                   // false for normal staking
    ],
    typeArguments: []
  });
  
  tx.setGasBudget(100_000_000n);

  const fordDefiResult = await submitTransactionToFordefi(client, tx, fordefiConfig.vaultId, fordefiConfig.accessToken);

  console.log("Staking request result:", fordDefiResult);
}
requestAddStake().catch(console.error);