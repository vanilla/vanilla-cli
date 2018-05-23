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

    /** @var string  */
    protected $buildToolBaseDirectory;

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

    /** @var boolean Whether or not to run in hot mode. */
    private $hot = false;

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
            ->opt('hot:h', 'Use a webpack hot reloading server.', false, 'bool')
            ->opt('section:s', 'Limit the webpack hot reloading server to a only a certain section of Vanilla. Usually "app" or "admin"')
            ->opt('process:p', 'Which version of the build process to use. This will override the one specified in the addon.json')
            ->opt('csstool:ct', 'Which CSS Preprocessor to use: Either `scss` or `less`. Defaults to `scss`', false, 'string')
            ->opt('skip-prettify:p', "Skip automatic formatting with prettier", false, 'bool')
        ;

        $this->buildToolBaseDirectory = $this->toolRealPath.'/src/NodeTools';
        $this->dependencyDirectories = [
            $this->buildToolBaseDirectory,

            // These are stuck here until there is a proper way to do versioned upgrades.
            $this->buildToolBaseDirectory.'/BuildProcess/v1',
            $this->buildToolBaseDirectory.'/BuildProcess/legacy'
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
            'requiredDirectories' => $this->getRequiredAddonDirectories(),
            'watch' => $this->watch,
            'hot' => $this->hot,
            'section' => $this->section,
            'vanillaDirectory' => $this->vanillaSrcDir,
            'addonKey' => $this->hot ? "dashboard" : CliUtil::getAddonJsonForDirectory(getcwd())["key"],
            'enabledAddonKeys' => $this->getEnabledAddonKeys(),
            'skipPrettify' => $args->getOpt('skip-prettify') ?: false,
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
    protected function setAddonJsonBuildOptions($rootDirectory = null) {
        if (!$rootDirectory) {
            // Hot builds start are rooted in the dashboard addon (vanilla's core).
            $rootDirectory = $this->hot ? $this->resolveAddonLocationInVanilla("dashboard") : getcwd();
        } else {
            $rootDirectory = $this->resolveAddonLocationInVanilla(basename($rootDirectory));
        }

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

        // Recursively fetch any parents if they exist.
        if (array_key_exists('parent', $addonJson)) {
            $parentThemeKey = $addonJson['parent'];
            $vanillaSrcDir = $this->vanillaSrcDir;
            $parentAddonDirectory = realpath($this->vanillaSrcDir.'/themes/'.$parentThemeKey);

            if (!\file_exists($parentAddonDirectory)) {
                CliUtil::fail("The parent theme with the key `$parentThemeKey` could not be found in the vanilla installation at `$vanillaSrcDir`.");
            }

            $this->setAddonJsonBuildOptions($parentAddonDirectory);
        }
    }

    /**
     * Determine build options passed as args. These override anything else.
     *
     * @param Args $args The CLI arguments.
     */
    protected function setBuildOptionsFromArgs(Args $args) {
        $processArg = $args->getOpt('process') ?: false;
        $hotArg = $args->getOpt('hot') ?: false;
        $watchArg = $args->getOpt('watch') ?: false;
        $cssToolArg = $args->getOpt('csstool');
        $sectionArg = $args->getOpt('section');

        if ($processArg) {
            $this->defaultConfigurationOptions['process'] = $processArg;
        }

        if ($cssToolArg) {
            $this->defaultConfigurationOptions['cssTool'] = $cssToolArg;
        }

        if ($hotArg) {
            $this->hot = $hotArg;
        }

        if($watchArg) {
            $this->watch = $watchArg;
        }

        if ($sectionArg) {
            $this->section = $sectionArg;
        }
    }

    /**
     * TODO: Replace this with calls to our addon manager.
     * Get the keys of enabled themes, plugins, and applications.
     *
     * @return array
     */
    protected function getEnabledAddonKeys() {
        $configPath = $this->vanillaSrcDir.'/conf/'.$this->configName;
        $configDefaultsPath = $this->vanillaSrcDir.'/conf/config-defaults.php';
        if (!file_exists($configPath)) {
            CliUtil::fail("Unable to locate Vanilla configuration at $configPath.");
        }

        CliUtil::write("Using vanilla configuration at $configPath.");
        define("APPLICATION", "App");
        define("PATH_CACHE", "");
        require_once($configDefaultsPath);
        require_once($configPath);

        $result = [];

        if (valr("EnabledPlugins", $Configuration)) {
            foreach($Configuration["EnabledPlugins"] as $pluginKey => $value) {
                $result[] = $pluginKey;
            }
        }

        if (valr("EnabledApplications", $Configuration)) {
            foreach($Configuration["EnabledApplications"] as $arrayKey => $addonKey) {
                $result[] = $addonKey;
            }
        }

        if (valr("Garden.Theme", $Configuration)) {
            $result[] = $Configuration["Garden"]["Theme"];
        }

        return $result;
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

        if ($this->hot && !($finalBuildConfig['process'] === 'core')) {
            CliUtil::fail("The '--hot' parameter is only available for the 'core' build process.");
        }

        if (!$this->hot && $this->section) {
            CliUtil::fail("The '--section' parameter is only available with the '--hot' option.");
        }
    }

    /**
     * Get the directories of any required addons. Only gets run on core build process.
     *
     * @return array
     */
    protected function getRequiredAddonDirectories() {
        $processVersion = $this->addonBuildConfigs[0]['process'];

        if ($processVersion !== 'core') {
            return;
        }

        $baseDirectory = $this->addonRootDirectories[0];
        $addonJson = CliUtil::getAddonJsonForDirectory($baseDirectory);

        if (!$addonJson) {
            return [];
        }

        $requirements = array_key_exists('require', $addonJson)
            ? array_keys($addonJson['require'])
            : [];

        $requiredDirectories = [];
        foreach($requirements as $requirement) {
            $requiredDirectories[] = $this->resolveAddonLocationInVanilla($requirement);
        }

        return $requiredDirectories;
    }

    /**
     * Resolve the file path of an addon inside of vanilla.
     *
     * This is because we need a path inside of Vanilla, but some shells like fish automatically
     * resolve symlinks. Many addons are symlinked into a vanilla for installation.
     *
     * @param string $addonKey The key of the addon to lookup.
     *
     * @return string The resolved addonPath.
     */
    function resolveAddonLocationInVanilla($addonKey) {
        $possiblePaths = [
            $this->vanillaSrcDir.'/addons/'.$addonKey,
            $this->vanillaSrcDir.'/applications/'.$addonKey,
            $this->vanillaSrcDir.'/plugins/'.$addonKey,
            $this->vanillaSrcDir.'/themes/'.$addonKey,
        ];

        foreach($possiblePaths as $path) {
            if (\file_exists($path)) {
                return $path;
            }
        }

        CliUtil::fail("Could not find required addon $addonKey in your vanilla source directory ".$this->vanillaSrcDir);
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
        if (!\file_exists($path)) {
            $buildVersions = implode(', ', $this->getPossibleBuildProcessVersions());
            CliUtil::fail("Could not find build process version $processVersion"
                ."\n    Available build process versions are"
                ."\n$buildVersions");
        }
        return $path;
    }
}
