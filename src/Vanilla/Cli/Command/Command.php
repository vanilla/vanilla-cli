<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Cli;
use \Garden\Cli\Args;
use Garden\Cli\LogFormatter;
use Garden\Container\Container;
use Vanilla\Cli\CliUtil;

/**
 * Class Command
 *
 * @package Vanilla\Cli\Command
 */
abstract class Command {

    /** @var string */
    protected $configName = "config.php";

    /** @var string */
    protected $vanillaSrcDir;

    /** @var bool */
    protected $isVerbose;

    /** @var $args */
    protected $args;

    /** @var Container */
    protected $container;

    /** @var string The absolute directory of the vanilla-cli installation */
    protected $cliSrcDir;

    /**
     * Get information about this command.
     *
     * @param Cli $cli
     * @throws {\Exception}
     */
    public static function commandInfo(Cli $cli) {
        $cli
            ->command(self::getName())
            ->opt(
                'vanillasrc',
                'Vanilla source folder. This parameter can be skipped if you set VANILLACLI_VANILLA_SRC_DIR in your environment variables.')
            ->opt(
                'configname',
                'Vanilla configuration file. This should be inside of your vanilla src directory. Defaults to "config.php". This parameter can be skipped if you set VANILLACLI_VANILLA_CONFIG_NAME in your environment variables.')
            ->opt('verbose:v', 'Show additional output.', false, 'bool')
        ;
    }

    /**
     * Return the name of the command.
     *
     * @return string
     */
    public static function getName() {
        // Convert "\Namespace\SomeCommandNameCmd" to "some-command-name"
        $className = str_replace(__NAMESPACE__.'\\', '', static::class);
        $commandName = preg_replace('/cmd$/i', '', $className);
        $commandName = preg_replace('/([A-Z])/', '-$1', $commandName);
        $commandName = strtolower(ltrim($commandName, '-'));

        return $commandName;
    }

    public function __construct(Args $args) {
        $this->args = $args;
        $this->isVerbose = $args->getOpt('verbose') ?: false;
        $configName =  $args->getOpt('configname', getenv('VANILLACLI_VANILLA_CONFIG_NAME'));

        if ($configName) {
            $this->configName = $configName;
        }

        $this->vanillaSrcDir = realpath($this->getVanillaDirectory());
        $this->cliSrcDir = realpath(__DIR__.'/../../../..');

        // Load the bootstrap file and get the container.
        require_once($this->vanillaSrcDir.'/bootstrap-cli.php');
        $this->container = $container;
    }

    /**
     * Command's execution function.
     *
     * This base command class has some common setup, so be sure to call parent::run($args);
     *
     * @param Args $args
     *
     * @return mixed
     */
    abstract public function run();

    private function getVanillaDirectory() {
        $currentDirectory = getcwd();
        $explicitDirectory = $this->args->getOpt('vanillasrc', getenv('VANILLACLI_VANILLA_SRC_DIR'));

        $cwdEnv = $currentDirectory.'/environment.php';

        $cwdValid = false;
        // First check the current directory
        if (\file_exists($cwdEnv)) {
            define('PATH_ROOT', $currentDirectory);
            require_once($cwdEnv);
            $cwdValid = defined("APPLICATION") && APPLICATION === "Vanilla";
        }

        if ($cwdValid) {
            if (
                $explicitDirectory
                && is_dir($explicitDirectory)
                && realpath($currentDirectory) !== realpath($explicitDirectory
            )) {
                $formatter = new LogFormatter();
                $formatter->warn("You're current working directory and explicitly set VANILLACLI_VANILLA_SRC_DIR do not match. The CLI will proceed to use your current working directory.")
                    ->message("VANILLACLI_VANILLA_SRC_DIR")
                    ->error( getenv('VANILLACLI_VANILLA_SRC_DIR'));
            }

            return $currentDirectory;
        }

        if (!$explicitDirectory) {
            CliUtil::fail('Vanilla source directory is missing.'.PHP_EOL.'Please provide a path to your vanilla installation with the "--vanillasrc" parameter or by setting the VANILLACLI_VANILLA_SRC_DIR environmental variable.');
        }

        if (!is_dir($explicitDirectory)) {
            CliUtil::fail('The provided vanilla src directory could not be found. Verify that you are providing a valid directory.'.PHP_EOL."The provided directory was $explicitDirectory");
        }

        $explicitEnv = $explicitDirectory.'/environment.php';

        if ($explicitDirectory && \file_exists($explicitEnv)) {
            define('PATH_ROOT', $explicitDirectory);
            require_once($explicitEnv);
            $explicitValid = defined("APPLICATION") && APPLICATION === "Vanilla";
        }

        if ($explicitValid) {
            return $explicitDirectory;
        }
    }
}
