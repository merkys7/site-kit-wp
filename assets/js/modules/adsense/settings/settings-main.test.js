/**
 * AdSense SettingsMain tests.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
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
 * Internal dependencies
 */
import { render, fireEvent, wait } from '../../../../../tests/js/test-utils';
import { STORE_NAME } from '../datastore/constants';
import { STORE_NAME as CORE_SITE } from '../../../googlesitekit/datastore/site/constants';
import { STORE_NAME as CORE_USER } from '../../../googlesitekit/datastore/user/constants';
import {
	ACCOUNT_STATUS_APPROVED,
	SITE_STATUS_ADDED,
} from '../util/status';
import * as fixtures from '../datastore/__fixtures__';
import SettingsMain from './settings-main';

describe( 'SettingsMain', () => {
	const initialSettings = {
		accountID: fixtures.accounts[ 0 ].id,
		clientID: fixtures.clients[ 0 ].id,
		accountStatus: ACCOUNT_STATUS_APPROVED,
		siteStatus: SITE_STATUS_ADDED,
		accountSetupComplete: true,
		siteSetupComplete: true,
		useSnippet: true,
	};

	it( 'rolls back settings if settings have changed and is not editing', async () => {
		const setupRegistry = ( { dispatch } ) => {
			dispatch( CORE_SITE ).receiveSiteInfo( {} );
			dispatch( CORE_USER ).receiveUserInfo( {} );
			dispatch( CORE_USER ).receiveUserIsVerified( true );
			dispatch( STORE_NAME ).receiveExistingTag( null );
			dispatch( STORE_NAME ).receiveGetSettings( initialSettings );
		};

		const { rerender, registry, container } = render( <SettingsMain isOpen={ true } isEditing={ false } />, { setupRegistry } );
		const { select } = registry;

		expect( select( STORE_NAME ).getSettings() ).toEqual( initialSettings );

		rerender( <SettingsMain isOpen={ true } isEditing={ true } /> );

		await wait( () => container.querySelector( '.googlesitekit-setup-module__switch' ) );
		fireEvent.click( container.querySelector( '.googlesitekit-setup-module__switch [role="switch"]' ) );
		expect( select( STORE_NAME ).haveSettingsChanged() ).toBe( true );

		rerender( <SettingsMain isOpen={ true } isEditing={ false } /> );

		expect( select( STORE_NAME ).getSettings() ).toEqual( initialSettings );
	} );

	it( 'does not roll back settings if settings have changed and is editing', async () => {
		const setupRegistry = ( { dispatch } ) => {
			dispatch( CORE_SITE ).receiveSiteInfo( {} );
			dispatch( STORE_NAME ).receiveExistingTag( null );
			dispatch( STORE_NAME ).receiveGetSettings( initialSettings );
		};

		const { rerender, registry, container } = render( <SettingsMain isOpen={ true } isEditing={ false } />, { setupRegistry } );
		const { select } = registry;

		expect( select( STORE_NAME ).getSettings() ).toEqual( initialSettings );

		rerender( <SettingsMain isOpen={ true } isEditing={ true } /> );

		await wait( () => container.querySelector( '.googlesitekit-setup-module__switch' ) );
		fireEvent.click( container.querySelector( '.googlesitekit-setup-module__switch [role="switch"]' ) );
		await wait( () => select( STORE_NAME ).haveSettingsChanged() === true );

		// Rendering with isOpen: false and isEditing: true is possible by clicking the module header.
		// Rerendering here manually for clarity.
		rerender( <SettingsMain isOpen={ false } isEditing={ true } /> );

		expect( select( STORE_NAME ).getSettings() ).toEqual( {
			...initialSettings,
			useSnippet: ! initialSettings.useSnippet, // toggled
		} );
	} );
} );
