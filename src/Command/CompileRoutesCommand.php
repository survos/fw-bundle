<?php

namespace Survos\FwBundle\Command;

use Knp\Menu\FactoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;
use Survos\FwBundle\Event\KnpMenuEvent;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Twig\Environment;
use Zenstruck\Console\Attribute\Argument;
use Zenstruck\Console\Attribute\Option;
use Zenstruck\Console\InvokableServiceCommand;
use Zenstruck\Console\IO;
use Zenstruck\Console\RunsCommands;
use Zenstruck\Console\RunsProcesses;

#[AsCommand('fw:compile', 'compile routes and templates to routes.js for SPA')]
final class CompileRoutesCommand extends InvokableServiceCommand
{
    use RunsCommands;
    use RunsProcesses;

    public function __construct(
        private EventDispatcherInterface $eventDispatcher,
        private FactoryInterface $factory,
        private Environment $twig,
    )
    {
        parent::__construct();
    }

    public function __invoke(
        IO                                                                                          $io,
        #[Option(description: 'search string')] ?string $eventName=null,

    ): int
    {
        // iterate through the page and tab routes to create templates, which will be rendered in the main page.
        $menu = $this->factory->createItem($eventName ?? KnpMenuEvent::class);
        foreach ([KnpMenuEvent::MOBILE_TAB_MENU  => 'tab',
                     KnpMenuEvent::MOBILE_PAGE_MENU => 'page',
                     KnpMenuEvent::MOBILE_UNLINKED_MENU => 'page',
                 ] as $eventName=>$type) {
            $options = [];
            $options = (new OptionsResolver())
                ->setDefaults([

                ])
                ->resolve($options);
            $this->eventDispatcher->dispatch(new KnpMenuEvent($menu, $this->factory, $options), $eventName);
            foreach ($menu->getChildren() as $route=>$child) {
                try {
                    $template = "app/$route.html.twig";
                    $params = [
                        'type' => $type,
                        'route' => $route,
                        'template' => $template,
                    ];
//                    $templates[$route]  = $this->twig->render($template, $params);
                    $templates[$route] = $this->twig->render($template, $params);
                } catch (\Exception $e) {
                    dd($route, $template, $e->getMessage(), $e);
                }
            }
        }
        dd($templates);
        return self::SUCCESS;

    }




}
