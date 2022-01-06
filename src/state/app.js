import { State } from '../utils/state';

import { initNear } from './near';

// example
const initialState = {
	app: {
		mounted: false
	},
	data: {
		lists: [],
		list: {
			hosts: [],
			guests: [],
		},
		selectedList: null,
	}
};

export const { appStore, AppProvider } = State(initialState, 'app');

// example app function
export const onAppMount = (message) => async ({ update, getState, dispatch }) => {
	update('app', { mounted: true });
	dispatch(initNear())
	
};
