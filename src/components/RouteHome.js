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
		<p>Signed In</p>
		<ViewLists {...{ dispatch, update, lists, accountId }} />
	</>
	
}
