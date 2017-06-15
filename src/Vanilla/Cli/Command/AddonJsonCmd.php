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
 * Class AddonJsonCmd
 *
 * @package Vanilla\Cli\Command
 */
class AddonJsonCmd extends AddonCommandBase {

    /**
     * AddonJsonCmd constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Convert addons\' info array to json.');
    }

    /**
     * @inheritdoc
     */
    protected function preAddonManagerInit(Args $args, array &$scanDirs, &$addonManagerCachePath) {
        // Set cache path to null so make sure that we do not mess with the cache.
        $addonManagerCachePath = null;
    }

    /**
     * @inheritdoc
     */
    public function doRun(Args $args, AddonManager $addonManager) {
        $addonsOutput = '';
        $warningsOutput = '';
        foreach (array_keys($addonManager->getScanDirs()) as $addonType) {
            ob_start();
            $addons = $addonManager->scan($addonType);
            $warningsOutput = ob_get_contents();
            ob_end_clean();
            ob_start();
            foreach ($addons as $addonKey => $addon) {
                /** @var Addon $addon */
                $addonPath = $addon->path();
                $addonDefinitionPath = "$addonPath/addon.json";
                if (file_exists($addonDefinitionPath)) {
                    continue;
                }
                $info = $addon->getInfo();
                if (!$addon->getInfoValue('Issues')) {
                    unset($info['Issues'], $info['keyRaw'], $info['oldType']);
                    if ($info['priority'] === Addon::PRIORITY_NORMAL) {
                        unset($info['priority']);
                    }

                    CliUtil::write($addonDefinitionPath.' generated.');
                    file_put_contents($addonDefinitionPath, json_encode($info, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)."\n");
                } else {
                    CliUtil::write("$addonKey  in '$addonPath' has some issues that must be fixed.\n".print_r($info['Issues'], true));
                }
            }
            $addonsOutput .= ob_get_contents();
            ob_end_clean();
        }

        if ($addonsOutput) {
            CliUtil::write($addonsOutput);
        }
        if ($warningsOutput) {
            CliUtil::write("=== AddonManager's warnings ===");
            CliUtil::write($warningsOutput);
        }
    }
}
