import {
  BEACON_VERSION,
  BeaconErrorType,
  BeaconMessageType,
  BeaconRequestOutputMessage,
  BeaconResponseInputMessage,
  getSenderId,
  Network,
  NetworkType as BeaconNetworkType,
  P2PPairingRequest,
  WalletClient,
  StorageKey
} from '@airgap/beacon-sdk'

import { Injectable } from '@angular/core'
import { LoadingController, ModalController, ToastController } from '@ionic/angular'
import { ICoinProtocol, MainProtocolSymbols, RawEthereumTransaction } from '@airgap/coinlib-core'
import { TezosNetwork, TezosProtocol } from '@airgap/coinlib-core/protocols/tezos/TezosProtocol'
import {
  TezblockBlockExplorer,
  TezosProtocolNetwork,
  TezosProtocolNetworkExtras,
  TezosProtocolOptions
} from '@airgap/coinlib-core/protocols/tezos/TezosProtocolOptions'
import { ProtocolService } from '@airgap/angular-core'
import { NetworkType } from '@airgap/coinlib-core/utils/ProtocolNetwork'
import { BeaconRequestPage } from 'src/app/pages/beacon-request/beacon-request.page'
import { ErrorPage } from 'src/app/pages/error/error.page'

import { BeaconRequest, SerializedBeaconRequest, WalletStorageKey, WalletStorageService } from '../storage/storage'

@Injectable({
  providedIn: 'root'
})
export class BeaconService {
  public client: WalletClient

  public loader: HTMLIonLoadingElement | undefined
  public toast: HTMLIonToastElement | undefined

  constructor(
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController,
    private readonly toastController: ToastController,
    private readonly storage: WalletStorageService,
    private readonly protocolService: ProtocolService
  ) {
    this.client = this.getClient()
    this.init()
  }

  public async reset(): Promise<void> {
    await this.client.destroy()
    this.client = this.getClient()
    this.init()
  }

  public async init(): Promise<void> {
    await this.client.init()

    return this.client.connect(async (message) => {
      this.hideToast()
      if (!(await this.isNetworkSupported((message as { network?: Network }).network))) {
        return this.sendNetworkNotSupportedError(message.id)
      } else {
        await this.presentModal(message)
      }
    })
  }

  public async getRequestsFromStorage(): Promise<BeaconRequest[]> {
    const requests: SerializedBeaconRequest[] = await this.storage.get(WalletStorageKey.BEACON_REQUESTS)

    return await Promise.all(
      requests.map(async (request: SerializedBeaconRequest): Promise<BeaconRequest> => {
        return [request.messageId, request.payload, await this.getProtocolBasedOnBeaconNetwork(request.network)]
      })
    )
  }

  async presentModal(request: BeaconRequestOutputMessage) {
    const modal = await this.modalController.create({
      component: BeaconRequestPage,
      componentProps: {
        request,
        client: this.client,
        beaconService: this
      }
    })

    return modal.present()
  }

  public async addVaultRequest(
    generatedId: number,
    request: BeaconRequestOutputMessage | { transaction: RawEthereumTransaction; id: number },
    protocol: ICoinProtocol
  ): Promise<void> {
    this.storage.setCache(generatedId.toString(), [request, protocol.identifier, protocol.options.network.identifier])
  }

  public async getVaultRequest(generatedId: string): Promise<[BeaconRequestOutputMessage, ICoinProtocol] | []> {
    let cachedRequest: [BeaconRequestOutputMessage, MainProtocolSymbols, string] = await this.storage.getCache(generatedId)
    const result: [BeaconRequestOutputMessage, ICoinProtocol] = [undefined, undefined]
    if (cachedRequest) {
      if (cachedRequest[0]) {
        result[0] = cachedRequest[0]
      }
      if (cachedRequest[1]) {
        const protocol = await this.protocolService.getProtocol(cachedRequest[1], cachedRequest[2])
        result[1] = protocol
      }
    }
    return result ? result : []
  }

  public async respond(message: BeaconResponseInputMessage): Promise<void> {
    console.log('responding', message)
    await this.client.respond(message).catch((err) => console.error(err))
    await this.showToast('response-sent')
  }

  public async showLoader(): Promise<void> {
    if (this.loader) {
      return
    }

    this.loader = await this.loadingController.create({
      message: 'Connecting to Beacon Network...',
      duration: 10000
    })
    await this.loader.present()
  }

  public async hideLoader(): Promise<void> {
    if (!this.loader) {
      return
    }
    await this.loader.dismiss()
    this.loader = undefined
  }

  public async showToast(type: 'connected' | 'response-sent'): Promise<void> {
    if (this.toast) {
      return
    }

    const message = type === 'connected' ? 'Beacon connection successful. Waiting for request from dApp...' : 'Response sent to the dApp.'

    this.toast = await this.toastController.create({
      message,
      position: 'top',
      duration: 5000,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    })
    await this.toast.present()
  }

  public async hideToast(): Promise<void> {
    if (!this.toast) {
      return
    }
    await this.toast.dismiss()
    this.toast = undefined
  }

  public async addPeer(peer: P2PPairingRequest): Promise<void> {
    await this.showLoader()
    await this.client.addPeer(peer)
    await this.hideLoader()
    await this.showToast('connected')
  }

  public async getPeers(): Promise<P2PPairingRequest[]> {
    return this.client.getPeers() as any // TODO: Fix types
  }

  public async removePeer(peer: P2PPairingRequest): Promise<void> {
    await this.client.removePeer(peer as any, true) // TODO: Fix types
  }

  public async removeAllPeers(): Promise<void> {
    await this.client.removeAllPeers(true)
  }

