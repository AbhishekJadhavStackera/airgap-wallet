import { FeeDefaults, ProtocolNetwork, ProtocolUnitsMetadata } from '@airgap/module-kit';

export type BSCUnits = 'BNB' | 'GWEI' | 'WEI';

export interface BSCProtocolNetwork extends ProtocolNetwork {
  chainId: number
  blockExplorerApi: string
}

export interface BSCProtocolOptions<_ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork> {
  network: _ProtocolNetwork
}

export interface BSCBaseProtocolOptions<
  _Units extends string = BSCUnits,
  _ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork
> extends BSCProtocolOptions<_ProtocolNetwork> {
  identifier: string
  name: string

  units: ProtocolUnitsMetadata<_Units>
  mainUnit: _Units

  feeDefaults?: FeeDefaults<BSCUnits>

  standardDerivationPath?: string
}

export interface ERC20ProtocolOptions<_Units extends string, _ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork>
  extends BSCProtocolOptions<_ProtocolNetwork> {
  name: string
  identifier: string

  contractAddress: string

  units: ProtocolUnitsMetadata<_Units>
  mainUnit: _Units
}

export interface ERC20TokenOptions<_ProtocolNetwork extends BSCProtocolNetwork = BSCProtocolNetwork>
  extends ERC20ProtocolOptions<string, _ProtocolNetwork> {
  mainIdentifier: string
}

export interface ERC20TokenMetadata {
  name: string
  identifier: string

  symbol: string
  marketSymbol: string

  contractAddress: string

  decimals: number
}
