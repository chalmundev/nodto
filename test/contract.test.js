const test = require('ava');
const {
	getAccount, init,
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

	t.is(res?.status?.SuccessValue, '');

	event2 = 'event-' + Date.now();

	const res2 = await contractAccount.functionCall({
		contractId,
		methodName: 'create_event',
		args: {
			event_name: event2,
		},
		gas,
		attachedDeposit,
	});

	t.is(res2?.status?.SuccessValue, '');
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

	t.is(res?.status?.SuccessValue, '');
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

	t.is(res?.status?.SuccessValue, '');
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
