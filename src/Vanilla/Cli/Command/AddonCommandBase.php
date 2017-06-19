<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Addon;
use \Vanilla\AddonManager;
use \Vanilla\Cli\CliUtil;

/**
 * Class AddonCommandBase
 */
abstract class AddonCommandBase extends Command {

    /**
     * AddonCmdBase constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->opt(
            'vanillasrc',
            'Vanilla source folder. This parameter can be skipped if you set VANILLACLI_VANILLA_SRC_DIR in your environment variables.'
        );
    }

    /**
     * @inheritdoc
     */
    public final function run(Args $args) {
        $vanillaSrcDir = $args->getOpt('vanillasrc', getenv('VANILLACLI_VANILLA_SRC_DIR'));
        if (!$vanillaSrcDir || !is_dir($vanillaSrcDir)) {
            CliUtil::error('Vanilla source directory is missing.');
        }

        define('PATH_ROOT', realpath($vanillaSrcDir));
        if (!require_once("$vanillaSrcDir/environment.php")) {
            CliUtil::error('Vanilla version must be >= 2.4.201');
        }

        $scanDirs = [
            Addon::TYPE_ADDON => ['/applications', '/plugins'],
            Addon::TYPE_THEME => '/themes',
            Addon::TYPE_LOCALE => '/locales'
        ];
        $addonManagerCachePath = PATH_CACHE;

        $this->preAddonManagerInit($args, $scanDirs, $addonManagerCachePath);

        $addonManager = new AddonManager($scanDirs, $addonManagerCachePath);

        $this->doRun($args, $addonManager);
    }

    /**
     * This function is called right before the addon manager is initialised.
     *
     * @param Args $args Cli arguments.
     * @param array $scanDirs AddonManager's scan directories.
     * @param string $addonManagerCachePath AddonManager's cache path.
     */
    protected function preAddonManagerInit(Args $args, array &$scanDirs, &$addonManagerCachePath) {
        // Nothing to do here!
    }


    /**
     * AddonCommandBase's execution function.
     *
     * @param Args $args
     * @param AddonManager $addonManager
     */
    protected abstract function doRun(Args $args, AddonManager $addonManager);
}
