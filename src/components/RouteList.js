import React, { useState, useEffect } from 'react';
import BN from 'bn.js'
import { Link, useParams } from "react-router-dom";
import { share } from '../utils/share';

import { accountView, accountAction, genViewFunction } from '../state/near';
import { ViewLists } from './ViewLists';
import { parseNearAmount } from 'near-api-js/lib/utils/format';

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
	const [inviter, setInviter] = useState(false)
	const [inviterId, setInviterId] = useState(false)
	const handleChange = ({ target: { name, value } }) => setInput((input) => ({ ...input, [name]: value }))

	const onMount = async () => {
		setData(await dispatch(accountView({
			methodName: 'get_list_data',
			args: {
				list_name
			}
		})))

		setInviter(await dispatch(accountView({
			methodName: 'is_inviter',
			args: {
				list_name,
				account_id: account.account_id
			}
		})))
		
		setInviterId(await dispatch(accountView({
			methodName: 'get_id',
			args: {
				account_id: account.account_id
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
			},
			attachedDeposit: new BN(data[2]).mul(new BN(data[1])).add(new BN(parseNearAmount('0.02')))
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

	console.log(inviter)

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
			<button onClick={() => share({
				/// TODO default image
				image: data[5],
				link: '/invite/' + list_name,
				title: `Get 'On the List!' - ${list_name}`
			})}>Share Invite 🔗</button>
			<button onClick={handleCloseList}>Close List</button>
		</>}

		{inviter && <>
			<button onClick={() => share({
				/// TODO default image
				image: data[5],
				link: '/invite/' + list_name + '/' + inviterId,
				title: `Get 'On the List!' - ${list_name}`
			})}>Share Invite 🔗</button>
		</>}


	</>


}
