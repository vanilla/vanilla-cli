<?php

namespace Vanilla\Cli\Cmd;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Addon;
use \Vanilla\AddonManager;
use \Vanilla\Cli\CliUtil;

class AddonJsonCmd extends AddonCmdBase {

    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Convert addons\' info array to json.');
    }

    protected function preAddonManagerInit(Args $args, array &$scanDirs, &$addonManagerCachePath) {
        // Set cache path to null so make sure that we do not mess with the cache.
        $addonManagerCachePath = null;
    }

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
                    file_put_contents($addonDefinitionPath, json_encode($info, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
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
