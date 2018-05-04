<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\AddonManager;
use Vanilla\Cli\AddonManagerTrait;

/**
 * Class AddonCacheCmd
 *
 * @package Vanilla\Cli\Command
 */
class AddonCacheCmd extends Command {
    public static function commandInfo(Cli $cli) {
        parent::commandInfo($cli);
        $cli->description('Generate addons\'s cache files.')
            ->opt('regenerate:r', 'Regenerate the cache files.');
    }

    /**
     * @inheritdoc
     */
    public final function run() {
        /** @var AddonManager $addonManager */
        $addonManager = $this->container->get(AddonManager::class);
        if ($this->args->getOpt('regenerate', false) !== false) {
            $addonManager->clearCache();
        }

        foreach (array_keys($addonManager->getScanDirs()) as $addonType) {
            $addonManager->lookupAllByType($addonType);
        }
    }
}
