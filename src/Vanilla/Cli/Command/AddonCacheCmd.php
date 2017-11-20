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

    use AddonManagerTrait;

    /**
     * AddonCacheCmd constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Generate addons\'s cache files.')
            ->opt('regenerate:r', 'Regenerate the cache files.');
    }

    /**
     * @inheritdoc
     */
    public final function run(Args $args) {
        $this->initializeAddonManager($this->vanillaSrcDir, true);

        if ($args->getOpt('regenerate', false) !== false) {
            $this->getAddonManager()->clearCache();
        }

        foreach (array_keys($this->getAddonManager()->getScanDirs()) as $addonType) {
            $this->getAddonManager()->lookupAllByType($addonType);
        }
    }
}
