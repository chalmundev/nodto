const test = require('ava');
const {
	getAccount, init,
	isSuccess,
	recordStart, recordStop,
} = require('./test-utils');
const getConfig = require("./config");
const {
	contractId,
	gas,
	attachedDeposit,
} = getConfig();

// test.beforeEach((t) => {
// });

let contractAccount, event1, event2, aliceId, bobId, carolId, alice, bob, carol, aliceHostId;

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
			host_id: aliceHostId,
		},
		gas,
		attachedDeposit,
	});

	await recordStop(contractId);

	t.true(isSuccess(res));
});

test('register guest carol', async (t) => {
	await recordStart(contractId);

	const res = await carol.functionCall({
		contractId,
		methodName: 'register',
		args: {
			event_name: event1,
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
		},
		gas,
		attachedDeposit,
	});

	t.true(isSuccess(res));
});
