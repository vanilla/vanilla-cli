<?php
/**
 *
 */

namespace Vanilla\Cli\Cmd;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Addon;
use \Vanilla\AddonManager;
use \Vanilla\Cli\CliUtil;

/**
 * Class AddonCmdBase
 */
abstract class AddonCmdBase extends Cmd {
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->opt(
            'vanillasrc',
            'Vanilla source folder. This parameter can be skipped if you set VANILLACLI_VANILLA_SRC_DIR in your environment variables.'
        );
    }

    public final function run(Args $args) {
        $vanillaSrcDir = $args->getOpt('vanillasrc', getenv('VANILLACLI_VANILLA_SRC_DIR'));
        if (!$vanillaSrcDir || !is_dir($vanillaSrcDir)) {
            CliUtil::error('Vanilla source directory is missing.');
        }

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

    protected function preAddonManagerInit(Args $args, array &$scanDirs, &$addonManagerCachePath) {
        // Nothing to do here!
    }

    protected abstract function doRun(Args $args, AddonManager $addonManager);
}
