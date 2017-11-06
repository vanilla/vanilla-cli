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
class BuildCmd extends NodeCommandBase {

    /** @var string  */
    protected $lintToolBaseDirectory;

    private $lintConfig = [
        'scrips' => [
            'enable' => true,
            'configFile' => '.eslintrc',
        ],
        'styles' => [
            'enable' => true,
            'configFile' => '.stylelintrc',
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
            ->opt('watch:w', 'Run the linters in watch mode. Changed files will be relinted on save.', false, 'bool');

        $this->lintToolBaseDirectory = $this->toolRealPath.'/src/Linting';
        $this->dependencyDirectories = [
            $this->lintToolBaseDirectory,
        ];
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args) {
        $this->getAddonJsonLintOptions();

        $processOptions = [
            'watch' => $args->getOpt('watch') ?: false,
        ];

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

        if (array_key_exists('lint')) {
            $this->lintConfig = array_merge($this->lintConfig, $addonJson['lint']);
        }
    }
}
