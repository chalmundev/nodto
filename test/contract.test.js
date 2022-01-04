const test = require('ava');
const { createHash } = require('crypto');
const {
	getAccount, init,
	isSuccess,
	recordStart, recordStop,
	parseNearAmount,
} = require('./test-utils');
const getConfig = require("./config");
let {
	contractId,
	gas,
	attachedDeposit,
} = getConfig();

let contractAccount, event1, event2, aliceId, bobId, carolId, alice, bob, carol, aliceHostId;

let difficulty

/// from https://github.com/near-examples/pow-faucet/blob/cfea41c40a75b8c410e6c5e819083b0ef82aaa4e/frontend/src/App.js
const getSalt = async (event_name, account_id) => {
	let msg = [...new TextEncoder('utf-8').encode(`${event_name}:${account_id}:`)];
	msg.push(0, 0, 0, 0, 0, 0, 0, 0);
	msg = new Uint8Array(msg);

	const len = msg.length;
	let bestDifficulty = 0;
	for (let salt = 0; ; ++salt) {
		// browser
		// const hashBuffer = new Uint8Array(await crypto.subtle.digest('SHA-256', msg));
		// nodejs
		const hashBuffer = createHash('sha256').update(msg).digest();

		// compute number of leading zero bits
		let totalNumZeros = 0;
		for (let i = 0; i < hashBuffer.length; ++i) {
			let numZeros = Math.clz32(hashBuffer[i]) - 24;
			totalNumZeros += numZeros;
			if (numZeros < 8) {
				break;
			}
		}
		// checking difficulty
		if (totalNumZeros >= difficulty) {
			console.log('salt: ', salt)
			return salt;
		} else if (totalNumZeros > bestDifficulty) {
			bestDifficulty = totalNumZeros;
		}
		// incrementing salt
		for (let i = len - 8; i < len; ++i) {
			if (msg[i] === 255) {
				msg[i] = 0;
			} else {
				++msg[i];
				break;
			}
		}
	}
}

test('contract is deployed', async (t) => {
	contractAccount = await init();

	t.is(contractId, contractAccount.accountId);
});

test('users initialized', async (t) => {
	aliceId = 'alice.' + contractId;
	bobId = 'bob.' + contractId;
	carolId = 'carol.' + contractId;
	alice = await getAccount(aliceId);
	bob = await getAccount(bobId);
	carol = await getAccount(carolId);

	t.true(true);
});

test('create events', async (t) => {
	event1 = 'event-' + Date.now();

	const res = await contractAccount.functionCall({
		contractId,
		methodName: 'create_event',
		args: {
			event_name: event1,
		},
		gas,
		attachedDeposit,
	});

	t.true(isSuccess(res));

	event2 = 'event-' + Date.now();

	const res2 = await contractAccount.functionCall({
		contractId,
		methodName: 'create_event',
		args: {
			event_name: event2,
			max_invites: 1,
			self_register: true,
		},
		gas,
		attachedDeposit,
	});

	t.true(isSuccess(res2));
});

test('get events', async (t) => {
	const res = await contractAccount.viewFunction(
		contractId,
		'get_events',
		{}
	);
	// console.log(res)

	const all = await Promise.all(res.map((event_name) => 
		contractAccount.viewFunction(
			contractId,
			'get_event_data',
			{
				event_name
			}
		)
	))
	// console.log(all)

	difficulty = parseInt(all[0][0], 10)

	console.log('difficulty', difficulty)

	t.true(res.length >= 1);
});

test('add host', async (t) => {
	const res = await contractAccount.functionCall({
		contractId,
		methodName: 'add_host',
		args: {
			event_name: event1,
			account_id: aliceId,
		},
		gas,
		attachedDeposit,
	});

	aliceHostId = parseInt(Buffer.from(res?.status?.SuccessValue, 'base64'))

	t.true(aliceHostId > 0);
});

