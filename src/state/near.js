import * as nearAPI from 'near-api-js';
const { Account, WalletAccount } = nearAPI;
import { near } from '../../utils/near-utils';
import getConfig from '../../utils/config';
const { networkId, contractId } = getConfig();

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

export const getEvents = () => async ({ update, getState }) => {
	const { viewAccount } = getState()

	const events = await viewAccount.viewFunction(
		contractId,
		'get_events',
		{}
	)

	console.log(events)

	await update('data', { events });

};