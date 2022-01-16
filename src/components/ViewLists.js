import React, { useEffect } from 'react';
import { Link } from "react-router-dom";

export const ViewLists = ({ state, listKey, creatable, viewFunction }) => {

	const lists = state.data[listKey]

	useEffect(viewFunction, []);

	return lists.length === 0 ? <>
		<p>No Lists</p>
		{ creatable && <Link to="/create"><button>Create List</button></Link>}
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
		{ creatable && <Link to="/create"><button>Create List</button></Link>}
	</>;
}
