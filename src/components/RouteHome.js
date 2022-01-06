import React from 'react';

import { ViewLists } from './ViewLists'
import { ViewList } from './ViewList'

export const RouteHome = (routeProps) => {

	return <>
		<ViewLists {...routeProps} />
		<ViewList {...routeProps} />
	</>
}
