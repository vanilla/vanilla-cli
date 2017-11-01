<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @package Vanilla\Cli\Command
 */

namespace Vanilla\Cli\Command;

use \RecursiveDirectoryIterator;
use \RecursiveIteratorIterator;
use \Garden\Cli\Cli;
use \Vanilla\Cli\CliUtil;
use \Garden\Cli\Args;

/**
 * Class BuildCmd.
 */
class BuildCmd extends NodeCommandBase {

    /** @var string  */
    protected $buildToolBaseDirectory;

    /** @var array */
    private $buildConfig = [
        'processVersion' => 'legacy'
    ];

    /**
     * BuildCmd constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Build frontend assets (scripts, stylesheets, and images).')
            ->opt('watch:w', 'Run the build process in watch mode. Best used with the livereload browser extension.', false, 'bool')
            ->opt('process:p', 'Which version of the build process to use. This will override the one specified in the addon.json');

        $this->buildToolBaseDirectory = $this->toolRealPath.'/src/BuildTools';
        $this->dependencyDirectories = [
            $this->buildToolBaseDirectory,
            $this->buildToolBaseDirectory.'/versions/v1/',
            $this->buildToolBaseDirectory.'/versions/legacy/',
        ];
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args) {
        $processOptions = [
            $args->getOpt('watch') ?: false,
        ];

        $this->determineBuildProcessVersion($args);

        $this->spawnNodeProcessFromPackageMain(
            $this->getBuildProcessDirectory(),
            $processOptions
        );
    }

    /**
     * Determine which build process to use.
     *
     * Will search in the following order
     * -> Argument passed directly the CLI
     * -> `build.processVersion` in addon.json
     * -> `buildProcessVersion` in addon.json
     * -> 'legacy' as the default
     *
     * @param Args $args The CLI arguments
     */
    protected function determineBuildProcessVersion(Args $args) {
        $cliArg = $args->getOpt('process') ?: false;
        if ($cliArg) {
            $this->buildConfig['processVersion'] = $cliArg;
        } else {
            $addonJsonPath = getcwd().'/addon.json';
            if (file_exists($addonJsonPath)) {
                $addonJson = json_decode(file_get_contents($addonJsonPath), true);
                if (array_key_exists('build', $addonJson)) {
                    $this->buildConfig = array_merge($this->buildConfig, $addonJson['build']);
                    // Check for legacy key name
                } else if (array_key_exists('buildProcessVersion', $addonJson)){
                    $this->buildConfig['processVersion'] = $addonJson['buildProcessVersion'];
                }
            }
        }
        // Map old values to new ones
        if ($this->buildConfig['processVersion'] === '1.0') {
            $this->buildConfig['processVersion'] = 'v1';
            CliUtil::write("The build process version '1.0' has been renamed to 'v1'. Please update your build configuration");
        }
    }

    /**
     * Return all of the current build process versions
     *
     * @return array The directory names
     */
    protected function getPossibleBuildProcessVersions() {
        $buildDirectories = glob($this->buildToolBaseDirectory.'/versions/*');
        $validBuildDirectories = [];
        foreach ($buildDirectories as $directory) {
            $validBuildDirectories[] = basename($directory);
        }
        return $validBuildDirectories;
    }

    /**
     * Get the directory of the build process to execute
     *
     * @param string $processVersion The arguments from the CLI
     *
     * @return string
     */
    protected function getBuildProcessDirectory() {
        $processVersion = $this->buildConfig['processVersion'];
        $path = $this->buildToolBaseDirectory.'/versions/'.$processVersion;
        if (!file_exists($path)) {
            $buildVersions = implode(', ', $this->getPossibleBuildProcessVersions());
            CliUtil::error("Could not find build process version $processVersion"
                ."\n    Available build process versions are"
                ."\n$buildVersions");
        }
        CliUtil::write("\nStarting build process version $processVersion");
        return $path;
    }
}
