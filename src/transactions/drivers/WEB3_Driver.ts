import Web3 from 'web3';
import { Transaction } from '@ethereumjs/tx';
import Common, { CustomChain } from '@ethereumjs/common';
import { GenericTxProposal } from '../../fees/GenericTxProposal';
import { GenericTransactionDriver } from '../GenericTransactionDriver';

export class WEB3_Driver extends GenericTransactionDriver {
  send = async (transaction: GenericTxProposal): Promise<any> => {
    const data: any = transaction.getData();
    let txRaw = await this.prepareSignedTransaction(data);
    return this.sendRaw('0x' + txRaw);
  };

  sendRaw = async (transaction: any): Promise<any> => {
    const provider = new Web3.providers.HttpProvider(this.getEndpoint());
    const client = new Web3(provider);

    let p = new Promise((resolve, reject) => {
      client.eth
        .sendSignedTransaction(transaction)
        .on('transactionHash', function(hash) {
          console.log('transactionHash', hash);
          // resolve(hash);
        })
        // .on('confirmation', function(confNumber, receipt){
        //   console.log("confNumber",confNumber,"receipt",receipt)
        // })
        .on('receipt', function(_receipt) {
          console.log('receipt', _receipt);
          resolve(_receipt.transactionHash);
        })

        .on('error', function(error) {
          console.log('Error', error)
          reject(error);
        });
    });
    return p;
  };

  prepareSignedTransaction = async (data: any) => {
    const provider = new Web3.providers.HttpProvider(this.getEndpoint());
    const fromPrivateKey = data.fromPrivateKey;
    const client = new Web3(provider);
    client.eth.accounts.wallet.add(fromPrivateKey);
    client.eth.defaultAccount = client.eth.accounts.wallet[0].address;

    let txRaw;

    if (data.signatureId) {
      txRaw = data.proposal;
    } else {
      if (!data.proposal.gasPrice) {
        data.proposal.gasPrice = +await client.eth.getGasPrice();
      }
      if (!data.proposal.nonce) {
        delete data.proposal.nonce;
      }
      data.proposal.gasLimit = data.proposal.gas + 50000;
      const common = Common.custom(CustomChain.PolygonMainnet);
      const tx = await Transaction.fromTxData(data.proposal, { common });
      const transaction = await tx.sign(Buffer.from(fromPrivateKey.replace('0x', ''), 'hex'));
      txRaw = transaction.serialize().toString('hex');
    }

    return txRaw;
  };

  getEndpoint() {
    const endpoint = this.config.endpoint;
    if (endpoint) {
      return endpoint;
    }
    throw new Error(
      this.currency + ' Transaction endpoint is required in config'
    );
  }
}
