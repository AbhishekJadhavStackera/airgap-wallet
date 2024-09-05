const fs = require('fs')
const { sign } = require('@stablelib/ed25519')

const modulePath = './module'
const keyPair = JSON.parse(fs.readFileSync('./keypair.json').toString('utf-8'))
const secretKey = Buffer.from(keyPair.secretKey, 'hex')

const manifestBytes = fs.readFileSync(`${modulePath}/manifest.json`)
const manifest = JSON.parse(manifestBytes.toString('utf-8'))

if (manifest.publicKey !== keyPair.publicKey) {
  console.error('Public key in module/manifest.json does not match the provided public key in keypair.json')
  process.exit(1)
}

const includeBytes = Buffer.concat(manifest.include.map((path) => fs.readFileSync(`${modulePath}/${path}`)))
const filesBytes = Buffer.concat([includeBytes, manifestBytes])

const signature = sign(secretKey, filesBytes)
fs.writeFileSync(`${modulePath}/module.sig`, signature)

console.log(Buffer.from(signature).toString('hex'))
