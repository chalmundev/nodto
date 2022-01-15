import React, { useContext, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from "react-router-dom";

import { appStore, onAppMount } from './state/app';

import { RouteCreate } from './components/RouteCreate';
import { RouteHome } from './components/RouteHome';

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

	if (!state.viewAccount) {
		return <p>Loading</p>
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
					{
						account && <>
							<li>
								<Link to="/lists">Lists</Link>
							</li>
						</>
					}
				</ul>
			</nav>

			<Routes>
				{
					account ? <>
						<Route path="/create" element={<RouteCreate {...routeProps} />} />
						<Route path="/account" element={
							account ? <>
							<p>{account.accountId}</p>
							<button onClick={() => wallet.signOut()}>Sign Out</button>
						</> :
							<>
								<p>Not Signed In</p>
								<button onClick={() => wallet.signIn()}>Sign In</button>
							</>
						} />
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