test('get hosts', async (t) => {
	const res = await contractAccount.viewFunction(
		contractId,
		'get_hosts',
		{
			event_name: event1
		}
	);

	console.log(res)

	t.true(res.length >= 1);
});

test('bob cannot register without host id', async (t) => {
	try {
		await bob.functionCall({
			contractId,
			methodName: 'register',
			args: {
				event_name: event1,
				salt: await getSalt(event1, bobId),
			},
			gas,
			attachedDeposit,
		});
		t.true(false)
	} catch (e) {
		t.true(true)
	}
});

test('register guest bob', async (t) => {
	await recordStart(contractId);

	const res = await bob.functionCall({
		contractId,
		methodName: 'register',
		args: {
			event_name: event1,
			salt: await getSalt(event1, bobId),
			host_id: aliceHostId,
		},
		gas,
		attachedDeposit,
	});

	await recordStop(contractId);

	t.true(isSuccess(res));
});

test('bob cannot register again for same event', async (t) => {
	try {
		await bob.functionCall({
			contractId,
			methodName: 'register',
			args: {
				event_name: event1,
				salt: await getSalt(event1, bobId),
				host_id: aliceHostId,
			},
			gas,
			attachedDeposit,
		});
		t.true(false)
	} catch (e) {
		t.true(true)
	}
});

test('register guest carol', async (t) => {
	await recordStart(contractId);

	const res = await carol.functionCall({
		contractId,
		methodName: 'register',
		args: {
			event_name: event1,
			salt: await getSalt(event1, carolId),
			host_id: aliceHostId,
		},
		gas,
		attachedDeposit,
	});

	await recordStop(contractId);

	t.true(isSuccess(res));
});

test('get_guests', async (t) => {
	const res = await alice.viewFunction(
		contractId,
		'get_guests',
		{
			event_name: event1,
		}
	);

	console.log(res);

	t.true(res.length >= 1);
});

test('get_host_guests', async (t) => {
	const res = await alice.viewFunction(
		contractId,
		'get_host_guests',
		{
			event_name: event1,
			host_account_id: aliceId,
		}
	);

	console.log(res);

	t.true(res.length >= 1);
});

/// event2
/// default payment for hosts is 0.1 N and 0.01 N attached to cover storage
attachedDeposit = parseNearAmount('0.11')

test('event2: add host', async (t) => {
	const res = await contractAccount.functionCall({
		contractId,
		methodName: 'add_host',
		args: {
			event_name: event2,
			account_id: aliceId,
		},
		gas,
		attachedDeposit,
	});

	t.is(parseInt(Buffer.from(res?.status?.SuccessValue, 'base64')), aliceHostId);
});

test('event2: register guest bob', async (t) => {
	const res = await bob.functionCall({
		contractId,
		methodName: 'register',
		args: {
			event_name: event2,
			salt: await getSalt(event2, bobId),
			host_id: aliceHostId,
		},
		gas,
		attachedDeposit,
	});

	t.true(isSuccess(res));
});

test('event2: max invites reached', async (t) => {
	try {

		await carol.functionCall({
			contractId,
			methodName: 'register',
			args: {
				event_name: event2,
				salt: await getSalt(event2, carolId),
				host_id: aliceHostId,
			},
			gas,
			attachedDeposit,
		});
		t.true(false)
	} catch (e) {
		t.true(true)
	}
});

test('event2: carol self register', async (t) => {
	const res = await carol.functionCall({
		contractId,
		methodName: 'register',
		args: {
			event_name: event2,
			salt: await getSalt(event2, carolId),
		},
		gas,
		attachedDeposit,
	});

	t.true(isSuccess(res));
});

test('alice withdraws payment', async (t) => {
	await recordStart(aliceId);

	const res = await alice.functionCall({
		contractId,
		methodName: 'host_withdraw',
		args: {
			event_name: event2,
		},
		gas,
	});

	await recordStop(aliceId);

	t.true(isSuccess(res));
});
