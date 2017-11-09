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
 * Command for Linting frontend code.
 */
class LintCmd extends NodeCommandBase {

    /** @var string  */
    protected $lintToolBaseDirectory;

    /**
     * @var array
     * - scripts
     * -- enable
     * -- configFile
     * - styles
     * -- enable
     * -- configFile
     */
    private $lintConfig = [
        'scripts' => [
            'enable' => true,
        ],
        'styles' => [
            'enable' => true,
        ],
        'paths' => [],
    ];

    /**
     * BuildCmd constructor.
     *
     * @param Cli $cli The CLI instance.
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Lint frontend code to conform to Vanilla Forums Standards.')
            ->opt('watch:w', 'Run the linters in watch mode. Changed files will be re-linted on save.', false, 'bool')
            ->opt('fix:f', "If set, automatically fix fixable errors in the files you're linting.", false, 'bool')
            ->opt('scripts', "Lint only the javascript files.", false, 'bool')
            ->opt('styles', "Lint only the stylesheets.", false, 'bool')
            ->arg('files', "Files, directories, and globs can be passed as arguments. Defaults to \"src/**/*.js\", \"src/**/*.jsx\", and \"src/**/*.scss\".")
        ;

        $this->lintToolBaseDirectory = $this->toolRealPath.'/src/NodeTools/Linter';
        $this->dependencyDirectories = [
            $this->lintToolBaseDirectory,
        ];
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args) {
        $this->getDefaultLintOptions();
        $this->getAddonJsonLintOptions();
        $this->getLintOptionsFromArgs($args);
        $this->validateLintOptions($args);

        $processOptions = array_merge(
            $this->lintConfig,
            [
                'watch' => $args->getOpt('watch') ?: false,
                'fix' => $args->getOpt('fix') ?: false,
            ]
        );

        $this->spawnNodeProcessFromPackageMain(
            $this->lintToolBaseDirectory,
            $processOptions
        );
    }

    /**
     * Get the default lint options. These will be overridden by any other values.
     */
    protected function getDefaultLintOptions() {
        $builtInScriptConfig = $this->lintToolBaseDirectory.'/configs/.eslintrc';
        $addonScriptConfig = $this->getPossibleESLintConfig();
        $builtInStyleConfig = $this->lintToolBaseDirectory.'/configs/.stylelintrc';
        $addonStyleConfig = $this->getPossibleStyleLintConfig();

        $this->lintConfig['scripts']['configFile'] = file_exists($addonScriptConfig) ? $addonScriptConfig : $builtInScriptConfig;
        $this->lintConfig['styles']['configFile'] = file_exists($addonStyleConfig) ? $addonStyleConfig : $builtInStyleConfig;

        $this->lintConfig['paths'] = [
            getcwd().'/src/**/*.js',
            getcwd().'/src/**/*.jsx',
            getcwd().'/src/**/*.scss',
        ];
    }

    /**
     * Merge in the config values in the addon.json.
     *
     * @return void
     */
    protected function getAddonJsonLintOptions() {
        $addonJson = CliUtil::getAddonJsonForCWD();

        if ($addonJson && array_key_exists('lint', $addonJson)) {
            $this->lintConfig = array_merge($this->lintConfig, $addonJson['lint']);
        }
    }

    /**
     * Determine build options passed as args. These override anything else.
     *
     * @param Args $args The CLI arguments.
     */
    protected function getLintOptionsFromArgs(Args $args) {
        $exclusiveScripts = $args->getOpt('scripts');
        $exclusiveStyles = $args->getOpt('styles');
        $files = $args->getArgs();

        if ($exclusiveScripts) {
            $this->lintConfig['scripts']['enable'] = true;
            $this->lintConfig['styles']['enable'] = false;
        }

        if ($exclusiveStyles) {
            $this->lintConfig['styles']['enable'] = true;
            $this->lintConfig['scripts']['enable'] = false;
        }

        if (count($files) > 0) {
            $this->lintConfig['paths'] = array_values($files);
        }
    }

    /**
     * Validate that options passed are compatible with each other.
     *
     * Currently checks
     * - --fix and --watch are not used together.
     * - --scripts and --styles are not used together.
     *
     * @param Args $args
     */
    protected function validateLintOptions(Args $args) {
        $fixArg = $args->getOpt('fix') ?: false;
        $watchArg = $args->getOpt('watch') ?: false;
        $scriptsArg = $args->getOpt('scripts') ?: false;
        $stylesArg = $args->getOpt('styles') ?: false;

        if ($fixArg && $watchArg) {
            CliUtil::error('--fix and --watch cannot be used together.');
        }

        if ($scriptsArg && $stylesArg) {
            CliUtil::error('--styles and --scripts cannot be used together. Linting both styles and scripts at the same time is the default behaviour.');
        }
    }

    /**
     * Get a possible Stylelint config for the addon.
     *
     * @return bool|string A string or false if not found.
     */
    private function getPossibleStyleLintConfig() {
        $possibleConfigs = [
            getcwd().'/.stylelintrc',
            getcwd().'/.stylelintrc.yaml',
            getcwd().'/.stylelintrc.json',
            getcwd().'/config.stylelintrc.js',
        ];

        foreach($possibleConfigs as $config) {
            if (file_exists($config)) {
                return $config;
            }
        }

        return false;
    }

    /**
     * Get a possible ESLint config for the addon.
     *
     * @return bool|string A string or false if not found.
     */
    private function getPossibleESLintConfig() {
        $possibleConfigs = [
            getcwd().'/.eslintrc',
            getcwd().'/.eslintrc.yaml',
            getcwd().'/.eslintrc.json',
            getcwd().'/config.eslintrc.js',
        ];

        foreach($possibleConfigs as $config) {
            if (file_exists($config)) {
                return $config;
            }
        }

        return false;
    }
}
