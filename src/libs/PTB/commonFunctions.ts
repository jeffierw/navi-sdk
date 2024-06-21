import { Transaction } from "@mysten/sui/transactions";
import { getConfig, flashloanConfig, pool, vSuiConfig } from '../../address'
import { CoinInfo, Pool, PoolConfig, OptionType } from '../../types';
import { bcs } from "@mysten/sui/bcs";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { moveInspect } from "../CallFunctions";

interface Reward {
    asset_id: string;
    funds: string;
    available: string;
  }

/**
 * Deposits a specified amount of a coin into a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the coin you own.
 * @param amount - The amount of the coin to deposit.
 * @returns The updated transaction block object.
 */
export async function depositCoin(txb: Transaction, _pool: PoolConfig, coinObject: any, amount: any) {
    const config = await getConfig();

    let amountObj;
    if (typeof amount === 'number') {
        amountObj = txb.pure.u64(amount);
    }
    else {
        amountObj = amount;
    }
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_deposit`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            amountObj, // The amount you want to deposit, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;
}

/**
 * Deposits a coin with account cap.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the coin you own.
 * @param account - The account to deposit the coin into.
 * @returns The updated transaction block object.
 */
export async function depositCoinWithAccountCap(txb: Transaction, _pool: PoolConfig, coinObject: any, account: string) {
    const config = await getConfig();

    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::deposit_with_account_cap`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
            txb.object(account)
        ],
        typeArguments: [_pool.type]
    })
    return txb;
}

/**
 * Withdraws a specified amount of coins from a pool.
 * 
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param amount - The amount of coins to withdraw.
 * @returns The updated transaction block object.
 */
export async function withdrawCoin(txb: Transaction, _pool: PoolConfig, amount: number) {
    const config = await getConfig();

    const [ret] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::withdraw`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            txb.pure.u64(amount), // The amount you want to withdraw, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })

    //Transfer withdraw
    const [coin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [ret],
        typeArguments: [_pool.type]
    });

    return [coin];
}

/**
 * Withdraws a specified amount of coins from an account with an account cap.
 * @param txb - The Transaction object.
 * @param _pool - The PoolConfig object.
 * @param account - The account from which to withdraw the coins.
 * @param withdrawAmount - The amount of coins to withdraw.
 * @param sender - The sender of the transaction.
 */
export async function withdrawCoinWithAccountCap(txb: Transaction, _pool: PoolConfig, account: string, withdrawAmount: number, sender: string) {
    const config = await getConfig();

    const [ret] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::withdraw_with_account_cap`,
        arguments: [
            txb.sharedObjectRef({
                objectId: '0x06',
                initialSharedVersion: 1,
                mutable: false,
            }), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            txb.pure.u64(withdrawAmount), // The amount you want to withdraw, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2), // The incentive object v2
            txb.object(account)
        ],
        typeArguments: [_pool.type]
    });

    // const [ret] = txb.moveCall({ target: `${config.ProtocolPackage}::lending::create_account` });
    const [coin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [txb.object(ret)],
        typeArguments: [_pool.type]
    });

    return [coin];
}

/**
 * Borrows a specified amount of coins from a pool.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param borrowAmount - The amount of coins to borrow.
 * @returns The updated transaction block object.
 */
export async function borrowCoin(txb: Transaction, _pool: PoolConfig, borrowAmount: number) {
    const config = await getConfig();

    const [ret] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::borrow`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            txb.pure.u64(borrowAmount), // The amount you want to borrow, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })

    const [coin] = txb.moveCall({
        target: `0x2::coin::from_balance`,
        arguments: [txb.object(ret)],
        typeArguments: [_pool.type]
    });

    return [coin];

}

/**
 * Repays a debt in the protocol.
 * @param txb - The transaction block object.
 * @param _pool - The pool configuration object.
 * @param coinObject - The object representing the Coin you own.
 * @param repayAmount - The amount you want to repay.
 * @returns The updated transaction block object.
 */
export async function repayDebt(txb: Transaction, _pool: PoolConfig, coinObject: any, repayAmount: number) {
    const config = await getConfig();

    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::entry_repay`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.PriceOracle), // object id of oracle
            txb.object(config.StorageId), // object id of storage
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u8(_pool.assetId), // the id of the asset in the protocol
            coinObject, // the object id of the Coin you own.
            txb.pure.u64(repayAmount), // The amount you want to borrow, decimals must be carried, like 1 sui => 1000000000
            txb.object(config.IncentiveV2), // The incentive object v2
        ],
        typeArguments: [_pool.type]
    })
    return txb;

}

