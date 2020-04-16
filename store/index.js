import Dash from 'dash'
// Decrypted mnemonic: potato south distance mind dress join vital topic oyster work catch animal
const DashmachineCrypto = require('dashmachine-crypto')
const CryptoJS = require('crypto-js')

// eslint-disable-next-line no-unused-vars

const deriveDip9DelegatedCredentialsFromTimestamp = (timestamp) => {
  console.log('deriveDip9DelegatedCredentialsFromTimestamp()')
  const curIdentityHDKey = client.account.getIdentityHDKey(0, 'user')
  console.log({ curIdentityHDKey })
  const specialFeatureKey = curIdentityHDKey.derive(
    `m/9'/1'/4'/1'/${timestamp}` // LIVENET switch to 9/5
  )
  console.log({ specialFeatureKey })

  const privateKey = specialFeatureKey.privateKey.toString()
  const publicKey = specialFeatureKey.publicKey.toString()
  // const address = derivedByArgument.privateKey.toAddress()

  console.log({
    privateKey,
    publicKey,
  })

  return { privateKey, publicKey }
}

// const crypto = require('crypto');
function randrange(min, max) {
  var range = max - min
  if (range <= 0) {
    throw new Error('max must be larger than min')
  }
  var requestBytes = Math.ceil(Math.log2(range) / 8)
  if (!requestBytes) {
    // No randomness required
    return min
  }
  var maxNum = Math.pow(256, requestBytes)
  var ar = new Uint8Array(requestBytes)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    window.crypto.getRandomValues(ar)

    var val = 0
    for (var i = 0; i < requestBytes; i++) {
      val = (val << 8) + ar[i]
    }

    if (val < maxNum - (maxNum % range)) {
      return min + (val % range)
    }
  }
}
// const hash = crypto.createHash('sha256').update('hello1').digest('hex');
// const hash2 = crypto.createHash('sha256').update(hash).digest('hex');
// console.log(hash);
// console.log(hash2);

let client
let clientTimeout
let registerIdentityInterval
let registerNameInterval
let registerUserInterval
let loginPinInterval

// mnemonic: "come sight trade detect travel hazard suit rescue special clip choose crouch"
const getInitState = () => {
  console.log('getinitstate')
  return {
    fundingAddress: '',
    accounts: [],
    isClientError: false,
    isSyncing: false,
    // mnemonic: null, // "drastic raise hurry step always person bundle end humble toss estate inner",
    // mnemonic:
    // 'olympic dance spider bid soap butter cradle penalty waste sand situate vessel',
    mnemonic: null,
    identityId: null,
    loginPin: '',
    loginPinTimeLeft: 0,
    curActionRequest: {},
    lastRequests: {},
    name: {
      label: null,
      isRegistered: false,
      isValid: false,
      docId: null,
    },
    snackbar: {},
    signups: [],
  }
}
export const state = () => getInitState()

