import React, { useContext, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import { appStore, onAppMount } from './state/app';

import { RouteCreate } from './components/RouteCreate';
import { RouteHome } from './components/RouteHome';
import { RouteList } from './components/RouteList';
import { RouteListInviter } from './components/RouteListInviter';
import { RouteInvite } from './components/RouteInvite';

import './customize.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);
	const { wallet, account } = state;
	const navigate = useNavigate()
	const url = new URL(window.location.href)

	const onMount = () => {
		if (url.pathname !== '/' && url.searchParams.get('transactionHashes')) {
			navigate('/')
		}
		dispatch(onAppMount());
	};
	useEffect(onMount, []);

	const routeProps = {
		state, dispatch, update
	}

	const showBack = window.location.pathname.split('/').length > 2

	return (
		<div className='container-fluid'>

			<nav>
				<ul>
					<li>
						On the List
					</li>
				</ul>
				<ul>
					<li>
						<Link to="/">Home</Link>
					</li>
					<li>
						{
							account
							?
							<Link to="/" onClick={() => wallet.signOut()}>Sign Out</Link>
							:
							<Link to="/" onClick={() => wallet.signIn()}>Sign In</Link>
						}
					</li>
				</ul>
			</nav>

			<div className='crumbs'>
				{ showBack ? <div><Link to="/" onClick={() => navigate(-1)}>Back</Link></div> : <div></div> }
				{ account && <div>{account.accountId}</div> }
			</div>

			<Routes>
				{
					account ? <>
						<Route path="/create" element={<RouteCreate {...routeProps} />} />
						<Route path="/invite/:list_name" element={<RouteInvite {...routeProps} />} />
						<Route path="/invite/:list_name/:inviter_id" element={<RouteInvite {...routeProps} />} />
						<Route path="/list/:list_name/:inviter_account_id" element={<RouteListInviter {...routeProps} />} />
						<Route path="/list/:list_name" element={<RouteList {...routeProps} />} />
						<Route path="/" element={<RouteHome {...routeProps} />} />
					</>
						:
						<>
							<Route path="/" element={<RouteHome {...routeProps} />} />
						</>
				}
			</Routes>

		</div>
	);
};

export default App;
