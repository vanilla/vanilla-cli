<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @package Vanilla\Cli\Command
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Cli\CliUtil;
use \Exception;

/**
 * Class NodeCommandBase.
 */
abstract class NodeCommandBase extends Command {

    /** @var string We require node 8 because it is the latest LTS with support for async/await */
    const MINIMUM_NODE_VERSION = '8.0.0';

    /** @var array */
    protected $dependencyDirectories = [];

    /** @var string The absolute directory of the tools installation */
    protected $toolRealPath;

    /** @var bool */
    protected $isDebugMode = false;

    /** @var bool */
    protected $isVerbose = false;

    /**
     * NodeCommandBase constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli
            ->opt('debug:d', 'Break node process on the first line to attach a debugger.', false, 'bool')
            ->opt('reinitialize:r', 'Delete all tool dependencies before building.', false, 'bool')
            ->opt('verbose:v', 'Show additional output.', false, 'bool');

        $this->toolRealPath = realpath(__DIR__.'/../../../..');
    }

    /**
     * @inheritdoc
     */
    final public function run(Args $args) {
        $this->isVerbose = $args->getOpt('verbose') ?: false;
        $this->isDebugMode = $args->getOpt('debug') ?: false;

        $this->checkValidNodeInstallation();
        $shouldReinitalize = $args->getOpt('reinitialize') ?: false;

        // Ensure all dependencies are installed correctly for the process.
        foreach($this->dependencyDirectories as $directory) {
            if ($shouldReinitalize) {
                $this->deleteDependenciesForDirectory($directory);
            }
            $this->checkNeedsInstallation($directory);
        }

        $this->doRun($args);
    }

    /**
     * The NodeCommand's execution function
     *
     * @param Args $args The CLI arguments
     *
     * @return void
     */
    abstract protected function doRun(Args $args);

    /**
     * Spawn the child node process.
     *
     * The node process will handle the rest of the work for this command.
     * The build tools can output so much to stdio that it is not worth
     * trying to parse any of it of from this side.
     *
     * @param string $nodeFilePath The absolute file path of the entry script.
     * @param array $options An array of options to pass to the node process.
     *
     * @return void
     * @throws Exception
     */
    protected function spawnNodeProcessFromFile($nodeFilePath, $options = []) {
        $debugArg = $this->isDebugMode ? '--inspect --inspect-brk --nolazy' : '';

        $verboseOptions = [
            'verbose' => $this->isVerbose ?: false,
        ];
        $options = array_merge($verboseOptions, $options);
        $serializedOptions = json_encode($options);

        $command = "node $debugArg '$nodeFilePath' --color --options '$serializedOptions'";
        passthru($command);
    }

    /**
     * Spawn a node.js process based on the main script defined in its `package.json`
     *
     * @param string $directory The directory to search for the `package.json` in.
     * @param array $options An array of options to pass to the node process.
     *
     * @return void
     * @throws Exception
     */
    protected function spawnNodeProcessFromPackageMain($directory, $options = []) {
        $packageJson = json_decode(file_get_contents($directory.'/package.json'), true);
        $command = $packageJson['main'] ?: false;
        $scriptPath = realpath("$directory/$command");

        if (!$command || !$scriptPath ) {
            CliUtil::error("Command not found in `main` of $directory/package.json.");
        }

        $this->spawnNodeProcessFromFile($scriptPath, $options);
    }

    /** --- Node Version Validation --- */

    /**
     * Get the version of the user's current node installation.
     *
     * @return string
     * @throws Exception If Node & Yarn are not installed
     */
    protected static function getCurrentNodeVersion() {
        $nodeExists = `which node`;
        $yarnExists = `which yarn`;

        if (empty($nodeExists) || empty($yarnExists)) {
            CliUtil::error(
                'Node and Yarn are not installed properly or are not visible on your path.'
                ."\nCheck https://github.com/vanilla/vanilla-cli/wiki/Node.js-Processes for installation instructions."
            );
            return false;
        }

        $nodeVersionString = `node --version`;

        // Drop the 'v' of the beginning of the version string
        return trim(substr($nodeVersionString, 1));
    }

    /**
     * Verify that the minimum required version of node is installed and on the path
     *
     * @return boolean
     */
    private function checkValidNodeInstallation() {
        $hasValidNodeVersion = version_compare(self::getCurrentNodeVersion(), self::MINIMUM_NODE_VERSION, '>=');

        if (!$hasValidNodeVersion) {
            $minimum = self::MINIMUM_NODE_VERSION;
            CliUtil::error(
                "Node.js version out of date. Minimum required version is $minimum"
                ."\nCheck https://github.com/vanilla/vanilla-cli/wiki/Node.js-Processes for installation instructions."
            );
        }
    }

    /** --- Dependency Management --- */

