import React , { useState } from 'react';
import { accountView, createList } from '../state/near';

const inputs = [
	{name: 'name', placeholder: 'List Name', required: true },
	{name: 'max_invites', placeholder: 'Max Invites (default: unlimited)'},
	{name: 'payment_amount', type: 'number', placeholder: 'Payment Amount (default: 0)'},
	{name: 'difficulty', type: 'number', placeholder: 'PoW Difficulty (default: 20)'},
	{name: 'image', type: 'string', placeholder: 'Image Link (optional)'},
	{name: 'open_register', type: 'checkbox', label: 'Open Registration? (default: true)', value: 'true'},
]
const inputDefaults = {}
inputs.forEach(({ name, value }) => inputDefaults[name] = value !== undefined ? value : '')

let rpcTimeout

export const RouteCreate = ({ dispatch }) => {

	const [input, setInput] = useState(inputDefaults)
	const [exists, setExists] = useState(false)
	
	const handleChange = async ({ target: { name, value }}) => {
		if (name === 'name') {
			if (rpcTimeout) clearTimeout(rpcTimeout)
			rpcTimeout = setTimeout(() => dispatch(accountView({
				methodName: 'list_exists',
				args: {
					list_name: value
				}
			})).then((exists) => {
				console.log(exists)
				setExists(exists)
			}), 500)
		}
		if (name === 'open_register') {
			return setInput((input) => ({ ...input, [name]: (input[name] === 'true' ? 'false' : 'true') }))
		}
		if (name === 'image') {
			if (!/((http|https)?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/.test(value)) {
				setInput((input) => ({ ...input, imageWarning: 'Not a valid image link.'}))
			} else {
				setInput((input) => ({ ...input, imageWarning: false }))
			}
		}
		setInput((input) => ({ ...input, [name]: value }))
	}

	const { imageWarning } = input

	return <div className='form'>
		{
			inputs.map(({ name, label, placeholder, required, type = 'text' }) => <div className="form-group" key={name}>
				{ label && <label>{ label }</label>}
				<input
					type={type}
					required={required}
					name={name}
					onChange={(e) => handleChange(e)}
					placeholder={placeholder}
					value={input[name]}
					defaultChecked={inputDefaults[name].length > 0}
				/>
			</div>)
		}
		{imageWarning ? imageWarning : <img className="image" src={input.image} />}

		<button disabled={exists} onClick={() => dispatch(createList(input))}>Create</button>
		{exists && <p><mark>List name exists</mark></p>}
	</div>
}
