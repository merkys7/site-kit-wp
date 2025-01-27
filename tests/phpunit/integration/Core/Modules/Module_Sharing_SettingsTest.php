<?php
/**
 * Module_Sharing_SettingsTest
 *
 * @package   Google\Site_Kit\Tests\Core\Modules
 * @copyright 2022 Google LLC
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://sitekit.withgoogle.com
 */

namespace Google\Site_Kit\Tests\Core\Modules;

use Google\Site_Kit\Context;
use Google\Site_Kit\Core\Modules\Module_Sharing_Settings;
use Google\Site_Kit\Core\Storage\Options;
use Google\Site_Kit\Tests\Modules\SettingsTestCase;

class Module_Sharing_SettingsTest extends SettingsTestCase {

	/**
	 * Module Sharing Settings instance.
	 *
	 * @var Module_Sharing_Settings
	 */
	private $settings;

	/**
	 * Context instance.
	 *
	 * @var Context
	 */
	private $context;

	public function set_up() {
		parent::set_up();

		$this->context  = new Context( GOOGLESITEKIT_PLUGIN_MAIN_FILE );
		$options        = new Options( $this->context );
		$this->settings = new Module_Sharing_Settings( $options );
		$this->settings->register();
	}

	protected function get_option_name() {
		return Module_Sharing_Settings::OPTION;
	}

	public function test_get_default() {
		$default_settings = get_option( $this->get_option_name() );
		$this->assertTrue( is_array( $default_settings ) );
		$this->assertEmpty(
			$default_settings
		);
	}

