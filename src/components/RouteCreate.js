import React , { useState } from 'react';
import { createList } from '../state/near';

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

export const RouteCreate = ({ dispatch }) => {

	const [input, setInput] = useState(inputDefaults)
	
	const handleChange = ({ target: { name, value }}) => {
		/// TODO handle image preview
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

		<button onClick={() => dispatch(createList(input))}>Create</button>
	</div>
}
