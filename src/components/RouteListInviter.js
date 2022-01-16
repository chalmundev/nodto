import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { genViewFunction } from '../state/near';

import { ViewLists } from './ViewLists';

const inputs = [
	{name: 'account_id', placeholder: 'Inviter Account ID'},
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteListInviter = ({ state, update, dispatch }) => {

	const params = useParams()
	const { list_name, inviter_account_id } = params;

	return <>
		<h2>{list_name}</h2>
		<h3>Inviter:</h3>
		<p>{ inviter_account_id }</p>
		<h3>Invitees:</h3>
		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_inviter_invitees', { list_name, inviter_account_id })),
			hasLink: false,
		}} />
	</>

	
}
