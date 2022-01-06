import React, { useEffect } from 'react';
import { getList } from '../state/near';

export const ViewList = ({ state, update, dispatch }) => {

	const onMount = () => {
		if (!state.data.selectedList) return
		dispatch(getList(state.data.selectedList))
	};
	useEffect(onMount, [state.data.selectedList]);

	return <>
		<ul>
			{ JSON.stringify(state.data.list) }
		</ul>
	</>;
}