/**
 * Retrieves the health factor for a given address.
 * @param txb - The Transaction object.
 * @param address - The address for which to retrieve the health factor.
 * @returns The health factor balance.
 */
export async function getHealthFactor(txb: Transaction, address: string) {
    const config = await getConfig();

    const balance = txb.moveCall({
        target: `${config.ProtocolPackage}::logic::user_health_factor`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId), // object id of storage
            txb.object(config.PriceOracle), // Object id of Price Oracle
            txb.pure.address(address)
        ],

    })

    return balance;
}

/**
 * Merges multiple coins into a single coin object.
 * 
 * @param txb - The transaction block object.
 * @param coinInfo - The coin information object.
 * @returns The merged coin object.
 */
export function returnMergedCoins(txb: Transaction, coinInfo: any) {
    //deprecated
    // if (coinInfo.data.length >= 2) {
    //     let baseObj = coinInfo.data[0].coinObjectId;
    //     let i = 1;
    //     while (i < coinInfo.data.length) {
    //         txb.mergeCoins(baseObj, [coinInfo.data[i].coinObjectId]);
    //         i++;
    //     }
    // }

    if (coinInfo.data.length >= 2) {
        let baseObj = coinInfo.data[0].coinObjectId;
        let all_list = coinInfo.data.slice(1).map((coin: any) => coin.coinObjectId);

        txb.mergeCoins(baseObj, all_list);
    }

    let mergedCoinObject = txb.object(coinInfo.data[0].coinObjectId);
    return mergedCoinObject;
}


/**
 * Executes a flash loan transaction.
 * @param txb - The Transaction object.
 * @param _pool - The PoolConfig object representing the pool.
 * @param amount - The amount of the flash loan.
 * @returns An array containing the balance and receipt of the flash loan transaction.
 */
export async function flashloan(txb: Transaction, _pool: PoolConfig, amount: number) {
    const config = await getConfig();

    const [balance, receipt] = txb.moveCall({
        target: `${config.ProtocolPackage}::lending::flash_loan_with_ctx`,
        arguments: [
            txb.object(flashloanConfig.id), // clock object id
            txb.object(_pool.poolId), // pool id of the asset
            txb.pure.u64(amount), // the id of the asset in the protocol
        ],
        typeArguments: [_pool.type]
    })
    return [balance, receipt];
}

/**
 * Repays a flash loan by calling the flash_repay_with_ctx function in the lending protocol.
 * 
 * @param txb - The Transaction object.
 * @param _pool - The PoolConfig object representing the pool.
 * @param receipt - The receipt object.
 * @param repayCoin - The asset ID of the asset to be repaid.
 * @returns The balance after the flash loan is repaid.
 */
export async function repayFlashLoan(txb: Transaction, _pool: PoolConfig, receipt: any, repayCoin: any) {
    const config = await getConfig();

    const [balance] = txb.moveCall({
        target: `${config.ProtocolPackage}::lending::flash_repay_with_ctx`,
        arguments: [
            txb.object('0x06'), // clock object id
            txb.object(config.StorageId),
            txb.object(_pool.poolId), // pool id of the asset
            receipt,
            repayCoin, // the id of the asset in the protocol
        ],
        typeArguments: [_pool.type]
    })
    return [balance];
}


/**
 * Liquidates a transaction block.
 * @param txb - The transaction block to be liquidated.
 * @param payCoinType - The type of coin to be paid.
 * @param payCoinObj - The payment coin object.
 * @param collateralCoinType - The type of collateral coin.
 * @param to_liquidate_address - The address to which the liquidated amount will be sent.
 * @param to_liquidate_amount - The amount to be liquidated.
 * @returns An array containing the collateral coin and the remaining debt coin.
 */
