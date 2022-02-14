const contractName = 'dev-1644797942665-16666241873770';

module.exports = function getConfig(network = 'testnet') {
	let config = {
		networkId: "testnet",
		nodeUrl: "https://rpc.testnet.near.org",
		walletUrl: "https://wallet.testnet.near.org",
		helperUrl: "https://helper.testnet.near.org",
		contractName,
	};

	switch (network) {
	case 'testnet':
		config = {
			explorerUrl: "https://explorer.testnet.near.org",
			...config,
			GAS: "200000000000000",
			gas: "200000000000000",
			attachedDeposit: '20000000000000000000000', // 0.02 N (1kb storage)
			NEW_ACCOUNT_AMOUNT: '1000000000000000000000000',
			NEW_CONTRACT_AMOUNT: '5000000000000000000000000',
			contractId: contractName,
			isBrowser: new Function("try {return this===window;}catch(e){ return false;}")()
		};
		break;
	}

	return config;
};
