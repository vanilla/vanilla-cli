<?php

use Garden\Container\Container;
use Vanilla\Addon;
use Vanilla\InjectableInterface;

// Set up the dependency injection container.
$container = new Container();

$container->setInstance('Garden\Container\Container', $container)
    ->rule('Interop\Container\ContainerInterface')
    ->setAliasOf('Garden\Container\Container')

    ->rule(InjectableInterface::class)
    ->addCall('setDependencies')

    // Configuration
    ->rule('Gdn_Configuration')
    ->setShared(true)
    ->addAlias('Config')

    // AddonManager
    ->rule(Vanilla\AddonManager::class)
    ->setShared(true)
    ->setConstructorArgs([
        [
            Addon::TYPE_ADDON => ['/applications', '/plugins'],
            Addon::TYPE_THEME => '/themes',
            Addon::TYPE_LOCALE => '/locales'
        ],
        PATH_CACHE
    ])
    ->addAlias('AddonManager')
    ->addCall('registerAutoloader')
;

// Run through the bootstrap with dependencies.
$container->call(function (
    Container $container,
    Gdn_Configuration $config,
    \Vanilla\AddonManager $addonManager
) {

    // Load default baseline Garden configurations.
    $config->load(PATH_CONF.'/config-defaults.php');

    // Load installation-specific configuration so that we know what apps are enabled.
    $config->load($config->defaultPath(), 'Configuration', true);
    $config->caching(false);

    /**
     * Extension Managers
     *
     * Now load the Addon, Application, Theme and Plugin managers into the Factory, and
     * process the application-specific configuration defaults.
     */

    // Start the addons, plugins, and applications.
    $addonManager->startAddonsByKey($config->get('EnabledPlugins'), Addon::TYPE_ADDON);
    $addonManager->startAddonsByKey($config->get('EnabledApplications'), Addon::TYPE_ADDON);
    $addonManager->startAddonsByKey(array_keys($config->get('EnabledLocales', [])), Addon::TYPE_LOCALE);

    $currentTheme = $config->get('Garden.Theme', Gdn_ThemeManager::DEFAULT_DESKTOP_THEME);
    $addonManager->startAddonsByKey([$currentTheme], Addon::TYPE_THEME);

    // Re-apply loaded user settings.
    // $config->overlayDynamic();
});
