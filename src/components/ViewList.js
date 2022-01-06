import React, { useEffect } from 'react';
import { getList } from '../state/near';

export const ViewList = ({ dispatch, selectedList, list }) => {

	const onMount = () => {
		if (!selectedList) return
		dispatch(getList(selectedList))
	};
	useEffect(onMount, [selectedList]);

	return <>
		<ul>
			{ JSON.stringify(list) }
		</ul>
	</>;
}
