/**
 * `core/modules` data store: module sharing settings
 *
 * Site Kit by Google, Copyright 2022 Google LLC
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
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import Data from 'googlesitekit-data';
import { createFetchStore } from '../../data/create-fetch-store';
import { CORE_MODULES } from './constants';
import { createStrictSelect, createValidationSelector } from '../../data/utils';

const { createRegistrySelector } = Data;

// Actions
const SET_SHARING_MANAGEMENT = 'SET_SHARING_MANAGEMENT';
const SET_SHARED_ROLES = 'SET_SHARED_ROLES';
const RECEIVE_GET_SHARING_SETTINGS = 'RECEIVE_GET_SHARING_SETTINGS';
const RECEIVE_SHAREABLE_ROLES = 'RECEIVE_SHAREABLE_ROLES';
const START_SUBMIT_SHARING_CHANGES = 'START_SUBMIT_SHARING_CHANGES';
const FINISH_SUBMIT_SHARING_CHANGES = 'FINISH_SUBMIT_SHARING_CHANGES';

// Invariant error messages.
export const INVARIANT_DOING_SUBMIT_SHARING_CHANGES =
	'cannot submit sharing changes while submitting changes';
export const INVARIANT_SHARING_SETTINGS_NOT_CHANGED =
	'cannot submit changes if sharing settings have not changed';

const validManagementValues = [ 'all_admins', 'owner' ];

const baseInitialState = {
	sharingSettings: undefined,
	savedSharingSettings: undefined,
	shareableRoles: undefined,
	isDoingSubmitSharingChanges: undefined,
};

const fetchSaveSharingSettingsStore = createFetchStore( {
	baseName: 'saveSharingSettings',
	controlCallback: ( { savedSharingSettings } ) => {
		return API.set(
			'core',
			'modules',
			'sharing-settings',
			savedSharingSettings
		);
	},
	reducerCallback: ( state, { settings } ) => {
		return {
			...state,
			savedSharingSettings: settings,
			sharingSettings: settings,
		};
	},
	argsToParams: ( savedSharingSettings ) => ( { savedSharingSettings } ),
	validateParams: ( { savedSharingSettings } = {} ) => {
		invariant( savedSharingSettings, 'savedSharingSettings is required.' );
	},
} );

const baseActions = {
	/**
	 * Sets the sharing settings management of a given module.
	 *
	 * @since n.e.x.t
	 *
	 * @param {string} moduleSlug Module slug.
	 * @param {string} management New management for a module, one of all_admins | owner.
	 * @return {Object} Action for SET_SHARING_MANAGEMENT.
	 */
	setSharingManagement( moduleSlug, management ) {
		invariant( moduleSlug, 'moduleSlug is required.' );

		invariant(
			validManagementValues.includes( management ),
			`management must be one of: ${ validManagementValues.join(
				', '
			) }.`
		);
		return {
			payload: {
				moduleSlug,
				management,
			},
			type: SET_SHARING_MANAGEMENT,
		};
	},

	/**
	 * Sets the sharing settings shared roles of a given module.
	 *
	 * @since n.e.x.t
	 *
	 * @param {string}   moduleSlug Module slug.
	 * @param {string[]} roles      List of roles the module is shared with.
	 * @return {Object} Action for SET_SHARED_ROLES.
	 */
	setSharedRoles( moduleSlug, roles ) {
		invariant( moduleSlug, 'moduleSlug is required.' );
		invariant(
			Array.isArray( roles ) &&
				roles.every( ( role ) => typeof role === 'string' ),
			'roles must be an array of strings.'
		);
		return {
			payload: {
				moduleSlug,
				roles,
			},
			type: SET_SHARED_ROLES,
		};
	},

	/**
	 * Saves sharingSettings for dashboard sharing.
	 *
	 * Save sharingSettings for dashboard sharing.
	 * Update ownerID from the response for the modules in the sharingSettings state.
	 *
	 * @since n.e.x.t
	 *
	 * @return {Object} Object with `{response, error}`.
	 */
	*saveSharingSettings() {
		const registry = yield Data.commonActions.getRegistry();

		yield {
			type: START_SUBMIT_SHARING_CHANGES,
			payload: {},
		};

		const sharingSettings = registry
			.select( CORE_MODULES )
			.getSharingSettings();

		const {
			response,
			error,
		} = yield fetchSaveSharingSettingsStore.actions.fetchSaveSharingSettings(
			sharingSettings
		);

		// Update module owner IDs in the sharing settings modules.
		if ( ! error && Object.keys( response.newOwnerIDs ).length ) {
			for ( const [ slug, ownerID ] of Object.entries(
				response.newOwnerIDs
			) ) {
				const storeName = registry
					.select( CORE_MODULES )
					.getModuleStoreName( slug );

				registry.dispatch( storeName ).setOwnerID( ownerID );
			}
		}

		yield {
			type: FINISH_SUBMIT_SHARING_CHANGES,
			payload: {},
		};

		return { response, error };
	},

	/**
	 * Receives sharingSettings for dashboard sharing.
	 * Stores sharingSettings in the datastore.
	 *
	 * Because this is frequently-accessed data, this is usually sourced
	 * from a global variable (`_googlesitekitDashboardSharingData`), set by PHP
	 * in the `before_print` callback for `googlesitekit-datastore-site`.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} sharingSettings Sharing settings for modules with `management` and `sharedRoles` properties.
	 * @return {Object} Action for RECEIVE_GET_SHARING_SETTINGS.
	 */
	receiveGetSharingSettings( sharingSettings ) {
		invariant( sharingSettings, 'sharingSettings is required.' );
		return {
			payload: { sharingSettings },
			type: RECEIVE_GET_SHARING_SETTINGS,
		};
	},

	/**
	 * Receives shareableRoles for dashboard sharing.
	 * Stores shareableRoles in the datastore.
	 *
	 * Because this is frequently-accessed data, this is usually sourced
	 * from a global variable (`_googlesitekitDashboardSharingData`), set by PHP
	 * in the `before_print` callback for `googlesitekit-datastore-site`.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} shareableRoles Shareable Roles for modules with `management` and `sharedRoles` properties.
	 * @return {Object} Action for RECEIVE_SHAREABLE_ROLES.
	 */
	receiveShareableRoles( shareableRoles ) {
		invariant( shareableRoles, 'shareableRoles is required.' );
		return {
			payload: { shareableRoles },
			type: RECEIVE_SHAREABLE_ROLES,
		};
	},
};

