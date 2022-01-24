import {IFeeMap, FEE_TYPES} from '../IFee';
import {GenericDriver} from '../GenericDriver';
import {EthereumFee} from '../types/EthereumFee';
import {TransactionConfig} from 'web3-core';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import {TRANSFER_METHOD_ABI} from '../../constants';

export class WEB3_Driver extends GenericDriver {
  nativeAssetSymbol: string = 'ETH';

  getGasFeePrices = async () => {
    let prices: any = {};
    prices[FEE_TYPES.REGULAR] = 0;
    prices[FEE_TYPES.PRIORITY] = 0;
    return prices;
  };

  buildFee = (proposal: any) => {
    return new EthereumFee(proposal);
  };

  getTxSendProposals = async (destination: string, valueToSend: number) => {
    const currency = this.assetConfig.symbol!;
    const privateKey = this.assetConfig.privKey!;

    let prices = await this.getGasFeePrices();

    let fees: IFeeMap = {};

    let body = {
      to: destination,
      amount: valueToSend,
      currency: currency,
      fee: {
        gasLimit: currency === this.nativeAssetSymbol ? 40000 : null,
        gasPrice: prices[FEE_TYPES.REGULAR].toString(),
      },
      fromPrivateKey: privateKey,
    };

    let proposal = await this.buildProposal(body);
    if (proposal && proposal.error) {
      return proposal;
    }

    fees[FEE_TYPES.REGULAR] = this.buildFee(proposal);

    body = {
      to: destination,
      amount: valueToSend,
      currency: currency,
      fee: {
        gasLimit: currency === this.nativeAssetSymbol ? 40000 : null,
        gasPrice: prices[FEE_TYPES.PRIORITY].toString(),
      },
      fromPrivateKey: privateKey,
    };

    proposal = await this.buildProposal(body);
    if (proposal && proposal.error) {
      return proposal;
    }

    fees[FEE_TYPES.PRIORITY] = this.buildFee(proposal);

    return fees;
  };

  buildProposal = async (body: any) => {
    const provider = new Web3.providers.HttpProvider(
      this.getProposalEndpoint()
    );

    const {
      fromPrivateKey,
      to,
      amount,
      currency,
      fee,
      data,
      signatureId,
    } = body;

    const client = new Web3(provider);
    client.eth.accounts.wallet.add(fromPrivateKey);
    client.eth.defaultAccount = client.eth.accounts.wallet[0].address;
    const senderWallet = client.eth.accounts.wallet[0].address

    let tx: TransactionConfig;
    if (currency === this.nativeAssetSymbol) {
      tx = {
        from: 0,
        to: client.utils.toHex(to.trim()),
        value: client.utils.toHex(client.utils.toWei(`${amount}`, 'ether')),
        data: data
          ? client.utils.isHex(data)
              ? client.utils.stringToHex(data)
              : client.utils.toHex(data)
          : undefined,
        // @ts-ignore
        nonce: client.utils.toHex(await client.eth.getTransactionCount(senderWallet)),
      };
    } else {
      const contract = new client.eth.Contract(
          // @ts-ignore
          [TRANSFER_METHOD_ABI],
          this.assetConfig.contract
      );
      const digits = new BigNumber(10).pow(this.assetConfig.decimals!);
      tx = {
        from: 0,
        to: client.utils.toHex(this.assetConfig.contract!),
        data: contract.methods
          .transfer(
              to.trim(),
              `0x${new BigNumber(amount).multipliedBy(digits).toString(16)}`
          )
          .encodeABI(),
        // @ts-ignore
        nonce: client.utils.toHex(await client.eth.getTransactionCount(senderWallet)),
      };
    }

    const gasPrice = client.utils.toWei(fee.gasPrice, 'gwei');
    if (fee.gasLimit) {
      tx = {
        ...tx,
        gasPrice: gasPrice ?? await client.eth.getGasPrice(),
      };
    }

    if (!signatureId) {
      try {
        tx.gas = fee?.gasLimit ?? (await client.eth.estimateGas(tx));
      } catch (e) {
        console.log('ERROR', e);
        return {
          // @ts-ignore
          error: e.message.match(/([^:]+$)/)[0]
        }
      }
    }


    return {
      signatureId: signatureId,
      fromPrivateKey: fromPrivateKey,
      fee: {
        gasLimit: tx.gas,
        gasPrice: fee.gasPrice,
      },
      proposal: signatureId ? JSON.stringify(tx) : tx,
    };
  };

  getProposalEndpoint() {
    const endpoint = this.config.proposal_endpoint;
    if (endpoint) {
      return endpoint;
    }
    throw new Error(this.currency + ' Balance currency is required in config');
  }
}
