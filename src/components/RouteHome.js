import React from 'react';

import { Link } from "react-router-dom";
import { genViewFunction } from '../state/near';
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
		<h2>My Lists</h2>
		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_lists_by_owner', { account_id }))
		}} />
		<Link to="/create"><button>Create List</button></Link>
		<h2>As Inviter</h2>
		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_lists_by_inviter', { account_id }))
		}} />
		<h2>All Lists</h2>
		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_lists'))
		}} />
	</>
	
}
