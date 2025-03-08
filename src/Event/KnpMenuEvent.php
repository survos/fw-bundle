<?php

namespace Survos\FwBundle\Event;

use Knp\Menu\FactoryInterface;
use Knp\Menu\ItemInterface;
use Symfony\Contracts\EventDispatcher\Event;

/**
 * Collect all MenuItemInterface objects that should be rendered in the menu/navigation section.
 */
class KnpMenuEvent extends Event
{
    public const MOBILE_PAGE_MENU = 'MOBILE_PAGE_MENU';
    public const MOBILE_TAB_MENU = 'MOBILE_TAB_MENU';
    public const MOBILE_UNLINKED_MENU = 'MOBILE_UNLINKED_MENU';

    public function __construct(
        protected ItemInterface $menu,
        protected FactoryInterface $factory,
        private array $options = [],
        private array $childOptions = [],
    ) {
    }

    static public function getConstants(): array
    {
        return (new \ReflectionClass(__CLASS__))->getConstants();
    }

    public function getMenu(): ItemInterface
    {
        return $this->menu;
    }

    public function getFactory(): FactoryInterface
    {
        return $this->factory;
    }

    public function getOptions(): array
    {
        return $this->options;
    }

    public function getOption(string $key): mixed
    {
        // @todo: validate with keys from $config
        assert(array_key_exists($key, $this->options), "option '$key' is invalid, use " . join(', ', $this->options));
        return $this->options[$key];
    }

    public function getChildOptions(): array
    {
        return $this->childOptions;
    }
}
