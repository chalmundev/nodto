import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { accountView, accountAction } from '../state/near';

const inputs = [
	{name: 'account_id', placeholder: 'Inviter Account ID'},
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteListInviter = ({ state, update, dispatch }) => {
	const { invitees } = state.data

	const params = useParams()
	const { list_name, inviter_account_id } = params;

	const onMount = () => {
		dispatch(accountView({
			methodName: 'get_inviter_invitees',
			args: {
				list_name,
				inviter_account_id,
			},
			key: 'data.invitees'
		}))
	};
	useEffect(onMount, []);

	const handleAddInviter = () => {
		const { account_id } = input
		dispatch(accountAction({
			methodName: 'add_inviter',
			args: {
				list_name,
				account_id,
			}
		}))
	}

	return <>
		<h3>{list_name}</h3>
		<h3>Inviter: { inviter_account_id }</h3>
		<h3>Invitees:</h3>
		{
			invitees.map((inviter) => <p key={inviter}>{inviter}</p>)
		}
	</>

	
}
