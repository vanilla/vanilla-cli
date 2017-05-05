<?php

namespace Vanilla\Cli\Cmd;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Addon;
use \Vanilla\AddonManager;
use \Vanilla\Cli\CliUtil;

class AddonCacheCmd extends AddonCmdBase {

    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Generate addons\'s cache files')
            ->opt('regenerate:r', 'Regenerate the cache files');
        ;
    }

    public function doRun(Args $args, AddonManager $addonManager) {
        if ($args->getOpt('regenerate', false) !== false) {
            $addonManager->clearCache();
        }

        foreach (array_keys($addonManager->getScanDirs()) as $addonType) {
            $addonManager->lookupAllByType($addonType);
        }
    }
}
