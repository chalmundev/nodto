import * as nearAPI from 'near-api-js';
const { Account, WalletAccount } = nearAPI;
import { near } from '../../utils/near-utils';
import getConfig from '../../utils/config';
const { networkId, contractId, gas, attachedDeposit } = getConfig();

export const initNear = () => async ({ update }) => {
	const wallet = new WalletAccount(near);

	wallet.signIn = () => {
		wallet.requestSignIn(contractId, 'Blah Blah');
	};
	const signOut = wallet.signOut;
	wallet.signOut = () => {
		signOut.call(wallet);
		update('', { account: null });
	};

	wallet.signedIn = wallet.isSignedIn();
    
	let account;
	if (wallet.signedIn) {
		account = wallet.account();
	}

	const viewAccount = new Account(near.connection, networkId)

	await update('', { near, wallet, account, viewAccount });
};

export const getLists = (accountId) => async ({ update, getState }) => {
	const { viewAccount } = getState()

	let lists = []
	try {
		lists = await viewAccount.viewFunction(
			contractId,
			'get_lists_by_owner',
			{
				account_id: accountId
			}
		)
	} catch (e) {
		if (!/no owner/.test(e.toString())) {
			throw e;
		}
	}

	await update('data', { lists });
};

export const createList = (input) => async ({ update, getState }) => {
	const { account } = getState()

	const res = account.functionCall({
		contractId,
		methodName: 'create_list',
		args: {
			list_name: input.name,
		},
		gas,
		attachedDeposit,
	})
}


export const getList = (list_name) => async ({ update, getState }) => {
	const { viewAccount } = getState()

	const inviters = await viewAccount.viewFunction(
		contractId,
		'get_inviters',
		{
			list_name
		}
	)

	const invitees = await viewAccount.viewFunction(
		contractId,
		'get_invitees',
		{
			list_name
		}
	)

	await update('data.list', { inviters, invitees });
};