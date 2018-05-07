<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Cli;
use \Vanilla\Addon;
use \Vanilla\AddonManager;
use \Vanilla\Cli\CliUtil;

/**
 * Class AddonJsonCmd
 *
 * @package Vanilla\Cli\Command
 */
class AddonJsonCmd extends Command {
    public static function commandInfo(Cli $cli) {
        parent::commandInfo($cli);
        $cli->description('Convert addons\' info array to json.');
    }

    /**
     * @inheritdoc
     */
    public final function run() {
        /** @var AddonManager $addonManager */
        $addonManager = $this->container->get(AddonManager::class);

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
                    // This kludge is only needed if the application manager exist.
                    if ($info['oldType'] === 'plugin' || !class_exists('Gdn_ApplicationManager')) {
                        unset($info['keyRaw']);
                    }

                    if ($info['priority'] === Addon::PRIORITY_NORMAL) {
                        unset($info['priority']);
                    }

                    unset($info['Issues'], $info['oldType']);

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