const baseReducer = ( state, { type, payload } ) => {
	switch ( type ) {
		case SET_SHARING_MANAGEMENT: {
			const { moduleSlug, management } = payload;

			return {
				...state,
				sharingSettings: {
					...state.sharingSettings,
					[ moduleSlug ]: {
						...state.sharingSettings[ moduleSlug ],
						management,
					},
				},
			};
		}

		case SET_SHARED_ROLES: {
			const { moduleSlug, roles } = payload;

			return {
				...state,
				sharingSettings: {
					...state.sharingSettings,
					[ moduleSlug ]: {
						...state.sharingSettings[ moduleSlug ],
						sharedRoles: roles,
					},
				},
			};
		}

		case RECEIVE_GET_SHARING_SETTINGS: {
			const { sharingSettings } = payload;

			return {
				...state,
				sharingSettings,
				savedSharingSettings: sharingSettings,
			};
		}

		case RECEIVE_SHAREABLE_ROLES: {
			const { shareableRoles } = payload;

			return {
				...state,
				shareableRoles,
			};
		}

		case START_SUBMIT_SHARING_CHANGES: {
			return {
				...state,
				isDoingSubmitSharingChanges: true,
			};
		}

		case FINISH_SUBMIT_SHARING_CHANGES: {
			return {
				...state,
				isDoingSubmitSharingChanges: false,
			};
		}

		default: {
			return state;
		}
	}
};

const baseResolvers = {
	*getSharingSettings() {
		const registry = yield Data.commonActions.getRegistry();

		if ( registry.select( CORE_MODULES ).getSharingSettings() ) {
			return;
		}

		if ( ! global._googlesitekitDashboardSharingData ) {
			global.console.error(
				'Could not load core/modules dashboard sharing settings.'
			);
			return;
		}

		const { settings } = global._googlesitekitDashboardSharingData;
		yield actions.receiveGetSharingSettings( settings );
	},

	*getShareableRoles() {
		const registry = yield Data.commonActions.getRegistry();

		if ( registry.select( CORE_MODULES ).getShareableRoles() ) {
			return;
		}

		if ( ! global._googlesitekitDashboardSharingData ) {
			global.console.error(
				'Could not load core/modules dashboard sharing roles.'
			);
			return;
		}

		const { roles } = global._googlesitekitDashboardSharingData;
		yield actions.receiveShareableRoles( roles );
	},
};

