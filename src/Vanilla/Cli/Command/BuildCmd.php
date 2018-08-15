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

/**
 * Class BuildCmd.
 */
class BuildCmd extends NodeCommandBase {

    private static $processVersions = [
        "v1",
        "legacy",
    ];

    /** @var string  */
    protected $buildToolBaseDirectory;

    /** @var string  */
    protected $cliRoot;

    /** @var array The build configuration options.
     *
     * - process: 'legacy' | '1.0'
     * - cssTool: 'scss' | 'less'
     * - entries: Object - A mapping of chunkname -> entrypoint.
     * - exports: array - An array of files/modules to expose to dependant build processes.
     */
    private $defaultConfigurationOptions = [
        'process' => 'legacy',
        'cssTool' => 'scss',
        'entries' => [
            'custom' => './index.js',
        ],
        'exports' => [],
    ];

    /** Whether or not to run in hot mode. */
    private $watch = false;

    /** @var string|null A section of entries to filter the hot process by. */
    private $section = null;

    /** @var array An array of addon configurations to build with. */
    private $addonBuildConfigs = [];

    /** @var array An array of realpaths to roots of addons being built. */
    private $addonRootDirectories = [];

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
            ->opt('csstool:ct', 'Which CSS Preprocessor to use: Either `scss` or `less`. Defaults to `scss`', false, 'string')
        ;

