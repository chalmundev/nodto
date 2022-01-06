import React, { useEffect } from 'react';
import { getLists } from '../state/near';

export const ViewLists = ({ state, update, dispatch }) => {

	const onMount = () => {
		dispatch(getLists())
	};
	useEffect(onMount, []);

	return <>
		<ul>
			{
				state.data.lists.map((list) => <li
					key={list}
					onClick={() => update('data', {
						selectedList: list
					})}
				>
					{list}
				</li>)
			}
		</ul>
	</>;
}
