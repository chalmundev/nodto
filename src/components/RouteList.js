import React, { useState, useEffect } from 'react';
import { Link, useParams } from "react-router-dom";
import { RWebShare } from "react-web-share";
import copy from 'copy-to-clipboard';

import { accountView, accountAction, genViewFunction } from '../state/near';
import { ViewLists } from './ViewLists';

const inputs = [
	{ name: 'account_id', placeholder: 'Inviter Account ID' },
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')




/// TODO

/// Share Link Button that puts image into URL query params



export const RouteList = ({ state, dispatch }) => {

	const { account } = state

	const params = useParams()
	const { list_name } = params;

	const [data, setData] = useState([])
	const [input, setInput] = useState(inputDefaults)
	const handleChange = ({ target: { name, value } }) => setInput((input) => ({ ...input, [name]: value }))

	const onMount = async () => {
		setData(await dispatch(accountView({
			methodName: 'get_list_data',
			args: {
				list_name
			}
		})))
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
			},
			attachedDeposit: 1
		}))
	}

	if (data.length === 0) return <p>Loading</p>

	const ownerId = parseInt(data[0], 10)
	const isOpen = parseInt(data[1], 10) !== 0
	const image = /((http|https)?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/.test(data[5])

	return <>
		<h2>{list_name}</h2>

		{image && <img className='image' src={data[5]} />}

		{!isOpen && <p>List Closed</p>}

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

		{account?.inviter_id === ownerId && isOpen && <>
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
			<RWebShare
				data={{
					text: 'Join the list!',
					url: window.location.origin + '/invite/' + list_name,
					title: list_name + ' Invite',
				}}
				onClick={() => copy(window.location.origin + '/invite/' + list_name)}
			>
				<button>Share Invite 🔗</button>
			</RWebShare>
			<button onClick={handleCloseList}>Close List</button>
		</>}


	</>


}
