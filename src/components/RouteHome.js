import React from 'react';

import { ViewLists } from './ViewLists';

export const RouteHome = ({ state, update, dispatch }) => {

	if (!state.account?.accountId) {
		return <>
			<p>Not Signed In - go to account to sign</p>
		</>
	}

	const { 
		data: { lists, selectedList, list },
		account: { accountId },
	} = state

	return <>
		<h3>My Lists</h3>
		<ViewLists {...{ dispatch, update, lists, accountId }} />
	</>
	
}
