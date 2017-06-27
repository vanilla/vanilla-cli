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
            ->opt('verbose:v', 'Show detailed build process output', false, 'bool');
        ;
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args) {
        $isVerbose = $args->getOpt('verbose');
        $this->runBuildSetup();
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
        $folderName = dirname($packageJsonPath);

        CliUtil::write("Installing dependancies for $folderName");

        if (!file_exists($packageJsonPath)) {
            CliUtil::write("Skipping install for $folderName - No package.json exists");
            return;
        }

        $packageJson = json_decode(file_get_contents($packageJsonPath), true);
        $installCommand = 'yarn install --color';
        $shouldUpdate = false;

        if (file_exists($vanillaBuildPath)) {
            $vanillaBuild = json_decode(file_get_contents($vanillaBuildPath), true);
            $shouldUpdate = version_compare($packageJson['version'], $vanillaBuild['installedVersion'], '>');
        }

        if ($shouldUpdate) {
            chdir($directoryPath);
            $isVerbose ? system($command) : `$command`;
            $shouldResetDirectory && chdir($workingDirectory);

            $newVanillaBuildContents = [
                'installedVersion' => $packageJson['version']
            ];

            if ($vanillaBuild) {
                $newVanillaBuildContents = $vanillaBuild + $newVanillaBuildContents;
            }
            file_put_contents(json_encode($newVanillaBuildContents));
        }
    }

    /**
     * Run the setup for the build process.
     *
     * This will only re-install dependencies if the `installedVersion` of
     * the vanillabuild.json file is less than the `version` in its package.json
     *
     * @return void
     */
    public function runBuildSetup($isVerbose) {
        $validNode = $this->isValidNodeInstall();
        if ($validNode) {
            $workingDirectory = getcwd();
            $baseToolsPath = realpath(__DIR__.'/../../FrontendTools');
            $processVersionPaths = glob("$baseToolsPath/*", \GLOB_ONLYDIR);

            $this->installNodeDepsForFolder($baseToolsPath, false);
            foreach ($processVersionPaths as $processVersionPath) {
                $this->installNodeDepsForFolder($processVersionPath, false);
            }

            // Change the working directory back
            chdir($workingDirectory);
        } else {
            $this->printInvalidNodeError();
        }
    }
}
