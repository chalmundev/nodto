import React from 'react';

import { ViewEvents } from './ViewEvents'
import { ViewEvent } from './ViewEvent'

export const RouteHome = (routeProps) => {

	return <>
		<ViewEvents {...routeProps} />
		<ViewEvent {...routeProps} />
	</>
}
