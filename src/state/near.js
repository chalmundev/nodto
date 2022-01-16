import * as nearAPI from 'near-api-js';
const { Account, WalletAccount } = nearAPI;
import { near, viewAccount, parseNearAmount } from '../../utils/near-utils';
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
		account.account_id = account.accountId
		try {
			account.inviter_id = await dispatch(accountView({
				methodName: 'get_id',
				args: {
					account_id: account.accountId
				}
			}))
			console.log('account.inviter_id', account.inviter_id)
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
	try {
		const { account } = getState()
		account.functionCall({
			contractId,
			methodName,
			args,
			gas,
			attachedDeposit,
		})
	} catch(e) {
		console.warn(e)
	}
}

export const accountView = ({
	methodName,
	args,
	key,
	defaultVal
}) => async ({ update }) => {
	if (defaultVal) {
		update(key, defaultVal)
	}
	try {
		const res = await viewAccount.viewFunction(
			contractId,
			methodName,
			args
		)
		if (key) {
			await update(key, res);
		}
		return res
	} catch(e) {
		if (!/panic_msg: "no/gi.test(e)) throw e
	}
}

/// view helper

export const genViewFunction = (methodName, args) => ({ dispatch }) => ({
	viewFunction: async (from_index, limit) => (await dispatch(accountView({
		methodName,
		args: {
			...args,
			from_index,
			limit,
		},
	}))) || [0, []],
})

/// actions

export const createList = (input) => async ({ update, getState }) => {
	const { account } = getState()

	const res = account.functionCall({
		contractId,
		methodName: 'create_list',
		args: {
			list_name: input.name,
			max_invites: parseInt(input.max_invites, 10),
			payment_amount: parseNearAmount(input.payment_amount),
			difficulty: parseInt(input.difficulty, 10),
			open_register: input.open_register === 'true' ? true : false,
		},
		gas,
		attachedDeposit: defaultAttachedDeposit,
	})
}