    /**
     * Check if we need to install dependencies for a given directory.
     *
     * @param string $directoryPath The realpath to the folder we wish to install dependencies for.
     */
    private function checkNeedsInstallation($directoryPath) {
        $packageJsonPath = "$directoryPath/package.json";
        $vanillaLockJsonPath = "$directoryPath/vanilla.lock.json";
        $parentFolderName = basename(realpath($directoryPath.'/../'));
        $folderName = basename($directoryPath);

        $displayName = $parentFolderName.'/'.$folderName;

        $this->isVerbose && CliUtil::write(PHP_EOL."Checking dependencies for build process version $displayName");

        if (!file_exists($packageJsonPath)) {
            CliUtil::error("Unable to install dependencies for node process at $directoryPath - No package.json exists");
            return;
        }

        if (!file_exists($vanillaLockJsonPath)) {
            $reason = "Installing dependencies for node process $displayName - No Installed Version Found";
            $this->installDependenciesForDirectory($directoryPath, $reason);
            return;
        }

        $packageJson = json_decode(file_get_contents($packageJsonPath), true);
        $vanillaLockJson = json_decode(file_get_contents($vanillaLockJsonPath), true);
        $installedVersion = $vanillaLockJson['installedVersion'];
        $packageVersion = $packageJson['version'];

        $currentNodeVersion = self::getCurrentNodeVersion();

        $hasHadNodeUpdate = version_compare($vanillaLockJson['nodeVersion'], $currentNodeVersion, '<');
        $hasHadPackageUpdate = version_compare($packageVersion, $installedVersion, '>');

        if ($hasHadNodeUpdate) {
            CliUtil::write(
                "\nThis tool's dependencies were installed with Node.js version {$vanillaLockJson['nodeVersion']}"
                ."\n    Current Node.js version is {$currentNodeVersion}"
                ."\nNode process $displayName's dependencies will need to be reinstalled"
            );
            $this->deleteDependenciesForDirectory($directoryPath);
        }

        if ($hasHadPackageUpdate) {
            $reason = "Installing dependencies for node process $displayName"
                ."\n    Installed Version - $installedVersion"
                ."\n    Current Version - $packageVersion";
            $this->installDependenciesForDirectory($directoryPath, $reason);
            return;
        }

        if ($this->isVerbose) {
            CliUtil::write(
                "Skipping install for node process $displayName - Already installed"
                ."\n    Installed Version - $installedVersion"
                ."\n    Current Version - $packageVersion"
            );
        }
    }

    /**
     * Install the node dependencies for a folder.
     *
     * Compares the `installedVersion` in vanilla.lock.json
     * and the `version` in package.json to determine if installation is needed.
     * Creates vanilla.lock.json if it doesn't exist.
     *
     * @param string $directoryPath The absolute path to run the command in
     * @param string $reason Why the dependencies are being installed
     *
     * @return void
     */
    private function installDependenciesForDirectory($directoryPath, $reason) {
        CliUtil::write($reason);

        $command = 'yarn install';
        $workingDirectory = getcwd();

        chdir($directoryPath);
        $this->isVerbose ? system($command) : `$command`;
        $this->writeInstallationVersions($directoryPath);

        chdir($workingDirectory);
    }

    /**
     * Delete the node_modules folder and vanilla.lock.json file for a directory
     *
     * @param string $directoryPath The directory to do the deletion in.
     *
     * @return void
     */
    private function deleteDependenciesForDirectory($directoryPath) {
        $vanillaLockJsonPath = "$directoryPath/vanilla.lock.json";
        $folderName = basename($directoryPath);

        CliUtil::write("Deleting dependencies for build process version $folderName");

        $dir = realpath("$directoryPath/node_modules");
        if (PHP_OS === 'Windows') {
            $command = "rd /s /q {$dir}";
        } else {
            $command = "rm -rf {$dir}";
        }

        $this->isVerbose ? system($command) : `$command`;

        if (file_exists($vanillaLockJsonPath)) {
            unlink($vanillaLockJsonPath);
        }
        CliUtil::write("Dependencies deleted for build process version $folderName");
    }

    /**
     * Write a vanilla.lock.json file to the directory containing details of the installation.
     *
     * Made up of:
     * - installedVersion: The version of that build process that dependencies have been installed for.
     * - nodeVersion: The version of node that the dependencies were installed with.
     *
     * @param string $directoryPath The directory to write the file for
     */
    private function writeInstallationVersions($directoryPath) {
        $packageJson = json_decode(file_get_contents($directoryPath.'/package.json'), true);
        $vanillaLockJsonPath = "$directoryPath/vanilla.lock.json";

        $newVanillaLockContents = [
            'installedVersion' => $packageJson['version'],
            'nodeVersion' => self::getCurrentNodeVersion(),
        ];

        $this->isVerbose && CliUtil::write("Writing new `vanilla.lock.json` file.");
        file_put_contents($vanillaLockJsonPath, json_encode($newVanillaLockContents));
    }
}
