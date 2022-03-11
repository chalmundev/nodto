import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";

const PAGE_SIZE = 10

export const ViewLists = ({
	viewFunction,
	hasLink = true,
	link = '/list'
}) => {

	const [data, setData] = useState([0, []])
	const [index, setIndex] = useState(0)
	const [mounted, setMounted] = useState(false)

	const onMount = async () => {
		setData(await viewFunction((index * PAGE_SIZE).toString(), PAGE_SIZE))
		setMounted(true)
	}
	useEffect(onMount, [index]);

	const [supply, items] = data

	if (!mounted) return <>
		<p>Loading</p>
	</>

	if (mounted && supply === 0) return <>
		<p>No Results</p>
	</>

	return <>
	{
		supply > 0 && <div className="button-row">
			{ index > 0 && <button onClick={() => setIndex(index - 1)}>Prev</button>}
			{ (index+1) * PAGE_SIZE < supply && <button onClick={() => setIndex(index + 1)}>Next</button>}
		</div>
	}
		<ul>
			{
				items.map((item) => <li key={item}>
					{hasLink ? <Link to={`${link}/${item}`}>{item}</Link> : <span>{item}</span>}
				</li>)
			}
		</ul>
	</>;
}
