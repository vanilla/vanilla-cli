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
 * Class AddonDoctorCmd
 *
 * @package Vanilla\Cli\Command
 */
class AddonDoctorCmd extends AddonCommandBase {

    /**
     * AddonDoctorCmd constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Verify addons\' requirements.');
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
        $getRelativePath = function($from, $path) {
            $path = explode(DIRECTORY_SEPARATOR, $path);
            $from = explode(DIRECTORY_SEPARATOR, $from);
            $common = array_intersect_assoc($path, $from);

            $base = [];
            if ($preFill = count(array_diff_assoc($from, $common))) {
                $base = array_fill(0, $preFill, '..');
            }
            $path = array_merge($base, array_diff_assoc($path, $common));
            return implode(DIRECTORY_SEPARATOR, $path);
        };

        $sickAddonsCount = 0;
        $issuesCount = 0;
        foreach ($addonManager->getScanDirs() as $addonType => $scanDirectories) {
            foreach ($scanDirectories as $scanDirectory) {
                $addonDirs = glob(PATH_ROOT."$scanDirectory/*", GLOB_ONLYDIR);
                foreach ($addonDirs as $subdir) {
                    $addon = null;
                    $addonRealPathFromVanilla = $getRelativePath(PATH_ROOT, realpath($subdir));
                    $addonRelativePath = str_replace(PATH_ROOT, '', $subdir);
                    $addonIssues = [];
                    try {
                        ob_start();
                        $addon = new Addon($addonRelativePath);
                        ob_end_clean();
                    } catch (\Exception $ex) {
                        $addonIssues[] = $ex->getMessage();
                    }

                    if ($addon !== null) {
                        $issues = $addon->getInfoValue('Issues', []);
                        if ($issues) {
                            $addonIssues = array_merge($addonIssues, $issues);
                        }

                        // Check for key vs addon's directory match.
                        $addonKey = $addon->getKey();
                        $addonSubdir = basename($addon->path('/', Addon::PATH_REAL));
                        if ($addonKey !== $addonSubdir) {
                            // Themes and plugins already kind of check for this issue but this check is stricter so no problem overriding here.
                            $addonIssues['key-subdir-mismatch'] = "The addon's key must match its subdirectory name ($addonKey vs. $addonSubdir).";
                        }

                        // Check for icons.
                        if (!$addon->getInfoValue('hidden', false)) {
                            if (!$addon->getInfoValue('icon')) {
                                $addonIssues['required-icon'] = 'The icon info field is required.';
                            } else if (!file_exists($addon->getIcon(Addon::PATH_FULL))) {
                                $addonIssues['required-iconfile'] = 'The icon file specified by the icon info field does not exist.';
                            }
                        }
                    }

                    if ($addonIssues) {
                        $sickAddonsCount++;
                        $issuesCount += count($addonIssues);
                        ksort($addonIssues);

                        CliUtil::write("[$addonRealPathFromVanilla] has somme issues:");
                        $outputArray = explode(PHP_EOL, print_r($addonIssues, true));
                        unset($outputArray[count($outputArray) - 2], $outputArray[0], $outputArray[1]);
                        CliUtil::write(implode("\n", $outputArray));
                    }
                }
            }
        }

        if ($sickAddonsCount) {
            CliUtil::write("Number of sick addons: $sickAddonsCount");
            CliUtil::write("Number of issues: $issuesCount");
        }
    }
}
