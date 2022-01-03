const fs = require("fs");
const nearAPI = require("near-api-js");
const getConfig = require("./config");
const { nodeUrl, networkId, contractId } = getConfig();

const {
	keyStores: { InMemoryKeyStore },
	Near,
	Account,
	Contract,
	KeyPair,
	utils: {
		format: { parseNearAmount },
	},
} = nearAPI;

let credentials;
try {
	console.log(`Loading Credentials: ${process.env.HOME}/.near-credentials/${networkId}/${contractId}.json`);
	credentials = JSON.parse(
		fs.readFileSync(
			`${process.env.HOME}/.near-credentials/${networkId}/${contractId}.json`
		)
	);
} catch(e) {
	console.warn(`Loading Credentials: ./neardev/${networkId}/${contractId}.json`);
	credentials = JSON.parse(
		fs.readFileSync(
			`./neardev/${networkId}/${contractId}.json`
		)
	);
}

const keyStore = new InMemoryKeyStore();
keyStore.setKey(
	networkId,
	contractId,
	KeyPair.fromString(credentials.private_key)
);
const near = new Near({
	networkId,
	nodeUrl,
	deps: { keyStore },
});
const { connection } = near;
const contractAccount = new Account(connection, contractId);
contractAccount.addAccessKey = (publicKey) =>
	contractAccount.addKey(
		publicKey,
		contractId,
		contractMethods,
		parseNearAmount("0.1")
	);

module.exports = {
	near,
	credentials,
	keyStore,
	connection,
	contractId,
	contractAccount,
};
