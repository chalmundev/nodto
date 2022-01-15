import React, { useContext, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import { appStore, onAppMount } from './state/app';

import { RouteCreate } from './components/RouteCreate';
import { RouteHome } from './components/RouteHome';
import { RouteList } from './components/RouteList';
import { RouteListInviter } from './components/RouteListInviter';
import { RouteInvite } from './components/RouteInvite';

import './App.scss';

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

	const handleClick = () => {
		update('clicked', !state.clicked);
	};

	const routeProps = {
		state, dispatch, update
	}

	return (
		<div className='container-fluid'>

			<nav>
				<ul>
					<li>
						Brand
					</li>
				</ul>
				<ul>
					<li>
						<Link to="/">Home</Link>
					</li>
					<li>
						<Link to="/account">Account</Link>
					</li>
				</ul>
			</nav>

			<Routes>
				{
					account ? <>
						<Route path="/create" element={<RouteCreate {...routeProps} />} />
						<Route path="/account" element={<>
							<p>{account.accountId}</p>
							<button onClick={() => wallet.signOut()}>Sign Out</button>
						</>} />
						<Route path="/invite/:list_name/:inviter_id" element={<RouteInvite {...routeProps} />} />
						<Route path="/list/:list_name/:inviter_account_id" element={<RouteListInviter {...routeProps} />} />
						<Route path="/list/:list_name" element={<RouteList {...routeProps} />} />
						<Route path="/" element={<RouteHome {...routeProps} />} />
					</>
						:
						<>
							<Route path="/" element={<RouteHome {...routeProps} />} />
							<Route path="/account" element={
								<>
									<p>Not Signed In</p>
									<button onClick={() => wallet.signIn()}>Sign In</button>
								</>
							} />
						</>
				}
			</Routes>

		</div>
	);
};

export default App;
