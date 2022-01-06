import React, { useEffect } from 'react';
import { getEvents } from '../state/near';

export const ViewEvents = ({ state, update, dispatch }) => {

	const onMount = () => {
		dispatch(getEvents())
	};
	useEffect(onMount, []);

	return <>
		<ul>
			{
				state.data.events.map((event) => <li
					key={event}
					onClick={() => update('data', {
						selectedEvent: event
					})}
				>
					{event}
				</li>)
			}
		</ul>
	</>;
}
