<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @package Vanilla\Cli\Command
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Cli;
use \Garden\Cli\Args;
use \Garden\Cli\LogFormatter;
use \Vanilla\Cli\CliUtil;
use \Vanilla\Cli\AddonManagerTrait;
use \Vanilla\Addon;
use \Vanilla\AddonManager;
use function Vanilla\Cli\array_deep_key_exists;

/**
 * Class BuildCmd.
 */
class BuildCmd extends NodeCommandBase {

    /** @var string  */
    protected $buildToolBaseDirectory;

    /** @var array The build configuration options.
     *
     * - process: 'legacy' | '1.0'
     * - cssTool: 'scss' | 'less'
     * - js.entry: Object A mapping of chunkname -> entrypoint.
     */
    private $defaultConfigurationOptions = [
        'process' => 'legacy',
        'cssTool' => 'scss',
        'js' => [
            'entry' => [
                'custom' => 'index.js',
            ],
        ],
    ];

    /** @var array An array of addon configurations to build with. */
    private $addonBuildConfigs = [];

    /** @var array An array of realpaths to roots of addons being built. */
    private $addonRootDirectories = [];

    /** @var array An array of parent build configurations */
    private $parentConfigs = [];

    /**
     * BuildCmd constructor.
     *
     * @param Cli $cli The CLI instance.
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Build frontend assets (scripts, stylesheets, and images).')
            ->opt('watch:w', 'Run the build process in watch mode. Best used with the livereload browser extension.', false, 'bool')
            ->opt('process:p', 'Which version of the build process to use. This will override the one specified in the addon.json')
            ->opt('csstool:ct', 'Which CSS Preprocessor to use: Either `scss` or `less`. Defaults to `scss`', false, 'string');

        $this->buildToolBaseDirectory = $this->toolRealPath.'/src/NodeTools';
        $this->dependencyDirectories = [
            $this->buildToolBaseDirectory,
            $this->buildToolBaseDirectory.'/BuildProcess/v1/',
            $this->buildToolBaseDirectory.'/BuildProcess/legacy/',
        ];
    }

    /**
     * @inheritdoc
     */
    public final function run(Args $args) {
        parent::run($args);

        $this->getBuildOptionsFromArgs($args);
        $this->getAddonJsonBuildOptions();
        $this->validateBuildOptions();

        $processOptions = [
            'buildOptions' => $this->addonBuildConfigs[0],
            'rootDirectories' => $this->addonRootDirectories,
            'watch' => $args->getOpt('watch') ?: false,
        ];

        $this->spawnNodeProcessFromPackageMain(
            $this->getBuildProcessDirectory(),
            $processOptions
        );
    }

    /**
     * Merge in the config values in the addon.json.
     *
     * @return void
     */
    protected function getAddonJsonBuildOptions($rootDirectory = null) {
        if (!$rootDirectory) {
            $rootDirectory = getcwd();
        }

        $addonJson = CliUtil::getAddonJsonForDirectory($rootDirectory);
        $logger = new LogFormatter();
        $logger = $logger->setDateFormat('');

        // Add the addon root directory to the list.
        array_push($this->addonRootDirectories, $rootDirectory);

        if (!array_key_exists('build', $addonJson) && !array_key_exists('buildProcessVersion', $addonJson)) {
            return;
        }

        // Get the build key and map the old key names.
        if (!array_deep_key_exists('build.process', $addonJson)) {
            if (array_deep_key_exists('build.processVersion', $addonJson)) {
                $logger
                    ->message('The configuration key `build.processVersion` has been renamed to `build.version`.'.PHP_EOL)
                    ->message('See https://docs.vanillaforums.com/developer/vanilla-cli#build-processversion for details.'.PHP_EOL.'The `buildProcessVersion` key will continue to be supported.'.PHP_EOL);

                $addonJson['build']['process'] = $addonJson['build']['processVersion'];
            } elseif (array_key_exists('buildProcessVersion', $addonJson)) {
                $logger
                    ->message('The configuration key `buildProcessVersion` has been renamed to `build.version`.'.PHP_EOL)
                    ->message('See https://docs.vanillaforums.com/developer/vanilla-cli#build-processversion for details.'.PHP_EOL.'The `buildProcessVersion` key will continue to be supported.'.PHP_EOL);

                $addonJson['build']['process'] = $addonJson['buildProcessVersion'];
            }
        }

        // Map the 1.0 process name to v1
        if ($addonJson['build']['process'] === '1.0') {
            $logger->message("Warning: The build process version '1.0' has been renamed to 'v1'. Please update your build configuration.".PHP_EOL);
            $addonJson['build']['process'] = 'v1';
        }

        $buildConfig = array_merge($this->defaultConfigurationOptions, $addonJson['build']);
        array_push($this->addonBuildConfigs, $buildConfig);

        // Recursively fetch any parents if they exist.
        if (array_key_exists('parent', $addonJson)) {
            $parentThemeKey = $addonJson['parent'];
            $vanillaSrcDir = $this->vanillaSrcDir;
            $parentAddonDirectory = realpath($this->vanillaSrcDir.'/themes/'.$parentThemeKey);

            if (!file_exists($parentAddonDirectory)) {
                CliUtil::fail("The parent theme with the key `$parentThemeKey` could not be found in the vanilla installation at `$vanillaSrcDir`.");
            }

            $this->getAddonJsonBuildOptions($parentAddonDirectory);
        }
    }

