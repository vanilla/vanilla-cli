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
            ->opt('fix:f', "If set, automatically fix fixable errors in the files you're linting.", false, 'bool');

        $this->lintToolBaseDirectory = $this->toolRealPath.'/src/NodeTools/Linter';
        $this->dependencyDirectories = [
            $this->lintToolBaseDirectory,
        ];
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args) {
        $this->getDefaultConfigFiles();
        $this->getAddonJsonLintOptions();

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
     * Merge in the config values in the addon.json.
     *
     * @return void
     */
    protected function getAddonJsonLintOptions() {
        $addonJson = CliUtil::getAddonJsonForCWD();

        if (array_key_exists('lint', $addonJson)) {
            $this->lintConfig = array_merge($this->lintConfig, $addonJson['lint']);
        }
    }

    protected function getDefaultConfigFiles() {
        $builtInScriptConfig = $this->lintToolBaseDirectory.'/configs/.eslintrc';
        $addonScriptConfig = getcwd().'/.eslintrc';
        $builtInStyleConfig = $this->lintToolBaseDirectory.'/configs/.stylelintrc';
        $addonStyleConfig = getcwd().'/.stylelintrc';

        $this->lintConfig['scripts']['configFile'] = file_exists($addonScriptConfig) ? $addonScriptConfig : $builtInScriptConfig;
        $this->lintConfig['styles']['configFile'] = file_exists($addonStyleConfig) ? $addonStyleConfig : $builtInStyleConfig;
    }
}
