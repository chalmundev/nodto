import * as nearAPI from 'near-api-js';
const { Account, WalletAccount } = nearAPI;
import { near, viewAccount } from '../../utils/near-utils';
import getConfig from '../../utils/config';
const { networkId, contractId, gas, attachedDeposit: defaultAttachedDeposit } = getConfig();

export const initNear = () => async ({ update, dispatch }) => {
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
		try {
			const id = await dispatch(accountView({
				methodName: 'get_id',
				args: {
					account_id: account.accountId
				}
			}))
			console.log('Inviter ID:', id)
		} catch (e) {
			if (!/no id/.test(e)) throw e
		}
		
	}

	await update('', { near, wallet, account });
};

/// actions

export const accountAction = ({
	methodName, args, attachedDeposit = defaultAttachedDeposit
}) => async ({ getState }) => {
	const { account } = getState()
	account.functionCall({
		contractId,
		methodName,
		args,
		gas,
		attachedDeposit,
	})
}

export const accountView = ({
	methodName,
	args,
	key
}) => async ({ update }) => {
	const res = await viewAccount.viewFunction(
		contractId,
		methodName,
		args
	)
	if (key) {
		return await update(key, res);
	}
	return res
}

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

/// views

export const getLists = (accountId) => async ({ update, getState }) => {

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


export const getList = (list_name) => async ({ update, getState }) => {

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