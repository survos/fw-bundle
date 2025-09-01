<?php

namespace Survos\FwBundle\Command;

use Knp\Menu\FactoryInterface;
use Psr\EventDispatcher\EventDispatcherInterface;
use Survos\FwBundle\Event\KnpMenuEvent;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Attribute\Option;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Helper\Table;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Twig\Environment;

#[AsCommand('fw:compile', 'compile routes and templates to routes.js for SPA')]
final class CompileRoutesCommand
{

    public function __construct(
        private EventDispatcherInterface $eventDispatcher,
        private FactoryInterface $factory,
        private Environment $twig,
    )
    {
    }

    public function __invoke(
        SymfonyStyle $io,
        #[Option(description: 'search string')] string $eventName='',
        #[Option] ?string $locale='en',

    ): int
    {
        // iterate through the page and tab routes to create templates, which will be rendered in the main page.
        $menu = $this->factory->createItem($eventName);
        foreach ([KnpMenuEvent::MOBILE_TAB_MENU  => 'tab',
                     KnpMenuEvent::MOBILE_PAGE_MENU => 'page',
                     KnpMenuEvent::MOBILE_UNLINKED_MENU => 'page',
                 ] as $eventName=>$type) {
            $options = [];
            $options = (new OptionsResolver())
                ->setDefaults([

                ])
                ->resolve($options);
            $this->eventDispatcher->dispatch(new KnpMenuEvent($menu, $this->factory, $options));
            foreach ($menu->getChildren() as $route=>$child) {
                try {
                    $template = "$type/$route.html.twig";
                    $params = [
                        '_locale' => $locale,
                        'type' => $type,
                        'route' => $route,
                        'template' => $template,
                    ];
                    $templates[$route] = $this->twig->render($template, $params);
                } catch (\Exception $e) {
                    $io->error($e->getMessage());
//                    dd($route, $template, $e->getMessage(), $e);
                }
            }
        }
        return Command::SUCCESS;

    }




}
