import React, { useEffect } from 'react';
import { Link } from "react-router-dom";
import { accountView } from '../state/near';

export const ViewLists = ({ dispatch, update, lists, accountId }) => {

	const onMount = () => {
		dispatch(accountView({
			methodName: 'get_lists_by_owner',
			args: {
				account_id: accountId,
			},
			key: 'data.lists'
		}))
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
				lists.map((list) => <li key={list}>
					<Link to={'/list/' + list}>{list}</Link>
				</li>)
			}
		</ul>
		<Link to="/create"><button>Create List</button></Link>
	</>;
}
