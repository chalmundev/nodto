
const { contractAccount } = require('../utils/near-utils');
const getConfig = require("../utils/config");
const {
	contractId, gas,
} = getConfig();

const init = async (owner_id = contractId) => {
	/// try to call new on contract, swallow e if already initialized
	try {
		await contractAccount.functionCall({
			contractId,
			methodName: 'new',
			args: {
				owner_id
			},
			gas
		});
		console.log('contract initialized')
	} catch (e) {
		console.log('contract already initialized');
		if (!/initialized/.test(e.toString())) {
			throw e;
		}
	}
	return contractAccount;
};

init()