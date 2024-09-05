// tslint:disable: max-file-line-count
import { ERC20TokenMetadata } from '../types/protocol'

export const erc20Tokens: Record<string, ERC20TokenMetadata> = {
  'bsc-erc20-usdt': {
    symbol: 'BSC-USD',
    name: 'Binance-Peg BSC-USD',
    marketSymbol: 'bnb',
    identifier: 'bsc-erc20-usdt',
    contractAddress: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18
  },
  'bsc-erc20-eth': {
    symbol: 'ETH',
    name: 'Binance-Peg Ethereum Token',
    marketSymbol: 'bnb',
    identifier: 'bsc-erc20-eth',
    contractAddress: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    decimals: 18
  },
}

export const erc20TokensIdentifiers: string[] = Object.keys(erc20Tokens)
