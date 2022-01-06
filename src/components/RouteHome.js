import React from 'react';

import { ViewLists } from './ViewLists';
import { ViewList } from './ViewList';

export const RouteHome = ({ state, update, dispatch }) => {

	const { 
		data: { lists, selectedList, list },
		account: { accountId },
	} = state

	return state.account ?
	<>
		<p>Signed In</p>
		<ViewLists {...{ dispatch, update, lists, accountId }} />
		<ViewList {...{ dispatch, selectedList, list }} />
	</>
	:
	<>
		<p>Not Signed In - go to wallet</p>
	</>
}
