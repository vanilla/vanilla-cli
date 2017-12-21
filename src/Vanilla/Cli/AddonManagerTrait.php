<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli;

use \Exception;
use \Vanilla\Addon;
use \Vanilla\AddonManager;

/**
 * Trait for getting and using the AddonManager.
 */
trait AddonManagerTrait {

    /** @var AddonManager */
    private $addonManager;

    /**
     * Initialize the addon manager.
     *
     * @param string $vanillaSrcDir The directory of the Vanilla installation to use.
     * @param string $useEnvironmentalCachePath Whether or not to use the cache path in the Vanilla enviroment.php file.
     *
     * @return void
     */
    protected function initializeAddonManager($vanillaSrcDir, $useEnvironmentalCachePath = false) {
        // We must define this globally so it can be picked up by the enviroment.php file.
        define('PATH_ROOT', $vanillaSrcDir);

        if (!\file_exists("$vanillaSrcDir/environment.php")) {
            CliUtil::fail('Vanilla version must be >= 2.4.201');
        }

        require_once("$vanillaSrcDir/environment.php");

        $addonManagerCachePath = $useEnvironmentalCachePath ? PATH_CACHE : null;

        $scanDirs = [
            Addon::TYPE_ADDON => ['/applications', '/plugins'],
            Addon::TYPE_THEME => '/themes',
            Addon::TYPE_LOCALE => '/locales'
        ];

        $this->addonManager = new AddonManager($scanDirs, $addonManagerCachePath);
    }

    /**
     * Get an instance of the addon manager. Will initialize the addon manager for your if you haven't done it yet.
     *
     * @return AddonManager
     */
    protected function getAddonManager() {
        return $this->addonManager;
    }
}