export const getters = {
  lastRequest: (state) => ({ contractId, type }) => {
    const { lastRequests } = state
    const request = lastRequests[contractId]
      ? lastRequests[contractId][type]
      : null
    return request
  },
  curActionRequest(state) {
    return state.curActionRequest
  },
  curAccountDocId(state) {
    return state.name.docId
  },
  signups(state) {
    const { signups } = state
    console.log('signups getter', signups)
    return signups
  },
  accounts(state) {
    const { accounts } = state
    return accounts
  },
  freshAddress() {
    const address = client.account.getUnusedAddress().address
    return address
  },
  async confirmedBalance() {
    // TODO weird thing: this function fires before await initWallet() resolves
    // console.log("get balance not ready Confirmed Balance", client.account.getConfirmedBalance());
    // console.log("get balance not ready Unconfirmed Balance", client.account.getUnconfirmedBalance());

    // FIXME When client is set to undefined, this getter is still called and throws
    try {
      await client.isReady()
      console.log(
        'get balance Confirmed Balance',
        client.account.getConfirmedBalance()
      )
      console.log(
        'get balance Unconfirmed Balance',
        client.account.getUnconfirmedBalance()
      )
      return client.account.getConfirmedBalance()
    } catch (e) {
      console.log('Error getting balance, client is: ', client)
      return -1
    }
  },
  setupFinished(state) {
    console.log(state)
    return state.mnemonic && state.identityId
  },
  clientIsReady() {
    return client && client.isReady()
  },
}
export const mutations = {
  setFundingAddress(state, address) {
    console.log('setting funding address', address)
    state.fundingAddress = address
  },
  setCurActionRequest(state, actionRequest) {
    console.log('mutation', actionRequest)
    state.curActionRequest = actionRequest
  },
  setCurActionRequestLoading(state, isLoading) {
    state.curActionRequest.loading = isLoading
  },
  resetCurActionRequest(state) {
    // TODO make overlint dynamic with polling dapps
    state.curActionRequest = {
      overline: 'Jembe',
      headline: 'Waiting for action..',
      payload: 'Submit a jam with your user / pin and it will appear here.',
      actionRequired: false,
      loading: false,
    }
  },
  setSignupContracts(state, signupContracts) {
    state.signupContracts = signupContracts
  },
  setSignups(state, signups) {
    state.signups = signups
  },
  resetState() {
    console.log('resetstate')
    this.replaceState(getInitState())
  },
  setState(state, newState) {
    console.log('setstate')
    this.replaceState(newState)
  },
  addAccount(state, account) {
    state.accounts.push(account)
  },
  removeAccount(state, index) {
    state.accounts.splice(index, 1)
  },
  clearClientErrors(state) {
    state.clientErrorMsg = ''
    state.isClientError = false
    state.isSyncing = false
  },
  setClientErrors(state, msg) {
    state.clientErrorMsg = msg
    state.isClientError = true
    state.isSyncing = false
  },
  setSyncing(state, isSyncing) {
    state.isSyncing = isSyncing
  },
  setLoginPin(state) {
    const randomNum = randrange(0, 999999)
    state.loginPin = ('000000' + randomNum).slice(-6)
    // const randomNum = new Uint8Array(6)
    // const bytes = window.crypto.getRandomValues(randomNum)
    // state.loginPin = bytes.reduce((accu, byte) => {
    //   return accu + (byte % 10)
    // }, '')
  },
  setLoginPinTimeLeft(state, ms) {
    state.loginPinTimeLeft = ms
  },
  setLastRequest(state, request) {
    console.log({ request })
    if (!state.lastRequests[request.contractId]) {
      state.lastRequests[request.contractId] = {}
    }
    state.lastRequests[request.contractId][request.$type] = request
  },
  setSnackBar(state, snackbar) {
    state.snackbar = snackbar
  },
  setMnemonicAsIs(state, mnemonic) {
    state.mnemonic = mnemonic
  },
  setIdentity(state, identityId) {
    state.identityId = identityId
  },
  setName(state, name) {
    state.name.label = name
    state.name.isRegistered = false
  },
  setNameRegistered(state, isRegistered) {
    state.name.isRegistered = isRegistered
  },
  setNameValid(state, isValid) {
    state.name.isValid = isValid
  },

  setNameDocId(state, docId) {
    state.name.docId = docId
  },
}
export const actions = {
  getCurPubKey() {
    const curIdentityHDKey = client.account.getIdentityHDKey(0, 'user')
    console.log({ publicKeyString: curIdentityHDKey.publicKey.toString() })

    const publicKey = curIdentityHDKey.publicKey.toString()
    return publicKey
  },
  mnemonicPlaintext() {
    if (client && client.wallet) {
      return client.wallet.mnemonic
    } else {
      return ''
    }
  },
  // eslint-disable-next-line no-unused-vars
  encryptMnemonic({ state }, { mnemonic, pin }) {
    console.log('encrypting mnemonic', mnemonic)
    if (mnemonic === null) {
      return null // We need to explicitly return `null` to initialize a new mnemonic
    }
    if (mnemonic === undefined) {
      return undefined // We need to explicitly return `undefined` to initialize without a wallet
    } else {
      return CryptoJS.AES.encrypt(mnemonic, pin).toString()
    }
  },
  // eslint-disable-next-line no-unused-vars
  decryptMnemonic({ dispatch }, { encMnemonic, pin }) {
    console.log('decrypting mnemonic', encMnemonic)
    switch (encMnemonic) {
      case null:
        return null // We need to explicitly return `null` to initialize a new mnemonic
      case undefined:
        return undefined // We need to explicitly return `null` to initialize a new mnemonic
      default:
        try {
          return CryptoJS.AES.decrypt(encMnemonic, pin).toString(
            CryptoJS.enc.Utf8
          )
        } catch (e) {
          console.error(e)
          // dispatch('showSnackbar', {
          //   text: 'Wrong PIN / Password',
          // })
          throw 'You entered the wrong PIN / Password'
        }
    }
  },
  async setAndEncMnemonic({ state, dispatch, commit }, { mnemonic, pin }) {
    console.log('setMnemonic', { mnemonic, pin })
    const encMnemonic = await dispatch('encryptMnemonic', { mnemonic, pin })
    commit('setMnemonicAsIs', encMnemonic)
    console.log('state.mnemonic after set', { afterSet: state.mnemonic })
  },
  // eslint-disable-next-line no-unused-vars
  async sendDash({ dispatch }, { toAddress, satoshis }) {
    const { account } = client
    try {
      const transaction = account.createTransaction({
        recipient: toAddress,
        satoshis: satoshis,
      })
      const result = await account.broadcastTransaction(transaction)
      console.log('Transaction broadcast!\nTransaction ID:', result)
      dispatch('showSnackbar', {
        text: 'Payment sent\n' + result,
        color: 'green',
      })
      // dispatch('refreshWallet')
    } catch (e) {
      console.error('Something went wrong:', e)
      dispatch('showSnackbar', {
        text: e.message,
      })
      throw e
    }
  },
  async fetchSignups({ dispatch, commit, getters }) {
    console.log('fetchSignups()')
    await client.isReady()
    const queryOpts = {
      startAt: 1,
      limit: 5, // TODO fix select DISTINCT problem and paginate dApps
      orderBy: [['unixTimestamp', 'desc']],
      where: [['accountDocId', '==', getters['curAccountDocId']]],
    }
    const dappName = 'primitives'
    const typeLocator = 'Signup'

    const signups = await dispatch('queryDocuments', {
      dappName,
      typeLocator,
      queryOpts,
    })
    const signupsJSON = signups.map((signup) => {
      return signup.toJSON()
    })
    console.log({ signupsJSON })
    commit('setSignups', signupsJSON)
  },
  async fetchSignupContracts({ commit, getters }) {
    console.log('fetchSignupContracts()')

    const signups = getters['signups']

    const promises = signups.map(async (signup) => {
      const contract = await client.platform.contracts.get(signup.contractId)
      console.log({ contract })
      return contract
    })
    const signupContracts = await Promise.all(promises)
    console.log({ signupContracts })

    commit('setSignupContracts', signupContracts)

    // const queryOpts = {
    //   startAt: 1,
    //   limit: 5, // TODO fix select DISTINCT problem and paginate dApps
    //   orderBy: [['unixTimestamp', 'desc']]
    //   // TODO query for accountUserId
    // }
    // const dappName = 'primitives'
    // const typeLocator = 'Signup'

    // const signups = await dispatch('queryDocuments', {
    //   dappName,
    //   typeLocator,
    //   queryOpts
    // })
    // const signupsJSON = signups.map((signup) => {
    //   return signup.toJSON()
    // })
    // console.log({ signupsJSON })
    // commit('setSignupContracts', signupsJSON)
  },
  async initOrCreateAccount({ commit, dispatch, state }, { mnemonicPin }) {
    // Get client to isReady state (with existing mnemonic or creating a new one)
    // Check if we have a balance, if not, get a drip
    // If Getting a drip, wait via setInterval for balance
    // +if error or timeout, instruct for manual balance increase // TODO implement wait for balance timeout
    // Once we have a balance:
    // (check if we have an identity, if not)
    // create identity, commit identity
    // create name, set isRegistered = true // TODO implement recover identity and name from dpp
    // catch errors at each step and self heal // TODO tests
    try {
      console.log('initorcreate, dispatch init')
      await dispatch('initWallet', { mnemonicPin })
    } catch (e) {
      console.dir({ e }, { depth: 5 })
      let message = e.message

      // FIXME decryptMnemonic clearly needs better error handling
      if (message === 'Expect mnemonic to be provided') {
        message = 'You entered the wrong PIN / Password.'
      }
      commit('setClientErrors', 'Connecting to Evonet: ' + message)
    }
    console.log("I'm done awaiting client.isReady()....")

    const confirmedBalance = await this.confirmedBalance
    console.log('Confirmed Balance: ' + confirmedBalance)
    if (confirmedBalance > 500000) {
      if (this.$store.state.identityId === null) {
        try {
          this.registerIdentity()
        } catch (e) {
          console.log('No success in registering an identity, trying again ...')
          dispatch('showSnackbar', {
            text: e.message,
          })
          this.registerIdentity()
        }
      } else {
        console.log('Found existing identityId')
        console.log(this.$store.state.identityId)
      }
    } else {
      try {
        // TODO reenable faucet
        // await this.getMagicInternetMoney()
        // await this.getMagicInternetMoney( // get two drips -> two UTXOs, register idenity and name without waiting for chained confirmations
        console.log('not getting a drip, faucet is broken')
      } catch (e) {
        this.$store.commit(
          'setClientErrors',
          e.message +
            ' | Faucet not responding, manually send some evoDash to ' +
            this.freshAddress
        )
      }

      // TODO need to check if identity belongs to mnemonic
      if (state.identityId === null) {
        dispatch('registerIdentityOnceBalance')
      } else {
        console.log('Found existing identityId')
        console.log(state.identityId)
      }
    }
  },
  resetStateKeepAccounts({ state, commit }) {
    console.log({ state })
    console.log(state.accounts)
    const { accounts } = state
    console.log({ accounts })
    const initState = getInitState()
    console.log({ initState })
    initState.accounts = accounts
    console.log({ initState })
    commit('setState', initState)
    console.log({ state })
  },
  clearSession({ dispatch }) {
    // TODO refactor intervalls in an object and iterate them in clearAllIntervals()
    // TODO wrap setInterval and setTimout in setIntervalIfLoggedIn to clear itself if global stat login var is false
    clearInterval(loginPinInterval)
    clearInterval(registerIdentityInterval)
    clearInterval(registerNameInterval)
    clearInterval(registerUserInterval)
    clearTimeout(clientTimeout)

    if (client) client.disconnect()
    dispatch('resetStateKeepAccounts')
    client = undefined // DANGER Uh oh, we're setting global vars
  },
  async addCurrentAccount({ state, commit, dispatch }, pin) {
    const account = {}
    console.log('add current account', client.wallet.mnemonic)
    account.mnemonic = await dispatch('encryptMnemonic', {
      mnemonic: client.wallet.mnemonic,
      pin,
    })
    // account.mnemonic = this.encryptMnemonic(client.wallet.mnemonic, pin)
    account.identityId = state.identityId
    account.docId = state.name.docId
    account.label = state.name.label

    commit('addAccount', account)
  },
  async verifyAppRequest({ state }, actionRequest) {
    // TODO remove async
    const { loginPin } = state
    console.log(loginPin)
    const dappUserIdentity = await client.platform.identities.get(
      '9jm6AbrR5wQTYp3SWfDJAmX7ca3VkwTvFXmUp8hXWjUe'
    )
    console.log(dappUserIdentity)
    const dappUserPublicKey = dappUserIdentity.publicKeys[0].data.toString(
      'base64'
    )
    // foundUser.publicKey = foundUser.identity.publicKeys[0].data;

    const curIdentityPrivKey = client.account.getIdentityHDKey(0, 'user')
      .privateKey

    // const plainUID_PIN = loginPin.toString()
    const plainUID_PIN = '54321' // TODO make dynamic

    const hashedAndEncryptedUID_PIN = actionRequest.uidPin

    const decryptedUID_PIN = DashmachineCrypto.decrypt(
      curIdentityPrivKey,
      hashedAndEncryptedUID_PIN,
      dappUserPublicKey
    ).data
    const verified = DashmachineCrypto.verify(plainUID_PIN, decryptedUID_PIN)
    console.log({ actionRequest }, 'pin verified?', verified)

    return verified
  },
  // TODOO add targetcontractid to contract
  async processActionRequestPayload({ state, getters }, { actionRequest }) {
    console.log({ actionRequest })
    const { payload, $ownerId } = actionRequest.doc
    console.log({ payload, $ownerId })
    const userIdentity = await client.platform.identities.get(state.identityId)
    client.wallet.getUnconfirmedBalance

    ///
    /// Here switch and sort out the primitives / init DashJS.client for specific contracts
    ///

    const timestampMS = Date.now()
    const timestamp = Math.floor(timestampMS / 1000)

    const primitiveType = Object.keys(payload)[0]
    console.log({ primitiveType })
    let document = {}

    switch (primitiveType) {
      case 'DelegatedCredentials':
        {
          const {
            privateKey,
            publicKey,
          } = deriveDip9DelegatedCredentialsFromTimestamp(timestamp)

          document = {
            encPvtKey: privateKey,
            pubKey: publicKey,
            delegateIdentityId: actionRequest.doc.$ownerId, // Using the idenity of the doc that was verified against pin
            unixTimestampExpiration: timestamp + 1200, // TODO change 20min (1200s) timeout to variable
            //  timestamp = Math.floor(Date.now() / 1000) // For next contract iteration
          }
        }
        break

      default:
        Object.assign(document, payload[primitiveType])
        document.unixTimestamp = timestamp
        document.accountDocId = getters['curAccountDocId'] // TODO V2 should be userId
        document.contractId = actionRequest.doc.$dataContractId
      // dappName TODO currently insecure duplication by dApp Browser
      // dappIcon
    }

    const payloadDocument = await client.platform.documents.create(
      `primitives.${primitiveType}`, // TODO make contractId + typeselector dynamic
      userIdentity,
      document // TODO make dynamic
    )
    console.log('Broadcasting DocumentActionRequest payload:')
    console.dir({ payloadDocument })
    console.dir({ document })
    const documentBatch = {
      create: [payloadDocument],
      replace: [],
      delete: [],
    }

    const submitStatus = await client.platform.documents.broadcast(
      documentBatch,
      userIdentity
    )
    console.log({ submitStatus })
  },
  async encryptStuff({ state }, appDoc) {
    const { loginPin } = state
    const curIdentityPrivKey = client.account.getIdentityHDKey(0, 'user')
      .privateKey
    console.log('curIdentityPrivKey', curIdentityPrivKey.toString())

    const senderPublicKey = 'Ag/YNnbAfG0IpNeH4pfMzgqIsgooR36s5MzzYJV76TpO' // TODO derive from dash identity

    //reference: Vendor userID (Reference)
    // //CW decrypts the nonce
    const encryptedNonce = appDoc.data.nonce
    console.log('encryptedNonce', encryptedNonce)
    const decryptedNonce = DashmachineCrypto.decrypt(
      curIdentityPrivKey,
      encryptedNonce,
      senderPublicKey
    ).data
    console.log('decrypted nonce:', decryptedNonce)
    //vid_pin: Encrypted Hash of [Vendor nonce + Vendor userID + CW Pin)
    const plainVID_PIN = decryptedNonce.concat(
      state.wdsVendorId,
      loginPin.toString()
    )
    console.log('plainVID_PIN', plainVID_PIN)
    //hash then encrypt for the vendors PK
    const hashedVID_PIN = DashmachineCrypto.hash(plainVID_PIN).data
    console.log('hashedVID_PIN', hashedVID_PIN)
    const encryptedVID_PIN = DashmachineCrypto.encrypt(
      curIdentityPrivKey,
      hashedVID_PIN,
      senderPublicKey
    ).data
    console.log('encryptedVID_PIN', encryptedVID_PIN)

    //status: Encrypted [status+entropy] (0 = valid)
    const statusCode = 0
    const status = statusCode
      .toString()
      .concat(DashmachineCrypto.generateEntropy())
    console.log('status', status)
    const encryptedStatus = DashmachineCrypto.encrypt(
      curIdentityPrivKey,
      status,
      senderPublicKey
    ).data
    console.log('encryptedStatus', encryptedStatus)

    //LoginResponse DocData
    const loginResponseDocOpts = {
      reference: state.wdsVendorId,
      vid_pin: encryptedVID_PIN,
      status: encryptedStatus,
      temp_timestamp: appDoc.data.temp_timestamp,
    }
    console.log('loginResponseDocOpts')
    console.dir(loginResponseDocOpts)

    const userIdentity = await client.platform.identities.get(state.identityId)
    const loginResponseDocument = await client.platform.documents.create(
      'wdsContract.TweetResponse',
      userIdentity,
      loginResponseDocOpts
    )
    console.log('loginReponse doc:')
    console.dir(loginResponseDocument)
    const documentBatch = {
      create: [loginResponseDocument],
      replace: [],
      delete: [],
    }

    const submitStatus = await client.platform.documents.broadcast(
      documentBatch,
      userIdentity
    )
    console.log(submitStatus)
  },
  freshLoginPins({ commit, state }) {
    if (loginPinInterval) clearInterval(loginPinInterval)
    commit('setLoginPin')

    const refreshInterval = 300000
    loginPinInterval = setInterval(function() {
      if (state.loginPinTimeLeft < 1) {
        commit('setLoginPin')
        commit('setLoginPinTimeLeft', refreshInterval)
      } else {
        commit('setLoginPinTimeLeft', state.loginPinTimeLeft - 1000)
      }
    }, 1000)
  },
  showSnackbar({ commit }, { text, color = 'red' }) {
    commit('setSnackBar', { show: true, text, color, time: Date.now() })
  },
  async initWallet({ state, commit, dispatch }, { mnemonicPin }) {
    commit('clearClientErrors')
    console.log('Initializing Dash.Client with mnemonic: ')
    console.log('Encrypted mnemonic:', state.mnemonic)
    console.log(
      'Decrypted mnemonic:',
      await dispatch('decryptMnemonic', {
        encMnemonic: state.mnemonic,
        pin: mnemonicPin,
      })
    ) // TODO DEPLOY ask user for pin
    client = new Dash.Client({
      seeds: [
        { service: 'seed-1.evonet.networks.dash.org' },
        { service: 'seed-2.evonet.networks.dash.org' },
        { service: 'seed-3.evonet.networks.dash.org' },
        { service: 'seed-4.evonet.networks.dash.org' },
        { service: 'seed-5.evonet.networks.dash.org' },
      ],
      mnemonic: await dispatch('decryptMnemonic', {
        encMnemonic: state.mnemonic,
        pin: mnemonicPin,
      }),
      apps: {
        dpns: {
          contractId: '7PBvxeGpj7SsWfvDSa31uqEMt58LAiJww7zNcVRP1uEM',
        },
        primitives: {
          contractId: '9FhqPBkmrmNkoUGw5qQgv7x6MUJJNNS4sfrTeUB1UsYk',
        },
        users: {
          contractId: 'CGre4SQZKtZvirZLmtLQfsZZFTg9zv6PdjnoHb5ULS2a',
        },
      },
    })

    // Timeout isReady() since we can't catch timeout errors
    clientTimeout = setTimeout(() => {
      commit('setClientErrors', 'Connection to Evonet timed out.')
    }, 500000) // TODO DEPLOY set sane timeout
    const isReady = await client.isReady()
    clearInterval(clientTimeout)

    //
    //
    // DEPLOY remove cli debug outputs
    //
    //
    const curIdentityHDKey = client.account.getIdentityHDKey(0, 'user')
    console.log({ curIdentityHDKey })
    console.log({ publicKey: curIdentityHDKey })
    console.log({ publicKeyString: curIdentityHDKey.publicKey.toString() })
    console.log(curIdentityHDKey.toString('base64'))

    const curIdentityPrivKey = client.account.getIdentityHDKey(0, 'user')
    console.log('private key', curIdentityPrivKey.toString())
    // const curIdentityPubKey = client.account.getIdentityHDKey(0, 'user')
    //   .publickey
    // console.log('public key', curIdentityPubKey.toString())

    var derivedByArgument = curIdentityPrivKey.derive("m/1/2'")
    console.log({ derivedByArgument })
    console.log('derived pv key', derivedByArgument.privateKey)
    console.log(
      'derived pv key to address',
      derivedByArgument.privateKey.toAddress()
    )
    console.log(derivedByArgument.toString())

    let address = derivedByArgument.privateKey.toAddress()
    let privateKey = derivedByArgument.privateKey.toString()
    let publicKey = derivedByArgument.publicKey

    console.log({
      address,
      privateKey,
      publicKey,
      pubstring: publicKey.toString(),
    })

    // const curIdentityHDKey = client.account.getIdentityHDKey(0, 'user')
    // .publicKey
    // console.log({ curIdentityHDKey })
    const encryptedVID_PIN = DashmachineCrypto.encrypt(
      curIdentityPrivKey,
      '54321',
      '0201e5b73c30a443081a0157f96e0e4ed5dfca3dcf304be86970be13c87cad6609'
    ).data
    console.log('encryptedVID_PIN', encryptedVID_PIN)

    console.log({ isReady })
    // commit('setAndEncMnemonic', {
    //   mnemonic: client.wallet.mnemonic,
    //   pin: '12345',
    // })
    console.log({ client })

    const { account } = client

    console.log('init Funding address', account.getUnusedAddress().address)
    commit('setFundingAddress', account.getUnusedAddress().address)
    console.log('init Confirmed Balance', account.getConfirmedBalance())
    console.log('init Unconfirmed Balance', account.getUnconfirmedBalance())

    return client.isReady()
  },
  async getMagicInternetMoney() {
    console.log('Awaiting faucet drip..')
    const address = client.account.getUnusedAddress().address
    console.log('... for address: ' + address)
    try {
      const req = await this.$axios.get(
        `https://qetrgbsx30.execute-api.us-west-1.amazonaws.com/stage/?dashAddress=${address}`,
        { crossdomain: true }
      )
      // const req = await this.$axios.get(`http://localhost:5000/evodrip/us-central1/evofaucet/drip/${address}`)
      console.log('... faucet dropped.')
      console.log(req)
    } catch (e) {
      console.log(e)
      throw e
    }
  },
  async registerIdentity({ commit }) {
    console.log('Registering identity...')
    try {
      await client.isReady()
      console.log(await client.isReady())
      const identity = await client.platform.identities.register()
      commit('setIdentity', identity.id)
      console.log({ identity })
    } catch (e) {
      console.log('identity register error')
      console.log(e)
    }
  },
  registerIdentityOnceBalance({ dispatch }) {
    if (registerIdentityInterval) clearInterval(registerIdentityInterval)

    registerIdentityInterval = setInterval(function() {
      console.log('Waiting for positive balance to register identity..')
      console.log(
        'init Funding address',
        client.account.getUnusedAddress().address
      )
      console.log(client.account.getTotalBalance())
      console.log(client.account.getConfirmedBalance())
      console.log(client.account.getUnconfirmedBalance())
      if (client.account.getConfirmedBalance() > 0) {
        dispatch('registerIdentity')
        clearInterval(registerIdentityInterval)
      }
    }, 5000)
  },
  async registerNameOnceBalance({ state, dispatch }) {
    if (registerNameInterval) clearInterval(registerNameInterval)
    console.log('Awaiting client ..')
    const clientReady = await client.account.isReady()
    console.log('..client is ready.', clientReady)
    if (client.account.getConfirmedBalance() > 10000 && state.identityId) {
      dispatch('registerName')
    } else {
      registerNameInterval = setInterval(function() {
        console.log('Waiting for positive balance to register name..')
        console.log(client.account.getConfirmedBalance())
        if (client.account.getConfirmedBalance() > 10000 && state.identityId) {
          dispatch('registerName')
          clearInterval(registerNameInterval)
        }
      }, 5000)
    }
  },
  async registerUserOnceBalance({ state, dispatch }, { userDoc }) {
    if (registerUserInterval) clearInterval(registerUserInterval)
    console.log('Awaiting client ..')
    const clientReady = await client.account.isReady()
    console.log('..client is ready.', clientReady)
    if (client.account.getConfirmedBalance() > 10000 && state.identityId) {
      dispatch('registerUser', { userDoc })
    } else {
      registerUserInterval = setInterval(function() {
        console.log('Waiting for positive balance to register name..')
        console.log(client.account.getConfirmedBalance())
        if (client.account.getConfirmedBalance() > 10000 && state.identityId) {
          dispatch('registerUser')
          clearInterval(registerUserInterval)
        }
      }, 5000)
    }
  },
  async registerUser({ dispatch }, { userDoc }) {
    console.log('Registering User with UserDoc: ', userDoc)
    console.log('Registering User with UserDoc json: ', userDoc.toJSON())
    console.log(state)
    console.log(this.state.name.label)
    console.log(this.state.identityId)
    const identity = await client.platform.identities.get(this.state.identityId)
    console.log('Found valid identity:')
    console.log({ identity })

    const curIdentityHDKey = client.account.getIdentityHDKey(0, 'user')
    console.log({ publicKeyString: curIdentityHDKey.publicKey.toString() })

    const publicKey = curIdentityHDKey.publicKey.toString()
    // const identity = await client.platform.identities.get(this.state.identityId)

    console.log('Registering user')
    try {
      const document = {
        name: userDoc.data.label,
        pubkey: publicKey,
        dpnsDocId: userDoc.id,
        identityId: userDoc.ownerId,
      }
      console.log({ document })

      const payloadDocument = await client.platform.documents.create(
        `users.Users`,
        identity,
        document
      )

      const documentBatch = {
        create: [payloadDocument],
        replace: [],
        delete: [],
      }

      const submitStatus = await client.platform.documents.broadcast(
        documentBatch,
        identity
      )
      console.log(submitStatus)
    } catch (e) {
      dispatch('showSnackbar', {
        text: e.message + ' | Choose a new name.',
      })
      this.commit('setSyncing', false)
      console.log({ pub: identity.publicKeys[0].toString() })
    }
  },
  async registerName({ commit, dispatch }) {
    console.log('Registering Name with identityId: ')
    console.log(this.state.name.label)
    console.log(this.state.identityId)
    const identity = await client.platform.identities.get(this.state.identityId)
    console.log('Found valid identity:')
    console.log({ identity })

    console.log('Registering name')
    try {
      const createDocument = await client.platform.names.register(
        this.state.name.label,
        identity
      )
      console.log({ createDocument })
      const [doc] = await client.platform.documents.get('dpns.domain', {
        where: [
          ['normalizedParentDomainName', '==', 'dash'],
          ['normalizedLabel', '==', this.state.name.label.toLowerCase()],
        ],
      })
      console.log({ doc })

      // TODO refactor sessionStorage to match accounts
      commit('setNameDocId', doc.id)
      commit('setNameRegistered', true)
      dispatch('registerUserOnceBalance', { userDoc: doc })
    } catch (e) {
      dispatch('showSnackbar', {
        text: e.message + ' | Choose a new name.',
      })
      this.commit('setSyncing', false)
    }
  },
  async dashNameExists({ dispatch }, name) {
    let queryOpts = {
      where: [
        ['normalizedParentDomainName', '==', 'dash'],
        ['normalizedLabel', '==', name.toLowerCase()],
      ],
      startAt: 0,
      limit: 1,
      orderBy: [['normalizedLabel', 'asc']],
    }
    console.log('Checking if name exists on dpns..')
    try {
      const searchNames = await client.platform.documents.get(
        'dpns.domain',
        queryOpts
      )
      console.log({ searchNames })
      console.log(searchNames.length)
      if (searchNames.length == 1) {
        return true
      } else {
        return false
      }
    } catch (e) {
      dispatch('showSnackbar', { text: e.message })
      console.error('Something went wrong:', e)
    }
  },
  async queryDocuments(
    { dispatch, commit },
    {
      dappName,
      typeLocator,
      queryOpts = {
        limit: 1,
        startAt: 1,
      },
    }
  ) {
    console.log('Querying documents...')
    console.log({ dappName, typeLocator, queryOpts })
    commit('setSyncing', true)
    try {
      await client.isReady()
      const documents = await client.platform.documents.get(
        `${dappName}.${typeLocator}`,
        queryOpts
      )
      console.log({ documents })
      return documents
    } catch (e) {
      dispatch('showSnackbar', { text: e, color: 'red' })
      console.error('Something went wrong:', e)
    } finally {
      commit('setSyncing', false)
    }
  },
  async getContract({ state }) {
    await client.isReady()
    const contract = await client.platform.contracts.get(state.wdsContractId)
    console.log({ contract })
    return contract
  },
}
