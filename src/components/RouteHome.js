import React from 'react';

import { accountView } from '../state/near';
import { ViewLists } from './ViewLists';

export const RouteHome = ({ state, update, dispatch }) => {

	if (!state.account?.accountId) {
		return <>
			<p>Not Signed In - go to account to sign</p>
		</>
	}

	const { 
		account: { account_id },
	} = state

	return <>
		<h3>My Lists</h3>
		<ViewLists {...{
			state,
			listKey: 'lists_by_owner',
			creatable: true,
			viewFunction: () => dispatch(accountView({
				methodName: 'get_lists_by_owner',
				args: {
					account_id,
				},
				key: 'data.lists_by_owner'
			}))
		}} />
		<h3>As Inviter</h3>
		<ViewLists {...{
			state,
			listKey: 'lists_by_inviter',
			viewFunction: () => dispatch(accountView({
				methodName: 'get_lists_by_inviter',
				args: {
					account_id,
				},
				key: 'data.lists_by_inviter'
			}))
		}} />
		<h3>All Lists</h3>
		<ViewLists {...{
			state,
			listKey: 'lists',
			viewFunction: () => dispatch(accountView({
				methodName: 'get_lists',
				args: {
					account_id,
				},
				key: 'data.lists'
			}))
		}} />
	</>
	
}
