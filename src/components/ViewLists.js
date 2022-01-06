import React, { useEffect } from 'react';
import { Link } from "react-router-dom";
import { getLists } from '../state/near';

export const ViewLists = ({ dispatch, update, lists, accountId }) => {

	const onMount = () => {
		dispatch(getLists(accountId))
	};
	useEffect(onMount, []);

	return lists.length === 0 ? <>
		<p>No Lists</p>
		<Link to="/create"><button>Create List</button></Link>
	</>
	:
	<>
		<ul>
			{
				lists.map((list) => <li
					key={list}
					onClick={() => update('data', {
						selectedList: list
					})}
				>
					{list}
				</li>)
			}
		</ul>
		<Link to="/create"><button>Create List</button></Link>
	</>;
}
