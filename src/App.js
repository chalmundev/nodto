import React, { useContext, useEffect } from 'react';
import {
	Routes,
	Route,
	Link
} from "react-router-dom";

import { appStore, onAppMount } from './state/app';
import { RouteHome } from './components/RouteHome';

import './App.scss';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);

	// console.log('state', state);

	const { wallet, account } = state;

	const onMount = () => {
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
		<div>

			<nav>
				<ul>
					<li>
						<Link to="/">Home</Link>
					</li>
					<li>
						<Link to="/hello">Lists</Link>
					</li>
					<li>
						<Link to="/wallet">Wallet</Link>
					</li>
				</ul>
			</nav>

			<Routes>
				<Route path="/wallet" element={
					account ? <>
						<p>{ account.accountId }</p>
						<button onClick={() => wallet.signOut()}>Sign Out</button>
					</> :
						<>
							<p>Not Signed In</p>
							<button onClick={() => wallet.signIn()}>Sign In</button>
						</>
				} />
				<Route path="/hello" element={
					<p>Hello</p>
				} />
				<Route path="/" element={<RouteHome { ...routeProps } />} />
			</Routes>

		</div>
	);
};

export default App;