	public function test_get_sanitize_callback() {
		$this->assertEmpty( get_option( $this->get_option_name() ) );

		// Test sanitizing invalid sharedRoles.
		$test_sharing_settings = array(
			'analytics'          => array(
				'sharedRoles' => array( '', 'editor', array( 'edit' ) ),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => '',
				'management'  => 'all_admins',
			),
			'search-console'     => array(
				'sharedRoles' => null,
				'management'  => 'all_admins',
			),
		);
		$expected              = array(
			'analytics'          => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array(),
				'management'  => 'all_admins',
			),
			'search-console'     => array(
				'management' => 'all_admins',
			),
		);
		$this->settings->set( $test_sharing_settings );
		// Use get_option() instead of $settings->get() to test sanitization and set() in isolation.
		$this->assertEquals( $expected, get_option( $this->get_option_name() ) );
	}

	public function test_get() {
		$defaultSettings = $this->settings->get();
		$this->assertTrue( is_array( $defaultSettings ) );
		$this->assertEmpty( $defaultSettings );

		// Test invalid settings when we get settings.
		$test_sharing_settings = array(
			'analytics'          => array(
				'sharedRoles' => '',
				'management'  => '',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => null,
				'management'  => 'all_admins',
			),
			'adsense'            => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => null,
			),
			'search-console'     => array(
				'sharedRoles' => array( 'editor', 'subscriber' ),
				'management'  => 'all_admins',
			),
		);
		$expected              = array(
			'analytics'          => array(
				'sharedRoles' => array(),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array(),
				'management'  => 'all_admins',
			),
			'adsense'            => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => 'owner',
			),
			'search-console'     => array(
				'sharedRoles' => array( 'editor', 'subscriber' ),
				'management'  => 'all_admins',
			),
		);
		$this->settings->set( $test_sharing_settings );
		$this->assertEquals( $expected, $this->settings->get() );
	}

	public function test_unset_module() {
		$test_sharing_settings = array(
			'analytics'          => array(
				'sharedRoles' => array(),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array(),
				'management'  => 'all_admins',
			),
			'adsense'            => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => 'owner',
			),
			'search-console'     => array(
				'sharedRoles' => array( 'editor', 'subscriber' ),
				'management'  => 'all_admins',
			),
		);
		$expected              = array(
			'analytics'      => array(
				'sharedRoles' => array(),
				'management'  => 'owner',
			),
			'adsense'        => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => 'owner',
			),
			'search-console' => array(
				'sharedRoles' => array( 'editor', 'subscriber' ),
				'management'  => 'all_admins',
			),
		);
		$this->settings->set( $test_sharing_settings );
		$this->assertEquals( $test_sharing_settings, $this->settings->get() );

		$this->settings->unset_module( 'pagespeed-insights' );

		$this->assertEquals( $expected, $this->settings->get() );
	}

	public function test_get_all_shared_roles() {
		$test_sharing_settings = array(
			'analytics'          => array(
				'sharedRoles' => array( 'contributor' ),
				'management'  => '',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => null,
				'management'  => 'all_admins',
			),
			'adsense'            => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => null,
			),
			'search-console'     => array(
				'sharedRoles' => array( 'editor', 'subscriber' ),
				'management'  => 'all_admins',
			),
		);
		$this->settings->set( $test_sharing_settings );
		$this->assertEqualSets( array( 'contributor', 'editor', 'subscriber' ), $this->settings->get_all_shared_roles() );
	}

	public function test_get_shared_roles() {
		$this->assertEmpty( $this->settings->get_shared_roles( 'pagespeed-insights' ) );

		$test_sharing_settings = array(
			'analytics'          => array(
				'sharedRoles' => array( 'editor', 'subscriber' ),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array(),
				'management'  => 'all_admins',
			),
		);

		$this->settings->set( $test_sharing_settings );
		$this->assertEquals( array( 'editor', 'subscriber' ), $this->settings->get_shared_roles( 'analytics' ) );
		$this->assertEmpty( $this->settings->get_shared_roles( 'pagespeed-insights' ) );
	}

	public function test_merge() {
		$this->enable_feature( 'dashboardSharing' );

		update_option(
			'googlesitekit_active_modules',
			array(
				'search-console',
				'analytics',
				'pagespeed-insights',
			)
		);

		$initial_sharing_settings = array(
			'search-console'     => array(
				'sharedRoles' => array( 'contributor' ),
				'management'  => 'owner',
			),
			'analytics'          => array(
				'sharedRoles' => array( 'contributor', 'subscriber' ),
				'management'  => 'all_admins',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array(),
				'management'  => 'all_admins',
			),
		);

		// Set some valid sharing settings to test merging.
		$this->settings->set( $initial_sharing_settings );

		// Can not merge with inactive modules (module already not present in settings).
		$this->assertFalse(
			$this->settings->merge(
				array(
					'adsense' => array(
						'sharedRoles' => array( 'editor' ),
						'management'  => 'owner',
					),
				)
			)
		);

		// Modules with `null` values are ignored.
		$this->assertFalse(
			$this->settings->merge(
				array(
					'search-console' => null,
					'analytics'      => null,
				)
			)
		);

		// Merges settings with valid partials and keeps the rest.
		$test_sharing_settings = array(
			'search-console'     => array(
				'sharedRoles' => array( 'contributor', 'editor' ),
			),
			'analytics'          => array(
				'management' => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array( 'author' ),
				'management'  => 'owner',
			),
		);
		$expected              = array(
			'search-console'     => array(
				'sharedRoles' => array( 'contributor', 'editor' ),
				'management'  => 'owner',
			),
			'analytics'          => array(
				'sharedRoles' => array( 'contributor', 'subscriber' ),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array( 'author' ),
				'management'  => 'owner',
			),
		);

		$this->assertTrue( $this->settings->merge( $test_sharing_settings ) );
		$this->assertEquals( $expected, $this->settings->get() );

		// Keeps the valid parts of partial and descards the invalid parts.
		$test_sharing_settings = array(
			'adsense'            => array(
				'sharedRoles' => array( 'editor' ),
				'management'  => 'owner',
			),
			'search-console'     => null,
			'analytics'          => array(
				'sharedRoles' => array( 'contributor' ),
				'invalid'     => array( 'invalid' ),
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array( 'subscriber' ),
				'management'  => null,
			),
		);
		$expected              = array(
			'search-console'     => array(
				'sharedRoles' => array( 'contributor', 'editor' ),
				'management'  => 'owner',
			),
			'analytics'          => array(
				'sharedRoles' => array( 'contributor' ),
				'management'  => 'owner',
			),
			'pagespeed-insights' => array(
				'sharedRoles' => array( 'subscriber' ),
				'management'  => 'owner',
			),
		);

		$this->assertTrue( $this->settings->merge( $test_sharing_settings ) );
		$this->assertEquals( $expected, $this->settings->get() );
	}

}
