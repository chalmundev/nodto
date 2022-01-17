import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import { accountView, accountAction } from '../state/near';
import { getSalt } from '../utils/salt';
import { RWebShare } from "react-web-share";
import copy from 'copy-to-clipboard';

const inputs = [
	{ name: 'account_id', placeholder: 'Inviter Account ID' },
]
const inputDefaults = {}
inputs.forEach(({ name }) => inputDefaults[name] = '')

export const RouteInvite = ({ state, update, dispatch }) => {

	const account_id = state?.account?.accountId

	if (!account_id) {
		return <p>Please sign in to register!</p>
	}

	const params = useParams()
	const { list_name, inviter_id } = params;

	const [data, setData] = useState([])

	const onMount = async () => {
		const [data, inviter, invitee] = await Promise.all([
			dispatch(accountView({
				methodName: 'get_list_data',
				args: {
					list_name
				}
			})),
			(account_id && dispatch(accountView({
				methodName: 'is_inviter',
				args: {
					list_name,
					account_id
				}
			}))),
			(account_id && dispatch(accountView({
				methodName: 'is_invitee',
				args: {
					list_name,
					account_id
				}
			})))
		])
		setData([...data, inviter, invitee])
	}
	useEffect(onMount, [])

	const handleRegister = async () => {
		const salt = await getSalt(list_name, state.account.accountId, parseInt(data[4], 10))

		dispatch(accountAction({
			methodName: 'register',
			args: {
				list_name,
				salt,
				inviter_id: parseInt(inviter_id, 10),
			}
		}))
	}

	if (data.length === 0) return <p>Loading</p>

	const isOpen = parseInt(data[1], 10) !== 0
	const canReg = data[3] === 'true' || inviter_id
	const image = /((http|https)?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg))/.test(data[5])
	const inviter = data[6]
	const invitee = data[7]

	return <>
		<h2>{list_name}</h2>
		{image && <img className='image' src={data[5]} />}
		{
			isOpen && canReg && !inviter && !invitee && <>
				<button onClick={handleRegister}>Register Now</button>
			</>
		}
		{ inviter && <>
			<p>You are an inviter!</p>
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
		</> }
		{ invitee && <p>You are on the list!</p> }
		{ !isOpen && <p>List Closed</p> }

	</>


}
