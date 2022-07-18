import App from "@/app"
import IndexRoute from "@routes/index.route"
import validateEnv from "@utils/validateEnv"
import {Commitment} from '@solana/web3.js'
import {COMMITMENT, DEPLOY_MODE, RPC_URL, SECRET_KEY, SKIP_PREFLIGHT} from '@config'
import {Cluster, getKeypairFromSecretKey, walletFromKeyPair, ZoUser} from '../../zo-client'
import {Wallet} from '@project-serum/anchor/src/provider'

validateEnv()


export enum DeployMode {
    Devnet = 'devnet',
    Prod = 'prod',
}

function getCluster() {
    if (DEPLOY_MODE == DeployMode.Prod) {
        return Cluster.Mainnet
    } else if (DEPLOY_MODE == DeployMode.Devnet) {
        return Cluster.Devnet
    }
    throw new Error('Unknown cluster')
}

(async ()=>{
    const keypair = getKeypairFromSecretKey(SECRET_KEY)
    const wallet: Wallet = walletFromKeyPair(keypair)
    const user = await ZoUser.load(wallet, getCluster(), {
        withRealm: true,
        commitment: COMMITMENT as Commitment,
        skipPreflight: SKIP_PREFLIGHT=='true',
        rpcUrl: RPC_URL
    })
    await user.subscribe()
    await user.state.subscribeToAllOrderbooks()
    const app = new App([new IndexRoute(user)])
    app.listen()
})()