function validateCanSubmitSharingChanges( select ) {
	const strictSelect = createStrictSelect( select );
	const {
		isDoingSubmitSharingChanges,
		haveSharingSettingsChanged,
	} = strictSelect( CORE_MODULES );

	invariant(
		! isDoingSubmitSharingChanges(),
		INVARIANT_DOING_SUBMIT_SHARING_CHANGES
	);
	invariant(
		haveSharingSettingsChanged(),
		INVARIANT_SHARING_SETTINGS_NOT_CHANGED
	);
}

const {
	safeSelector: canSubmitSharingChanges,
	dangerousSelector: __dangerousCanSubmitSharingChanges,
} = createValidationSelector( validateCanSubmitSharingChanges );

const baseSelectors = {
	canSubmitSharingChanges,
	__dangerousCanSubmitSharingChanges,

	/**
	 * Gets the current dashboard sharing settings.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} state Data store's state.
	 * @return {(Object|undefined)} Sharing Settings object. Returns undefined if it is not loaded yet.
	 */
	getSharingSettings( state ) {
		const { sharingSettings } = state;
		return sharingSettings;
	},

	/**
	 * Gets the current dashboard shareable roles.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} state Data store's state.
	 * @return {(Object|undefined)} Shareable Roles object. Returns undefined if it is not loaded yet.
	 */
	getShareableRoles( state ) {
		const { shareableRoles } = state;
		return shareableRoles;
	},

	/**
	 * Gets the dashboard sharing management for the given module.
	 *
	 * Returns the module's sharing management string.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} state      Data store's state.
	 * @param {string} moduleSlug Module slug.
	 * @return {(string|null|undefined)} The module's sharing management string, null if there is none,
	 *                                   undefined if not loaded yet.
	 */
	getSharingManagement: createRegistrySelector(
		( select ) => ( state, moduleSlug ) => {
			invariant( moduleSlug, 'moduleSlug is required.' );
			const sharingSettings = select( CORE_MODULES ).getSharingSettings();

			if ( sharingSettings === undefined ) {
				return undefined;
			}
			return sharingSettings[ moduleSlug ]?.management || null;
		}
	),

	/**
	 * Gets the shared roles for the given module.
	 *
	 * Returns the module's shared roles list.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} state      Data store's state.
	 * @param {string} moduleSlug Module slug.
	 * @return {(Array|null|undefined)} The module's shared roles array, null if there is none,
	 *                                   undefined if not loaded yet.
	 */
	getSharedRoles: createRegistrySelector(
		( select ) => ( state, moduleSlug ) => {
			invariant( moduleSlug, 'moduleSlug is required.' );
			const sharingSettings = select( CORE_MODULES ).getSharingSettings();

			if ( sharingSettings === undefined ) {
				return undefined;
			}
			return sharingSettings[ moduleSlug ]?.sharedRoles || null;
		}
	),

	/**
	 * Indicates whether the current sharing settings have changed from what is saved.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object}     state Data store's state.
	 * @param {Array|null} keys  Sharing Settings keys to check; if not provided, all sharing settings are checked.
	 * @return {boolean} True if the sharing settings have changed, false otherwise.
	 */
	haveSharingSettingsChanged( state, keys = null ) {
		const { sharingSettings, savedSharingSettings } = state;

		if ( keys ) {
			return ! isEqual(
				pick( sharingSettings, keys ),
				pick( savedSharingSettings, keys )
			);
		}

		return ! isEqual( sharingSettings, savedSharingSettings );
	},

	/**
	 * Checks whether sharing settings changes are currently being submitted.
	 *
	 * @since n.e.x.t
	 *
	 * @param {Object} state Data store's state.
	 * @return {boolean} TRUE if submitting, otherwise FALSE.
	 */
	isDoingSubmitSharingChanges( state ) {
		return !! state.isDoingSubmitSharingChanges;
	},
};

const store = Data.combineStores( fetchSaveSharingSettingsStore, {
	initialState: baseInitialState,
	actions: baseActions,
	selectors: baseSelectors,
	reducer: baseReducer,
	resolvers: baseResolvers,
} );

export const initialState = store.initialState;
export const actions = store.actions;
export const selectors = store.selectors;
export const reducer = store.reducer;

export default store;
