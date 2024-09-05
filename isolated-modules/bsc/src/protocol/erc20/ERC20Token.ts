// @ts-ignore
import { AirGapInterface, RecursivePartial } from '@airgap/module-kit'

import { BSCInfoClient } from '../../clients/info/BSCInfoClient'
import { EtherscanInfoClient } from '../../clients/info/EtherscanInfoClient'
import { BSCNodeClient } from '../../clients/node/BSCNodeClient'
import { HttpBSCNodeClient } from '../../clients/node/HttpBSCNodeClient'
import { BSCProtocolNetwork, ERC20TokenMetadata, ERC20TokenOptions } from '../../types/protocol'
import { BSC_MAINNET_PROTOCOL_NETWORK } from '../BSCProtocol'

import { ERC20Protocol, ERC20ProtocolImpl } from './ERC20Protocol'

// Interface

export interface ERC20Token<_ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork>
  extends AirGapInterface<ERC20Protocol<string, _ProtocolNetwork>, 'SingleTokenSubProtocol'> { }

// Implementation

export class ERC20TokenImpl<_ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork>
  extends ERC20ProtocolImpl<string, _ProtocolNetwork>
  implements ERC20Token<_ProtocolNetwork> {
  public constructor(nodeClient: BSCNodeClient, infoClient: BSCInfoClient, options: ERC20TokenOptions<_ProtocolNetwork>) {
    super(nodeClient, infoClient, options)

    this._mainProtocol = options.mainIdentifier
  }

  // SubProtocol

  public async getType(): Promise<'token'> {
    return 'token'
  }

  private readonly _mainProtocol: string
  public async mainProtocol(): Promise<string> {
    return this._mainProtocol
  }

  public async getContractAddress(): Promise<string> {
    return this.contractAddress
  }
}

// Factory

type ERC20TokenOptionsWithoutMetadata = Omit<
  ERC20TokenOptions,
  'name' | 'identifier' | 'contractAddress' | 'symbol' | 'marketSymbol' | 'decimals'
>

export function createERC20Token(
  metadata: ERC20TokenMetadata,
  options: RecursivePartial<ERC20TokenOptionsWithoutMetadata> = {}
): ERC20Token {
  const completeOptions: ERC20TokenOptions = createERC20TokenOptions(metadata, options.network, options.mainIdentifier)

  return new ERC20TokenImpl(
    new HttpBSCNodeClient(completeOptions.network.rpcUrl),
    new EtherscanInfoClient(completeOptions.network.blockExplorerApi),
    completeOptions
  )
}

export const BSC_ERC20_MAINNET_PROTOCOL_NETWORK: BSCProtocolNetwork = {
  ...BSC_MAINNET_PROTOCOL_NETWORK
}

const DEFAULT_ERC20_PROTOCOL_NETWORK: BSCProtocolNetwork = BSC_ERC20_MAINNET_PROTOCOL_NETWORK

export function createERC20TokenOptions(
  metadata: ERC20TokenMetadata,
  network: Partial<BSCProtocolNetwork> = {},
  mainIdentifier?: string
): ERC20TokenOptions {
  return {
    network: { ...DEFAULT_ERC20_PROTOCOL_NETWORK, ...network },
    name: metadata.name,
    identifier: metadata.identifier,
    mainIdentifier: mainIdentifier ?? 'bsc',

    contractAddress: metadata.contractAddress,

    units: {
      [metadata.symbol]: {
        symbol: { value: metadata.symbol, market: metadata.marketSymbol },
        decimals: metadata.decimals
      }
    },
    mainUnit: metadata.symbol
  }
}
