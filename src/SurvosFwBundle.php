<?php

namespace Survos\FwBundle;

use Survos\CoreBundle\Traits\HasAssetMapperTrait;
use Survos\FwBundle\Command\CompileRoutesCommand;
use Survos\FwBundle\Event\KnpMenuEvent;
use Survos\FwBundle\Components\MenuComponent;
use Survos\FwBundle\Menu\MenuService;
use Survos\FwBundle\Twig\TwigExtension;
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

    }


        public function configure(DefinitionConfigurator $definition): void
    {
        $definition->rootNode()
            ->children()
            ->scalarNode('theme')->defaultValue('pagestack')->end()
            ->booleanNode('enabled')->defaultTrue()->end()
            ->end();
    }

    public function getPaths(): array
    {
        $dir = realpath(__DIR__ . '/../assets/');
        assert(file_exists($dir), 'asset path must exist for the assets in ' . __DIR__);
        return [$dir => '@survos/fw'];
    }



}
