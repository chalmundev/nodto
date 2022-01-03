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

let contractAccount, event1, event2, aliceId, bobId, alice, bob;

test('contract is deployed', async (t) => {
	contractAccount = await init();

	t.is(contractId, contractAccount.accountId);
});

test('users initialized', async (t) => {
	aliceId = 'alice.' + contractId;
	bobId = 'bob.' + contractId;
	alice = await getAccount(aliceId);
	bob = await getAccount(bobId);

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

test('create a connection', async (t) => {

	await recordStart(contractId);
	
	const res = await alice.functionCall({
		contractId,
		methodName: 'create_connection',
		args: {
			event_name: event1,
			new_connection_id: bobId,
		},
		gas,
		attachedDeposit,
	});

	await recordStop(contractId);

	t.is(res?.status?.SuccessValue, '');
});

test('create another connection', async (t) => {
	const carolId = 'car.' + contractId;

	await recordStart(contractId);

	const res = await alice.functionCall({
		contractId,
		methodName: 'create_connection',
		args: {
			event_name: event1,
			new_connection_id: carolId,
		},
		gas,
		attachedDeposit,
	});
	
	await recordStop(contractId);

	t.is(res?.status?.SuccessValue, '');
});

test('create another connection 2', async (t) => {
	const carolId = 'car1234567812345678.' + contractId;

	await recordStart(contractId);

	const res = await alice.functionCall({
		contractId,
		methodName: 'create_connection',
		args: {
			event_name: event1,
			new_connection_id: carolId,
		},
		gas,
		attachedDeposit,
	});
	
	await recordStop(contractId);

	t.is(res?.status?.SuccessValue, '');
});


test('event 2: create a connection', async (t) => {

	await recordStart(contractId);
	
	const res = await alice.functionCall({
		contractId,
		methodName: 'create_connection',
		args: {
			event_name: event2,
			new_connection_id: bobId,
		},
		gas,
		attachedDeposit,
	});

	await recordStop(contractId);

	t.is(res?.status?.SuccessValue, '');
});

test('event 2: create another connection', async (t) => {
	const carolId = 'car.' + contractId;

	await recordStart(contractId);

	const res = await alice.functionCall({
		contractId,
		methodName: 'create_connection',
		args: {
			event_name: event2,
			new_connection_id: carolId,
		},
		gas,
		attachedDeposit,
	});
	
	await recordStop(contractId);

	t.is(res?.status?.SuccessValue, '');
});

test('event 2: create another connection 2', async (t) => {
	const carolId = 'car1234567812345678.' + contractId;

	await recordStart(contractId);

	const res = await alice.functionCall({
		contractId,
		methodName: 'create_connection',
		args: {
			event_name: event2,
			new_connection_id: carolId,
		},
		gas,
		attachedDeposit,
	});
	
	await recordStop(contractId);

	t.is(res?.status?.SuccessValue, '');
});

test('get_attendees', async (t) => {
	const res = await alice.viewFunction(
		contractId,
		'get_attendees',
		{
			event_name: event1,
		}
	);

	console.log(res);

	t.true(res.length >= 1);
});

test('get_connections', async (t) => {
	const res = await alice.viewFunction(
		contractId,
		'get_connections',
		{
			event_name: event1,
			network_owner_id: aliceId,
		}
	);

	console.log(res);

	t.true(res.length >= 1);
});

test('get_attendees event 2', async (t) => {
	const res = await alice.viewFunction(
		contractId,
		'get_attendees',
		{
			event_name: event2,
		}
	);

	console.log(res);

	t.true(res.length >= 1);
});

test('get_connections event 2', async (t) => {
	const res = await alice.viewFunction(
		contractId,
		'get_connections',
		{
			event_name: event2,
			network_owner_id: aliceId,
		}
	);

	console.log(res);

	t.true(res.length >= 1);
});