<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 * @package Vanilla\Cli\Command
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Cli;
use \Vanilla\Cli\CliUtil;
use \Garden\Cli\Args;

/**
 * Class BuildCmd.
 */
class BuildCmd extends NodeCommandBase {

    /**
     * BuildCmd constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Run the javascirpt build process.')
            ->opt('watch:w', 'Run the build process in watch mode. Best used with the livereload browsre extension.', false, 'bool')
            ->opt('process:p', 'Which version of the build process to use. This will override the one specified in the addon.json')
            ->opt('setup', 'Install dependencies for the javascript build process. Run this after every update.')
            ->opt('verbose:v', 'Show detailed build process output', false, 'bool');;
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args) {
        $isVerbose = $args->getOpt('verbose');
        $this->runBuildSetup($isVerbose);
    }

    /**
     * Install the node dependancies for a folder.
     *
     * Compares the `installedVersion` in vanillabuild.json
     * and the `version` in package.json to determine if installation is needed.
     * Creates vanillabuild.json if it doesn't exist.
     *
     * @param string $directoryPath The absolute path to run the command in
     * @param bool $shouldResetDirectory Whether or not to set the directory back to the working directory
     * @param bool $isVerbose Determines if verbose output should be printed
     *
     * @return void
     */
    public function installNodeDepsForFolder(string $directoryPath, bool $shouldResetDirectory = true, bool $isVerbose = false) {
        $workingDirectory = getcwd();
        $packageJsonPath = "$directoryPath/package.json";
        $vanillaBuildPath = "$directoryPath/vanillabuild.json";
        $folderName = basename($directoryPath);

        CliUtil::write(PHP_EOL."Checking dependancies for $folderName");

        if (!file_exists($packageJsonPath)) {
            CliUtil::write("Skipping install for $folderName - No package.json exists");
            return;
        }

        $packageJson = json_decode(file_get_contents($packageJsonPath), true);
        $shouldUpdate = true;
        $vanillaBuild = false;
        $outputMessage = '';

        if (file_exists($vanillaBuildPath)) {
            $vanillaBuild = json_decode(file_get_contents($vanillaBuildPath), true);
            $packageVersion = $packageJson['version'];
            $installedVersion = $vanillaBuild['installedVersion'];
            $shouldUpdate = version_compare($packageVersion, $installedVersion, '>');

            $outputMessage = $shouldUpdate ?
                "Installing dependencies for $folderName
    Installed Version - $installedVersion
    Current Version - $packageVersion"      :
                "Skipping install for $folderName - Already installed
    Installed Version - $installedVersion
    Current Version - $packageVersion";
        } else {
            $outputMessage = "Installing dependencies for $folderName - No Installed Version Found";
        }

        CliUtil::write($outputMessage);

        if ($shouldUpdate) {
            $command = 'yarn install';

            chdir($directoryPath);
            $isVerbose ? system($command) : `$command`;
            $shouldResetDirectory && chdir($workingDirectory);

            $newVanillaBuildContents = [
                'installedVersion' => $packageJson['version']
            ];

            if ($vanillaBuild) {
                $newVanillaBuildContents = $vanillaBuild + $newVanillaBuildContents;
            }

            CliUtil::write("Writing new `vanillabuild.json` file.");
            file_put_contents('vanillabuild.json', json_encode($newVanillaBuildContents));
        }
    }

    /**
     * Run the setup for the build process.
     *
     * This will only re-install dependencies if the `installedVersion` of
     * the vanillabuild.json file is less than the `version` in its package.json
     *
     * @param bool $isVerbose Whether to verbose output
     *
     * @return void
     */
    public function runBuildSetup(bool $isVerbose) {
        $workingDirectory = getcwd();
        $baseToolsPath = realpath(__DIR__ . '/../../FrontendTools');
        $processVersionPaths = glob("$baseToolsPath/versions/*", \GLOB_ONLYDIR);

        $this->installNodeDepsForFolder($baseToolsPath, false, $isVerbose);
        foreach ($processVersionPaths as $processVersionPath) {
            $this->installNodeDepsForFolder($processVersionPath, false, $isVerbose);
        }

            // Change the working directory back

        chdir($workingDirectory);
    }
}
