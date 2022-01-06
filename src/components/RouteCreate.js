import React , { useState } from 'react';
import { createList } from '../state/near';

const inputs = [
	{name: 'name', placeholder: 'List Name'},
	{name: 'max_invites', placeholder: 'Max Invites'},
	{name: 'self_register', type: 'checkbox', label: 'Self Registration?'},
	{name: 'difficulty', type: 'number', placeholder: 'Difficulty'},
	{name: 'payment_amount', type: 'number', placeholder: 'Payment Amount'},
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteCreate = ({ state, dispatch }) => {

	const [input, setInput] = useState(inputDefaults)
	
	const handleChange = ({ target: { name, value }}) => setInput((input) => ({ ...input, [name]: value }))

	return <>
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

		<button onClick={() => dispatch(createList(input))}>Create</button>
	</>
}
