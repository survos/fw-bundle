<?php

namespace Survos\FwBundle;

use Survos\CoreBundle\Traits\HasAssetMapperTrait;
use Survos\FwBundle\Command\CompileRoutesCommand;
use Survos\FwBundle\Components\FwPage;
use Survos\FwBundle\Event\KnpMenuEvent;
use Survos\FwBundle\Components\MenuComponent;
use Survos\FwBundle\Menu\MenuService;
use Survos\FwBundle\Service\FwService;
use Survos\FwBundle\Twig\TwigExtension;
use Symfony\Component\Config\Definition\Builder\NodeBuilder;
use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\DependencyInjection\Reference;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

class SurvosFwBundle extends AbstractBundle implements CompilerPassInterface
{
    use HasAssetMapperTrait;

    public function build(ContainerBuilder $container): void
    {
        parent::build($container);
        $container->addCompilerPass($this);
    }


    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        foreach ([MenuService::class] as $className) {
            $builder->register($className)
                ->setPublic(true)
                ->setAutoconfigured(true)
                ->setAutowired(true)
                ;
        }

        foreach ([CompileRoutesCommand::class] as $className) {
            $builder->register($className)
                ->setPublic(true)
                ->setAutoconfigured(true)
                ->setAutowired(true);

        }

        $builder->register(FwService::class)
            ->setAutowired(true)->setAutoconfigured(true)->setPublic(true)
            ->setArgument('$configs', $config['projects']) // ??
            ->setArgument('$config', $config)
        ;

        $builder->register(FwPage::class)
            ->setAutowired(true)->setAutoconfigured(true)->setPublic(true);

        $builder->register(MenuComponent::class)->setAutowired(true)->setAutoconfigured(true)
            ->setArgument('$menuOptions', []) // $config['menu_options'])
            ->setArgument('$helper', new Reference('knp_menu.helper'))
            ->setArgument('$factory', new Reference('knp_menu.factory'))
            ->setArgument('$eventDispatcher', new Reference('event_dispatcher'));
        ;

        $builder->register(TwigExtension::class)
            ->addTag('twig.extension');

        $builder->register(MenuService::class)
            ->setAutowired(true)
            ->setArgument(
                '$authorizationChecker',
                new Reference('security.authorization_checker', ContainerInterface::NULL_ON_INVALID_REFERENCE)
            )
            ->setArgument(
                '$security',
                new Reference('security.helper', ContainerInterface::NULL_ON_INVALID_REFERENCE)
            );

    }

    public function process(ContainerBuilder $container): void
    {
//        if (false === $container->hasDefinition('twig')) {
//            throw new \RuntimeException('Twig service not found, composer require twig/twig');
//            assert(false, "missing twig");
//            return;
//        }
        $def = $container->getDefinition('twig');

        // add the constants to twig to make calling the menu easier.

        $eventClass = (new \ReflectionClass(KnpMenuEvent::class));

        foreach ($eventClass->getConstants() as $name => $value) {
            $def->addMethodCall('addGlobal', [$name, $value]);
        }

        return;

        // get the controllers to check the routes and create the routes.js map for Framework7
        $taggedServices = $container->findTaggedServiceIds('container.service_subscriber');

        // set the route requirements.
        foreach (array_keys($taggedServices) as $controllerClass) {
            if (!class_exists($controllerClass)) {
                continue;
            }
            $reflectionClass = new \ReflectionClass($controllerClass);
            $requirements = [];
            // these are at the controller level, so they apply to all methods
            foreach ($reflectionClass->getAttributes(IsGranted::class) as $attribute) {
                $args = $attribute->getArguments();
                $requirements = $args; // array of ROLE_...
            }
            foreach ($reflectionClass->getMethods() as $method) {
                $methodRequirements = [];
                foreach ($method->getAttributes(IsGranted::class) as $attribute) {
                    $args = $attribute->getArguments();
                    $methodRequirements = $args;
                }

                // now get the route name(s) and associated the requirements by name.
                foreach ($method->getAttributes(Route::class) as $attribute) {
                    $args = $attribute->getArguments();
                    $name = $args['name'] ?? $method->getName();
                    $isGranted[$name] = array_merge($methodRequirements, $requirements);
                }
            }
        }

//        dd($isGranted);

        file_put_contents($fn = $this->getCachedDataFilename($container), json_encode($isGranted));

        if (false === $container->hasDefinition('twig')) {
            return;
        }
        $def = $container->getDefinition('twig');

        $eventClass = (new \ReflectionClass(KnpMenuEvent::class));
        foreach ($eventClass->getConstants() as $name => $value) {
            $def->addMethodCall('addGlobal', [$name, $value]);
        }
    }


    private function addProjectsSection(NodeBuilder $children): void
    {
        $pixieRoot = $children
            ->arrayNode('projects')
            ->arrayPrototype()
            ->children();

        $pixieRoot->scalarNode('code')->defaultValue('dummy')->info("configuration code for database, etc.")->end();
        $pixieRoot->scalarNode('logo')->defaultValue('dummy/60x90.png')->end();
        $pixieRoot->scalarNode('name')->defaultValue('DummyProject')->end();
        $pixieRoot->arrayNode('tabs')->info("Array of tab codes")->scalarPrototype()->end();
        $pixieRoot->scalarNode('database')->info("indexDb database name")->defaultValue('MyDatabase')->end();
        $pixieRoot->arrayNode('stores')
            ->arrayPrototype()
            ->children()

            ->scalarNode('name')->info("the store name")->example("friendTable")->end()
            ->scalarNode('schema')->info("the index definition")->example("++i,age")->end()
            ->scalarNode('url')->info("the API to use to load if empty.  json-ld iterates through pages")->end()
            ->integerNode('limit')->defaultValue(100)->end()
            ->end();

        $pixieRoot->arrayNode('members')
            ->arrayPrototype()
            ->children()
            ->scalarNode('email')->defaultNull()->end()
            ->scalarNode('role')->defaultNull()->end()
            ->end();


//        $pixieRoot->arrayNode('data')->isRequired(false)->defaultNull()->end();
    }

        public function configure(DefinitionConfigurator $definition): void
    {
        $rootNode =  $definition->rootNode();
        $rootNode
            ->children()
            ->scalarNode('name')
                ->info("The app name when initializing Framework7")
                ->defaultValue('FwApp')
            ->end()
            ->scalarNode('theme')->defaultValue('pagestack')->end()
            ->booleanNode('enabled')->defaultTrue()->end()
            ->booleanNode('debug')->defaultTrue()->end()
            ->end();

        $this->addProjectsSection($rootNode->children());

    }

    public function getPaths(): array
    {
        $dir = realpath(__DIR__ . '/../assets/');
        assert(file_exists($dir), 'asset path must exist for the assets in ' . __DIR__);
        return [$dir => '@survos/fw'];
    }



}