        $this->buildToolBaseDirectory = $this->toolRealPath.'/src/build';
        $this->dependencyDirectories = [
            $this->toolRealPath,
        ];
    }

    /**
     * @inheritdoc
     */
    final public function run(Args $args) {
        parent::run($args);

        $this->setBuildOptionsFromArgs($args);
        $this->setAddonJsonBuildOptions();
        $this->setDefaultBuildOptions();
        $this->validateBuildOptions();

        $processOptions = [
            'buildOptions' => $this->addonBuildConfigs[0],
            'rootDirectories' => $this->addonRootDirectories,
            'watch' => $this->watch,
            'vanillaDirectory' => $this->vanillaSrcDir,
            'addonKey' => CliUtil::getAddonJsonForDirectory(getcwd())["key"],
        ];

        $this->spawnNodeProcessFromFile(
            $this->getBuildProcessDirectory()."/index.ts",
            $processOptions
        );
    }

    /**
     * Merge in the config values in the addon.json.
     *
     * @return void
     */
    protected function setAddonJsonBuildOptions() {
        $rootDirectory = getcwd();

        $addonJson = CliUtil::getAddonJsonForDirectory($rootDirectory);

        if (!$addonJson) {
            return;
        }

        $logger = new LogFormatter();
        $logger = $logger->setDateFormat('');

        // Add the addon root directory to the list.
        $this->addonRootDirectories[] = $rootDirectory;

        if (!array_key_exists('build', $addonJson) && !array_key_exists('buildProcessVersion', $addonJson)) {
            return;
        }

        // Get the build key and map the old key names.
        if (!\valr('build.process', $addonJson)) {
            if (\valr('build.processVersion', $addonJson)) {
                $logger
                    ->message('The configuration key `build.processVersion` has been renamed to `build.process`.'.PHP_EOL)
                    ->message('See https://docs.vanillaforums.com/developer/vanilla-cli#build-processversion for details.'.PHP_EOL.'The `buildProcessVersion` key will continue to be supported.'.PHP_EOL);

                $addonJson['build']['process'] = $addonJson['build']['processVersion'];
            } elseif (array_key_exists('buildProcessVersion', $addonJson)) {
                $logger
                    ->message('The configuration key `buildProcessVersion` has been renamed to `build.process`.'.PHP_EOL)
                    ->message('See https://docs.vanillaforums.com/developer/vanilla-cli#build-processversion for details.'.PHP_EOL.'The `buildProcessVersion` key will continue to be supported.'.PHP_EOL);

                $addonJson['build']['process'] = $addonJson['buildProcessVersion'];
            }
        }

        // Map the 1.0 process name to v1
        if (valr('build.process', $addonJson) === '1.0') {
            $logger->message("Warning: The build process version '1.0' has been renamed to 'v1'. Please update your build configuration.".PHP_EOL);
            $addonJson['build']['process'] = 'v1';
        }

        $buildConfig = array_merge($this->defaultConfigurationOptions, $addonJson['build']);
        $this->addonBuildConfigs[] = $buildConfig;
    }

    /**
     * Determine build options passed as args. These override anything else.
     *
     * @param Args $args The CLI arguments.
     */
    protected function setBuildOptionsFromArgs(Args $args) {
        $processArg = $args->getOpt('process') ?: false;
        $watchArg = $args->getOpt('watch') ?: false;
        $cssToolArg = $args->getOpt('csstool');

        if ($processArg) {
            $this->defaultConfigurationOptions['process'] = $processArg;
        }

        if ($cssToolArg) {
            $this->defaultConfigurationOptions['cssTool'] = $cssToolArg;
        }

        if($watchArg) {
            $this->watch = $watchArg;
        }
    }

    /**
     * Set the default build options if no options have been passed.
     *
     * @return void
     */
    protected function setDefaultBuildOptions() {
        if (count($this->addonBuildConfigs) === 0) {
            $this->addonBuildConfigs[] = $this->defaultConfigurationOptions;
            $this->addonRootDirectories[] = getcwd();
        }
    }

    /**
     * Validate that options passed are compatible with each other.
     *
     * Currently checks
     * - that csstool is v1 only.
     * - Maps `process` 1.0 -> v1.
     * - Check if the addon has a less folder but no cssTool specified.
     */
    protected function validateBuildOptions() {
        $requiredIdenticalKeys = [
            'cssTool',
            'process',
        ];

        foreach($requiredIdenticalKeys as $requiredIdenticalKey) {
            $simplifiedArray = array_column($this->addonBuildConfigs, $requiredIdenticalKey);

            if (count(array_unique($simplifiedArray)) > 1) {
                $passedValues = implode(", ", array_unique($simplifiedArray));

                CliUtil::fail(
                    "Different values were passed by parent and child addons for the option $requiredIdenticalKey.".PHP_EOL.
                    "Expected identical values. Passed values:".PHP_EOL.
                    $passedValues
                );
            }
        }

        $finalBuildConfig = $this->addonBuildConfigs[0];
        $finalAddonDirectory = $this->addonRootDirectories[0];
        $isCssToolLess = $finalBuildConfig['cssTool'] === 'less';
        $isCssToolScss = $finalBuildConfig['cssTool'] === 'scss';
        $lessFolderExists = \file_exists($finalAddonDirectory."src/less");
        $scssFolderExists = \file_exists($finalAddonDirectory."src/scss");

        if ($isCssToolLess && $finalBuildConfig['process'] === 'legacy') {
            CliUtil::fail('The CSSTool option `less` is not available for the legacy build process.');
        }

        if ($isCssToolLess && count($this->addonBuildConfigs) > 1) {
            CliUtil::fail('The CSSTool option `less` is not available with parent themes.');
        }

        if ($isCssToolScss && $lessFolderExists && !$scssFolderExists) {
            CliUtil::fail(
                'The CSSTool option "scss" was provided, but the "src/scss" folder could not be found.'.PHP_EOL.
                'A "src/less" folder was found. If you would like to build less files either:'.PHP_EOL.
                ' - Set the "build.cssTool" in your "addon.json" file.'.PHP_EOL.
                ' - pass "-csstool="less" as an argument to the build command.'
            );
        }
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
        $path = $this->buildToolBaseDirectory.'/'.$processVersion;
        if (!\file_exists($path)) {
            $buildVersions = implode(', ', $this::$processVersions);
            CliUtil::fail("Could not find build process version $processVersion"
                ."\n    Available build process versions are"
                ."\n$buildVersions");
        }
        return $path;
    }
}