  private async isNetworkSupported(network?: Network): Promise<boolean> {
    return (
      network.type === BeaconNetworkType.MAINNET ||
      network.type === BeaconNetworkType.EDONET ||
      network.type === BeaconNetworkType.FLORENCENET ||
      network.type === BeaconNetworkType.CUSTOM
    )
  }

  private async displayErrorPage(error: Error & { data?: unknown }): Promise<void> {
    const modal = await this.modalController.create({
      component: ErrorPage,
      componentProps: {
        title: error.name,
        message: error.message,
        data: error.data ? error.data : error.stack
      }
    })

    return modal.present()
  }

  public async sendAbortedError(id: string): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.ABORTED_ERROR
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
  }

  public async sendNetworkNotSupportedError(id: string): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.NETWORK_NOT_SUPPORTED
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
    await this.displayErrorPage(new Error('Network not supported!'))
  }

  public async sendAccountNotFound(id: string): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.NO_ADDRESS_ERROR
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }
    await this.respond(response)
    await this.displayErrorPage(new Error('Account not found'))
  }

  public async sendInvalidTransaction(id: string, error: any /* ErrorWithData */): Promise<void> {
    const responseInput = {
      id,
      type: BeaconMessageType.Error,
      errorType: BeaconErrorType.TRANSACTION_INVALID_ERROR,
      errorData: error.data
    } as any // TODO: Fix type

    const response: BeaconResponseInputMessage = {
      senderId: await getSenderId(await this.client.beaconId), // TODO: Remove senderId and version from input message
      version: BEACON_VERSION,
      ...responseInput
    }

    let errorMessage = ''
    try {
      errorMessage =
        error.data && Array.isArray(error.data)
          ? `The contract returned the following error: ${error.data.find((f) => f && f.with && f.with.string).with.string}`
          : error.message
    } catch {}

    console.log('error.message', errorMessage)

    await this.respond(response)
    await this.displayErrorPage({
      title: error.title,
      message: errorMessage,
      data: error.data ? error.data : error.stack
    } as any)
  }

  public async getProtocolBasedOnBeaconNetwork(network: Network): Promise<TezosProtocol> {
    const configs: {
      [key in Exclude<BeaconNetworkType, BeaconNetworkType.DELPHINET | BeaconNetworkType.GRANADANET>]: TezosProtocolNetwork
    } = {
      [BeaconNetworkType.MAINNET]: {
        identifier: undefined,
        name: undefined,
        type: undefined,
        rpcUrl: undefined,
        blockExplorer: undefined,
        extras: {
          network: undefined,
          conseilUrl: undefined,
          conseilNetwork: undefined,
          conseilApiKey: undefined
        }
      },
      [BeaconNetworkType.EDONET]: {
        identifier: undefined,
        name: network.name || 'Edonet',
        type: NetworkType.TESTNET,
        rpcUrl: network.rpcUrl || 'https://tezos-edonet-node.prod.gke.papers.tech',
        blockExplorer: new TezblockBlockExplorer('https://edonet.tezblock.io'),
        extras: {
          network: TezosNetwork.EDONET,
          conseilUrl: 'https://tezos-edonet-conseil.prod.gke.papers.tech',
          conseilNetwork: TezosNetwork.EDONET,
          conseilApiKey: 'airgap00391'
        }
      },
      [BeaconNetworkType.FLORENCENET]: {
        identifier: undefined,
        name: network.name || 'Florencenet',
        type: NetworkType.TESTNET,
        rpcUrl: network.rpcUrl || 'https://tezos-florencenet-node.prod.gke.papers.tech',
        blockExplorer: new TezblockBlockExplorer('https://florencenet.tezblock.io'),
        extras: {
          network: TezosNetwork.FLORENCENET,
          conseilUrl: 'https://tezos-florencenet-conseil.prod.gke.papers.tech',
          conseilNetwork: TezosNetwork.FLORENCENET,
          conseilApiKey: 'airgap00391'
        }
      },
      [BeaconNetworkType.CUSTOM]: {
        identifier: undefined,
        name: network.name || 'Custom Network',
        type: NetworkType.CUSTOM,
        rpcUrl: network.rpcUrl || '',
        blockExplorer: new TezblockBlockExplorer(''),
        extras: {
          network: TezosNetwork.MAINNET,
          conseilUrl: '',
          conseilNetwork: TezosNetwork.MAINNET,
          conseilApiKey: ''
        }
      }
    }

    return new TezosProtocol(
      new TezosProtocolOptions(
        new TezosProtocolNetwork(
          configs[network.type].name,
          configs[network.type].type,
          configs[network.type].rpcUrl,
          configs[network.type].blockExplorer,
          new TezosProtocolNetworkExtras(
            configs[network.type].extras.network,
            configs[network.type].extras.conseilUrl,
            configs[network.type].extras.conseilNetwork,
            configs[network.type].extras.conseilApiKey
          )
        )
      )
    )
  }

  public getResponseByRequestType(requestType: BeaconMessageType) {
    const map: Map<BeaconMessageType, BeaconMessageType> = new Map()
    map.set(BeaconMessageType.BroadcastRequest, BeaconMessageType.BroadcastResponse)
    map.set(BeaconMessageType.OperationRequest, BeaconMessageType.OperationResponse)
    map.set(BeaconMessageType.PermissionRequest, BeaconMessageType.PermissionResponse)
    map.set(BeaconMessageType.SignPayloadRequest, BeaconMessageType.SignPayloadResponse)

    return map.get(requestType)
  }

  public async getConnectedServer(): Promise<string> {
    return await (<any>this.client).storage.get(StorageKey.MATRIX_SELECTED_NODE)
  }

  private getClient(): WalletClient {
    return new WalletClient({ name: 'AirGap Wallet' })
  }
}
