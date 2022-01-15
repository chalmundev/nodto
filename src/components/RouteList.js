import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { accountView, accountAction } from '../state/near';

const inputs = [
	{name: 'account_id', placeholder: 'Inviter Account ID'},
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteList = ({ state, update, dispatch }) => {

	const { inviters } = state.data

	const params = useParams()
	const { list_name } = params;

	const [input, setInput] = useState(inputDefaults)
	const handleChange = ({ target: { name, value }}) => setInput((input) => ({ ...input, [name]: value }))

	const onMount = () => {
		dispatch(accountView({
			methodName: 'get_inviters',
			args: {
				list_name,
			},
			key: 'data.inviters'
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
		<h1>{list_name}</h1>
		<h2>Inviters</h2>
		{
			inviters.map((inviter) => <p key={inviter}>{inviter}</p>)
		}
		<h2>Add Inviter</h2>
		{
			inputs.map(({ name, type = 'text', label, placeholder }) => <div key={name}>
				{ label && <p>{ label }</p>}
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
	</>

	
}