export async function liquidateFunction(txb: Transaction, payCoinType: CoinInfo, payCoinObj: any, collateralCoinType: CoinInfo, to_liquidate_address: string, to_liquidate_amount: string) {
    const pool_to_pay: PoolConfig = pool[payCoinType.symbol as keyof Pool];
    const collateral_pool: PoolConfig = pool[collateralCoinType.symbol as keyof Pool];
    const config = await getConfig();

    const [collateralBalance, remainDebtBalance] = txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::liquidation`,
        arguments: [
            txb.object('0x06'),
            txb.object(config.PriceOracle),
            txb.object(config.StorageId),
            txb.pure.u8(pool_to_pay.assetId),
            txb.object(pool_to_pay.poolId),
            payCoinObj,
            txb.pure.u8(collateral_pool.assetId),
            txb.object(collateral_pool.poolId),
            txb.pure.address(to_liquidate_address),
            txb.object(config.Incentive),
            txb.object(config.IncentiveV2),
        ],
        typeArguments: [pool_to_pay.type, collateral_pool.type],
    })

    return [collateralBalance, remainDebtBalance];
}

/**
 * Claims the reward for a transaction block.
 * @param txb - The transaction block.
 * @param incentiveFundsPool - The incentive funds pool.
 * @param assetId - The asset ID.
 * @param option - The option type.
 */
export async function claimRewardFunction(txb: Transaction, incentiveFundsPool: string, assetId: string, option: OptionType) {
    const config = await getConfig();

    const ProFundsPoolInfo: any = {
        'f975bc2d4cca10e3ace8887e20afd77b46c383b4465eac694c4688344955dea4': {
            coinType: '0x2::sui::SUI',
            oracleId: 0,
        },
        'e2b5ada45273676e0da8ae10f8fe079a7cec3d0f59187d3d20b1549c275b07ea': {
            coinType: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
            oracleId: 5,
        },
        'a20e18085ce04be8aa722fbe85423f1ad6b1ae3b1be81ffac00a30f1d6d6ab51': {
            coinType: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
            oracleId: 6,
        },
        '9dae0cf104a193217904f88a48ce2cf0221e8cd9073878edd05101d6b771fa09': {
            coinType: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
            oracleId: 7,
        },
    }
    txb.moveCall({
        target: `${config.ProtocolPackage}::incentive_v2::claim_reward`,
        arguments: [
            txb.object('0x06'),
            txb.object(config.IncentiveV2),
            txb.object(`0x${incentiveFundsPool}`),
            txb.object(config.StorageId),
            txb.pure.u8(Number(assetId)),
            txb.pure.u8(option),
        ],
        typeArguments: [ProFundsPoolInfo[incentiveFundsPool].coinType],
    })
}

/**
 * Signs and submits a transaction block using the provided client and keypair.
 * @param txb - The transaction block to sign and submit.
 * @param client - The client object used to sign and execute the transaction block.
 * @param keypair - The keypair used as the signer for the transaction block.
 * @returns A promise that resolves to the result of signing and executing the transaction block.
 */
export async function SignAndSubmitTXB(txb: Transaction, client: any, keypair: any) {
    const result = await client.signAndExecuteTransaction({
        transaction: txb,
        signer: keypair,
        requestType: 'WaitForLocalExecution',
        options: {
            showEffects: true
        }
    })
    return result;
}


/**
 * Stakes a given SUI coin object to the vSUI pool.
 * @param txb The transaction block object.
 * @param suiCoinObj The SUI coin object to be staked.
 * @returns vSui coin object.
 */
export async function stakeTovSui(txb: Transaction, suiCoinObj: any) {

    const [coin] = txb.moveCall({
        target: `${vSuiConfig.ProtocolPackage}::native_pool::stake_non_entry`,
        arguments: [
            txb.object(vSuiConfig.pool),
            txb.object(vSuiConfig.metadata),
            txb.object(vSuiConfig.wrapper),
            suiCoinObj,
        ],
        typeArguments: [],
    })
    return coin;
}

/**
 * Unstakes TOV SUI coins.
 * @param txb - The transaction block object.
 * @param vSuiCoinObj - The vSui coin object.
 * @returns The unstaked Sui coin.
 */
export async function unstakeTovSui(txb: Transaction, vSuiCoinObj: any) {

    const [coin] = txb.moveCall({
        target: `${vSuiConfig.ProtocolPackage}::native_pool::unstake`,
        arguments: [
            txb.object(vSuiConfig.pool),
            txb.object(vSuiConfig.metadata),
            txb.object(vSuiConfig.wrapper),
            vSuiCoinObj,
        ],
        typeArguments: [],
    })
    return coin;
}

  /**
   * Retrieves the incentive pools for a given asset and option.
   * @param assetId - The ID of the asset.
   * @param option - The option type.
   * @param user - (Optional) The user's address. If provided, the rewards claimed by the user and the total rewards will be returned.
   * @returns The incentive pools information.
   */
export async function getIncentivePools(client: SuiClient, assetId: number, option: OptionType, user:string) {
    const config = await getConfig();
    const tx = new Transaction();
    const result: any = await moveInspect(
        tx,
        client,
        user,
        `${config.uiGetter}::incentive_getter::get_incentive_pools`,
        [
            tx.object('0x06'), // clock object id
            tx.object(config.IncentiveV2), // the incentive object v2
            tx.object(config.StorageId), // object id of storage
            tx.pure.u8(assetId),
            tx.pure.u8(option),
            tx.pure.address(user), // If you provide your address, the rewards that have been claimed by your address and the total rewards will be returned.
        ],
        [], // type arguments is null
        'vector<IncentivePoolInfo>' // parse type
    );
    return result[0];
}

  /**
   * Retrieves the available rewards for a given address.
   * 
   * @param checkAddress - The address to check for rewards. Defaults to the current address.
   * @param option - The option type. Defaults to 1.
   * @param prettyPrint - Whether to print the rewards in a pretty format. Defaults to true.
   * @returns An object containing the summed rewards for each asset.
   * @throws If there is an error retrieving the available rewards.
   */
export async function getAvailableRewards(client: SuiClient, checkAddress: string, option: OptionType = 1, prettyPrint = true) {
    const assetIds = Array.from({ length: 8 }, (_, i) => i); // Generates an array [0, 1, 2, ..., 7]
    try {
      const allResults = await Promise.all(
        assetIds.map(assetId => getIncentivePools(client, assetId, option, checkAddress))
      );

      const allPools = allResults.flat();
      const activePools = allPools.filter(pool => pool.available.trim() != '0');

      const summedRewards = activePools.reduce((acc, pool) => {
        const assetId = pool.asset_id.toString();
        const availableDecimal = (BigInt(pool.available) / BigInt(10 ** 27)).toString();
        const availableFixed = (Number(availableDecimal) / 10 ** 9).toFixed(5); // Adjust for 5 decimal places

        if (!acc[assetId]) {
          acc[assetId] = { asset_id: assetId, funds: pool.funds, available: availableFixed };
        } else {
          acc[assetId].available = (parseFloat(acc[assetId].available) + parseFloat(availableFixed)).toFixed(5);
        }

        return acc;
      }, {} as { [key: string]: { asset_id: string, funds: string, available: string } });

      if (prettyPrint) {
        const coinDictionary: { [key: string]: string } = {
          '0': 'Sui',
          '1': 'USDC',
          '2': 'USDT',
          '3': 'WETH',
          '4': 'CETUS',
          '5': 'vSui',
          '6': 'haSui',
          '7': 'NAVX',
        };
        console.log(checkAddress, ' available rewards:');
        Object.keys(summedRewards).forEach(key => {
          if (key == '5' || key == '7') {
            console.log(`${coinDictionary[key]}: ${summedRewards[key].available} NAVX`);
          } else {
            console.log(`${coinDictionary[key]}: ${summedRewards[key].available} vSui`);
          }
        });
      }

      return summedRewards;
    } catch (error) {
      console.error('Failed to get available rewards:', error);
      throw error;
    }
  }

/**
   * Claims all available rewards for the specified account.
   * @returns PTB result
   */
export async function claimAllRewardsPTB(client: SuiClient, userToCheck: string) {
    let txb = new Transaction();

    const rewardsSupply: { [key: string]: Reward } = await getAvailableRewards(client, userToCheck, 1, false);
    // Convert the rewards object to an array of its values
    const rewardsArray: Reward[] = Object.values(rewardsSupply);
    for (const reward of rewardsArray) {
      await claimRewardFunction(txb, reward.funds, reward.asset_id, 1);
    }

    const rewardsBorrow: { [key: string]: Reward } = await getAvailableRewards(client, userToCheck, 3, false);
    // Convert the rewards object to an array of its values
    const rewardsBorrowArray: Reward[] = Object.values(rewardsBorrow);
    for (const reward of rewardsBorrowArray) {
      await claimRewardFunction(txb, reward.funds, reward.asset_id, 3);
    }

    return txb;
  }