import { Chains } from './chains';
import { CONFIG } from './utils/config';
import { entropyToMnemonic, generateMnemonic, validateMnemonic } from 'bip39';

import {
  BitcoinGenerator,
  BscGenerator,
  EthereumGenerator,
  PolygonGenerator,
} from './generators';

const DRIVER_NAMESPACE: {
  [key: string]: any;
} = {
  [Chains.BTC]: BitcoinGenerator,
  [Chains.ETH]: EthereumGenerator,
  [Chains.POLYGON]: PolygonGenerator,
  [Chains.BSC]: BscGenerator,
};

/**
 *
 *
 * @export
 * @class WalletGenerator
 */
export class WalletGenerator {
  /**
   * Generates a string containing the 12 words used as a mnemonic
   * to create the private and public wallet keys.
   *
   * @static
   * @param {number} [size=128] Or use 256 for 24 words
   * @return {string} The mnemonic
   * @memberof WalletGenerator
   */
  static generateMnem(size = 128): string {
    return generateMnemonic(size);
  }

  static entropyToMnem(entropy: string): string {
    return entropyToMnemonic(entropy);
  }

  static validateMnem(mnemonic: string): boolean {
    return validateMnemonic(mnemonic)
  }

  /**
   * Offers direct access to the drivers that offer the key generation.
   *
   * @static
   * @param {Chains} chain
   * @return {GenericGenerator}
   * @memberof WalletGenerator
   */
  static getDriver(chain: Chains) {
    let driver = DRIVER_NAMESPACE[chain];
    if (!driver) {
      throw new Error('Unsupported wallet chain');
    }
    return driver;
  }

  /**
   * Generate the wallet's XPUB address.
   * The source of all addresses to be generated for the public.
   *
   * @static
   * @param {Chains} chain The type of chain
   * @param {string} mnemonic
   * @param {*} [config=CONFIG]
   * @return {string} The wallet's XPUB address
   * @memberof WalletGenerator
   */
  static async generateWalletXpub(
    chain: Chains,
    mnemonic: any,
    config: any = CONFIG
  ) {
    let driver = WalletGenerator.getDriver(chain);
    return driver.generateWalletXpub(mnemonic, config);
  }

  /**
   * Generate the wallet's private key.
   *
   * @static
   * @param {Chains} chain The type of chain
   * @param {string} mnemonic
   * @param {integer} derivation The derivation key to allow generation of more private keys for the same chain
   * @param {*} [config=CONFIG]
   * @return {string} The wallet's private key
   * @memberof WalletGenerator
   */
  static async generatePrivateKeyFromMnemonic(
    chain: Chains,
    mnemonic: any,
    derivation: any,
    config: any = CONFIG
  ) {
    let driver = WalletGenerator.getDriver(chain);
    return driver.generatePrivateKeyFromMnemonic(mnemonic, derivation, config);
  }

  /**
   * Generate the public wallet address for the specified chain
   *
   * @static
   * @param {Chains} chain The type of chain
   * @param {string} xpub
   * @param {integer} derivation
   * @param {*} [config=CONFIG]
   * @return {string} The wallet's public address
   * @memberof WalletGenerator
   */
  static async generateAddressFromXPub(
    chain: Chains,
    xpub: any,
    derivation: any,
    config: any = CONFIG
  ) {
    let driver = WalletGenerator.getDriver(chain);
    return driver.generateAddressFromXPub(xpub, derivation, config);
  }
}
