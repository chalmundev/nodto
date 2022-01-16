import React, { useState, useEffect } from 'react';
import { Link, useParams } from "react-router-dom";

import { accountView, accountAction, genViewFunction } from '../state/near';
import { ViewLists } from './ViewLists';

const inputs = [
	{ name: 'account_id', placeholder: 'Inviter Account ID' },
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteList = ({ state, dispatch }) => {

	const { account } = state

	const params = useParams()
	const { list_name } = params;

	const [inviterId, setInviterId] = useState(0)
	const [input, setInput] = useState(inputDefaults)
	const handleChange = ({ target: { name, value } }) => setInput((input) => ({ ...input, [name]: value }))

	const onMount = async () => {
		const [owner_id] = await dispatch(accountView({
			methodName: 'get_list_data',
			args: {
				list_name
			}
		}))
		setInviterId(parseInt(owner_id, 10))
	}
	useEffect(onMount, [])

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

	const handleCloseList = () => {
		dispatch(accountAction({
			methodName: 'close_list',
			args: {
				list_name,
			}
		}))
	}

	return <>
		<h2>{list_name}</h2>

		<h3>Invitees:</h3>

		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_invitees', { list_name })),
			hasLink: false,
		}} />

		<h3>Inviters:</h3>

		<ViewLists {...{
			state,
			...dispatch(genViewFunction('get_inviters', { list_name })),
			link: '/list/' + list_name,
		}} />

		{ account?.inviter_id === inviterId && <>
			<h3>Add Inviter</h3>
			{
				inputs.map(({ name, type = 'text', label, placeholder }) => <div key={name}>
					{label && <p>{label}</p>}
					<input
						type={type}
						name={name}
						onChange={(e) => handleChange(e)}
						placeholder={placeholder}
						value={input[name]}
					/>
				</div>)
			}
			<button onClick={handleAddInviter}>Add Inviter</button>
			<button onClick={handleCloseList}>Close List</button>
		</>}


	</>


}
