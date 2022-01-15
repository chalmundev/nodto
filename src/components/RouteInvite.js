import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { accountView, accountAction } from '../state/near';
import { getSalt } from '../utils/salt';

const inputs = [
	{name: 'account_id', placeholder: 'Inviter Account ID'},
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteInvite = ({ state, update, dispatch }) => {

	const params = useParams()
	const { list_name, inviter_id } = params;

	const handleRegister = async () => {
		/// TODO compute salt
		const [difficulty] = await dispatch(accountView({
			methodName: 'get_list_data',
			args: {
				list_name,
			},
		}))
		const salt = await getSalt(list_name, state.account.accountId, parseInt(difficulty, 10))

		dispatch(accountAction({
			methodName: 'register',
			args: {
				list_name,
				salt,
				inviter_id: parseInt(inviter_id, 10),
			}
		}))
	}

	return <>
		<h1>{list_name}</h1>
		<h2>Register Yourself</h2>
		<button onClick={handleRegister}>Register Now</button>
	</>

	
}
