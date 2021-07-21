/**
 * `core/user` data store: dismissed items
 *
 * Site Kit by Google, Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * External dependencies
 */
import invariant from 'invariant';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import Data from 'googlesitekit-data';
import { STORE_NAME } from './constants';
import { createFetchStore } from '../../data/create-fetch-store';
import { createValidatedAction } from '../../data/utils';

const { createRegistrySelector, commonActions } = Data;
const { getRegistry } = commonActions;

function reducerCallback( state, dismissedItems ) {
	return {
		...state,
		dismissedItems: Array.isArray( dismissedItems ) ? dismissedItems : [],
	};
}

const fetchGetDismissedItemsStore = createFetchStore( {
	baseName: 'getDismissedItems',
	controlCallback: () => API.get( 'core', 'user', 'dismissed-items', {}, { useCache: false } ),
	reducerCallback,
} );

const fetchDismissItemStore = createFetchStore( {
	baseName: 'dismissItem',
	controlCallback: ( { slug, expiresInSeconds } ) => API.set( 'core', 'user', 'dismiss-item', { slug, expiresInSeconds } ),
	reducerCallback,
	argsToParams: ( slug, expiresInSeconds = 0 ) => {
		return ( { slug, expiresInSeconds } );
	},
	validateParams: ( { slug, expiresInSeconds } = {} ) => {
		invariant( slug, 'slug is required.' );
		invariant( Number.isInteger( expiresInSeconds ), 'expiresInSeconds must be an integer.' );
	},
} );

const baseInitialState = {
	dismissedItems: undefined,
};

const baseActions = {
	/**
	 * Dismisses the given item by slug.
	 *
	 * @since 1.37.0
	 *
	 * @param {string} slug                       Item slug to dismiss.
	 * @param {Object} options                    Dismiss item options.
	 * @param {number} [options.expiresInSeconds] Optional. An integer number of seconds for expiry. 0 denotes permanent dismissal.
	 * @return {Object} Generator instance.
	 */
	dismissItem: createValidatedAction(
		( slug, options = {} ) => {
			const { expiresInSeconds = 0 } = options;
			invariant( slug, 'A tour slug is required to dismiss a tour.' );
			invariant( Number.isInteger( expiresInSeconds ), 'expiresInSeconds must be an integer.' );
		},
		function* ( slug, options = {} ) {
			const { expiresInSeconds = 0 } = options;
			return yield fetchDismissItemStore.actions.fetchDismissItem( slug, expiresInSeconds );
		},
	),
};

const baseResolvers = {
	*getDismissedItems() {
		const { select } = yield getRegistry();
		const dismissedItems = select( STORE_NAME ).getDismissedItems();
		if ( dismissedItems === undefined ) {
			yield fetchGetDismissedItemsStore.actions.fetchGetDismissedItems();
		}
	},
};

const baseSelectors = {
	/**
	 * Gets the list of dismissed items.
	 *
	 * @since 1.37.0
	 *
	 * @param {Object} state Data store's state.
	 * @return {(string[]|undefined)} Array of dismissed item slugs, `undefined` if not resolved yet.
	 */
	getDismissedItems( state ) {
		return state.dismissedItems;
	},

	/**
	 * Determines whether the item is dismissed or not.
	 *
	 * @since 1.37.0
	 *
	 * @param {Object} state Data store's state.
	 * @param {string} slug  Item slug.
	 * @return {(boolean|undefined)} TRUE if dismissed, otherwise FALSE, `undefined` if not resolved yet.
	 */
	isItemDismissed: createRegistrySelector( ( select ) => ( state, slug ) => {
		return select( STORE_NAME ).getDismissedItems()?.includes( slug );
	} ),
};

export const {
	actions,
	controls,
	initialState,
	reducer,
	resolvers,
	selectors,
} = Data.combineStores(
	{
		initialState: baseInitialState,
		actions: baseActions,
		resolvers: baseResolvers,
		selectors: baseSelectors,
	},
	fetchDismissItemStore,
	fetchGetDismissedItemsStore,
);

export default {
	actions,
	controls,
	initialState,
	reducer,
	resolvers,
	selectors,
};
