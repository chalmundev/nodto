import React, { useEffect } from 'react';
import { getEvent } from '../state/near';

export const ViewEvent = ({ state, update, dispatch }) => {

	const onMount = () => {
		if (!state.data.selectedEvent) return
		dispatch(getEvent(state.data.selectedEvent))
	};
	useEffect(onMount, [state.data.selectedEvent]);

	return <>
		<ul>
			{ JSON.stringify(state.data.event) }
		</ul>
	</>;
}
