import { IACHandlerStatus, IACMessageHandler } from '@airgap/angular-core'
import { Router } from '@angular/router'
import { AirGapMarketWallet, supportedProtocols } from '@airgap/coinlib-core'

import { partition } from '../../../utils/utils'
import { AccountProvider } from '../../account/account.provider'
import { DataService, DataServiceKey } from '../../data/data.service'
import { ErrorCategory, handleErrorSentry } from '../../sentry-error-handler/sentry-error-handler'

/**
 * Handles addresses and bitcoin style payment requests
 */
export class AddressHandler extends IACMessageHandler {
  public readonly name: string = 'AddressHandler'

  constructor(
    private readonly accountProvider: AccountProvider,
    private readonly dataService: DataService,
    private readonly router: Router
  ) {
    super()
  }

  public async canHandle(data: string): Promise<boolean> {
    const splits: string[] = data.split(':') // Handle bitcoin payment request https://github.com/bitcoin/bips/blob/master/bip-0072.mediawiki

    if (splits.length > 1) {
      const wallets: AirGapMarketWallet[] = this.accountProvider.getWalletList()
      for (const protocol of supportedProtocols()) {
        if (splits[0].toLowerCase() === protocol.symbol.toLowerCase() || splits[0].toLowerCase() === protocol.name.toLowerCase()) {
          const [compatibleWallets]: [AirGapMarketWallet[], AirGapMarketWallet[]] = partition<AirGapMarketWallet>(
            wallets,
            (wallet: AirGapMarketWallet) => wallet.protocol.identifier === protocol.identifier
          )

          if (compatibleWallets.length > 0) {
            return true
          }
        }
      }

      return false
    } else {
      const { compatibleWallets } = await this.accountProvider.getCompatibleAndIncompatibleWalletsForAddress(data)
      if (compatibleWallets.length > 0) {
        return true
      } else {
        return false
      }
    }
  }

  public async receive(data: string | string[]): Promise<IACHandlerStatus> {
    const str: string = typeof data === 'string' ? data : data[0]
    const splits: string[] = str.split(':') // Handle bitcoin payment request https://github.com/bitcoin/bips/blob/master/bip-0072.mediawiki

    if (splits.length > 1) {
      const [address]: string[] = splits[1].split('?') // Ignore amount
      const wallets: AirGapMarketWallet[] = this.accountProvider.getWalletList()
      for (const protocol of supportedProtocols()) {
        if (splits[0].toLowerCase() === protocol.symbol.toLowerCase() || splits[0].toLowerCase() === protocol.name.toLowerCase()) {
          const [compatibleWallets, incompatibleWallets]: [AirGapMarketWallet[], AirGapMarketWallet[]] = partition<AirGapMarketWallet>(
            wallets,
            (wallet: AirGapMarketWallet) => wallet.protocol.identifier === protocol.identifier
          )

          if (compatibleWallets.length > 0) {
            const info = {
              actionType: 'scanned-address',
              address,
              compatibleWallets,
              incompatibleWallets
            }
            this.dataService.setData(DataServiceKey.WALLET, info)
            this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

            return IACHandlerStatus.SUCCESS
          }
        }
      }

      return IACHandlerStatus.UNSUPPORTED
    } else {
      const { compatibleWallets, incompatibleWallets } = await this.accountProvider.getCompatibleAndIncompatibleWalletsForAddress(str)
      if (compatibleWallets.length > 0) {
        const info = {
          actionType: 'scanned-address',
          address: data,
          compatibleWallets,
          incompatibleWallets
        }
        this.dataService.setData(DataServiceKey.WALLET, info)
        this.router.navigateByUrl(`/select-wallet/${DataServiceKey.WALLET}`).catch(handleErrorSentry(ErrorCategory.NAVIGATION))

        return IACHandlerStatus.SUCCESS
      } else {
        return IACHandlerStatus.UNSUPPORTED
      }
    }
  }

  public async getProgress(): Promise<number> {
    return 100
  }

  public async getResult(): Promise<undefined> {
    return undefined
  }

  public async reset(): Promise<void> {
    return
  }

  public async handleComplete(): Promise<boolean> {
    return true
  }
}