    /**
     * Determine build options passed as args. These override anything else.
     *
     * @param Args $args The CLI arguments.
     */
    protected function getBuildOptionsFromArgs(Args $args) {
        $processArg = $args->getOpt('process') ?: false;
        $cssToolArg = $args->getOpt('csstool');

        if ($processArg) {
            $this->defaultConfigurationOptions['process'] = $processArg;
        }

        if ($cssToolArg) {
            $this->defaultConfigurationOptions['cssTool'] = $cssToolArg;
        }
    }

    /**
     * Validate that options passed are compatible with each other.
     *
     * Currently checks
     * - that csstool is v1 only.
     * - Maps `process` 1.0 -> v1.
     *
     * @param Args $args
     */
    protected function validateBuildOptions() {
        $requiredIdenticalKeys = [
            'cssTool',
            'process',
        ];

        foreach($requiredIdenticalKeys as $requiredIdenticalKey) {
            $simplifiedArray = array_column($this->addonBuildConfigs, $requiredIdenticalKey);

            if (count(array_unique($simplifiedArray)) !== 1) {
                $passedValues = implode(", ", array_unique($simplifiedArray));

                CliUtil::fail(
                    "Different values were passed by parent and child addons for the option $requiredIdenticalKey.".PHP_EOL.
                    "Expected identical values. Passed values:".PHP_EOL.
                    $passedValues
                );
            }
        }

        $finalBuildConfig = $this->addonBuildConfigs[0];

        if ($finalBuildConfig['cssTool'] === 'less' && $finalBuildConfig['process'] === 'legacy') {
            CliUtil::fail('The CSSTool option `less` is not available for the legacy build process.');
        }

        if ($finalBuildConfig['cssTool'] === 'less' && count($this->addonBuildConfigs) > 1) {
            CliUtil::fail('The CSSTool option `less` is not available with parent themes.');
        }
    }

    /**
     * Return all of the current build process versions.
     *
     * @return array The directory names
     */
    protected function getPossibleBuildProcessVersions() {
        $buildDirectories = glob($this->buildToolBaseDirectory.'/BuildProcess/*');
        $validBuildDirectories = [];
        foreach ($buildDirectories as $directory) {
            $validBuildDirectories[] = basename($directory);
        }
        return $validBuildDirectories;
    }

    /**
     * Get the directory of the build process to execute.
     *
     * @param string $processVersion The arguments from the CLI.
     *
     * @return string
     */
    protected function getBuildProcessDirectory() {
        $processVersion = $this->addonBuildConfigs[0]['process'];
        $path = $this->buildToolBaseDirectory.'/BuildProcess/'.$processVersion;
        if (!file_exists($path)) {
            $buildVersions = implode(', ', $this->getPossibleBuildProcessVersions());
            CliUtil::fail("Could not find build process version $processVersion"
                ."\n    Available build process versions are"
                ."\n$buildVersions");
        }
        return $path;
    }
}
