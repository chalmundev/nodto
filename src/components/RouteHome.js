import React from 'react';

import { Link } from "react-router-dom";
import { genViewFunction } from '../state/near';
import { ViewLists } from './ViewLists';

export const RouteHome = ({ state, update, dispatch }) => {

	const account_id = state?.account?.accountId

	return <>
		{
			account_id && <>
				<h2>List Owner</h2>
				<ViewLists {...{
					state,
					...dispatch(genViewFunction('get_lists_by_owner', { account_id }))
				}} />
				<Link to="/create"><button>Create List</button></Link>
				<h2>List Inviter</h2>
				<ViewLists {...{
					state,
					...dispatch(genViewFunction('get_lists_by_inviter', { account_id }))
				}} />
			</>
		}
		<h2>All Lists</h2>
		{ !account_id && <p>Please sign in to register!</p> }
		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_lists')),
			hasLink: !!account_id,
		}} />
	</>

}
