import { RecursivePartial } from '@airgap/module-kit'

import { EtherscanInfoClient } from '../clients/info/EtherscanInfoClient'
import { HttpBSCNodeClient } from '../clients/node/HttpBSCNodeClient'

import { BSCProtocolNetwork, BSCProtocolOptions } from '../types/protocol'
import { BSCBaseProtocol, BSCBaseProtocolImpl, DEFAULT_BSC_UNITS_METADATA, DefaultBSCBaseProtocolImpl } from './BSCBaseProtocol'

// Interface

// TODO: move Bip32 implementation to BSCBaseProtocol
export interface BSCProtocol extends BSCBaseProtocol { }

// Implementation

class BSCProtocolImpl extends DefaultBSCBaseProtocolImpl implements BSCProtocol {
  public constructor(options: RecursivePartial<BSCProtocolOptions> = {}) {
    const completeOptions: BSCProtocolOptions = createBSCProtocolOptions(options.network)

    super(
      new HttpBSCNodeClient(completeOptions.network.rpcUrl),
      new EtherscanInfoClient(completeOptions.network.blockExplorerApi),
      completeOptions
    )
  }
}

class BSCTestnetProtocolImpl extends BSCBaseProtocolImpl implements BSCProtocol {
  public constructor(options: RecursivePartial<BSCProtocolOptions> = {}) {
    const completeOptions: BSCProtocolOptions = createBSCProtocolOptions(options.network)

    super(
      new HttpBSCNodeClient(completeOptions.network.rpcUrl),
      new EtherscanInfoClient(completeOptions.network.blockExplorerApi),
      {
        ...completeOptions,
        identifier: 'bsc-testnet',
        name: 'BSC Testnet',
        units: DEFAULT_BSC_UNITS_METADATA,
        mainUnit: 'BNB'
      }
    )
  }
}

// Factory

export function createBSCProtocol(options: RecursivePartial<BSCProtocolOptions> = {}): BSCProtocol {
  return new BSCProtocolImpl(options)
}

export function createBSCTestnetProtocol(options: RecursivePartial<BSCProtocolOptions> = {}): BSCProtocol {
  return new BSCTestnetProtocolImpl(options)
}

export const BSC_MAINNET_PROTOCOL_NETWORK: BSCProtocolNetwork = {
  name: 'BSC',
  type: 'mainnet',
  rpcUrl: 'https://bsc-dataseed.binance.org',
  blockExplorerUrl: 'https://bscscan.com',
  chainId: 56,
  blockExplorerApi: 'https://api.bscscan.com/api'
}

export const BSC_TESTNET_PROTOCOL_NETWORK: BSCProtocolNetwork = {
  name: 'BSC Testnet',
  type: 'testnet',
  rpcUrl: 'https://bsc-testnet-dataseed.bnbchain.org',
  blockExplorerUrl: 'https://testnet.bscscan.com',
  chainId: 97,
  blockExplorerApi: 'https://api-testnet.bscscan.com/api'
}

const DEFAULT_BSC_PROTOCOL_NETWORK: BSCProtocolNetwork = BSC_MAINNET_PROTOCOL_NETWORK

export function createBSCProtocolOptions(network: Partial<BSCProtocolNetwork> = {}): BSCProtocolOptions {
  return {
    network: { ...DEFAULT_BSC_PROTOCOL_NETWORK, ...BSC_TESTNET_PROTOCOL_NETWORK, ...network }
  }
}
