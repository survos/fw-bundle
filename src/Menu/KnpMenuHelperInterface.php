<?php

// Simplifies the construction of menu items,
namespace Survos\FwBundle\Menu;

use Knp\Menu\ItemInterface;
use Survos\FwBundle\Event\KnpMenuEvent;
use Survos\CoreBundle\Entity\RouteParametersInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

interface KnpMenuHelperInterface
{
    public function setAuthorizationChecker(AuthorizationCheckerInterface $authorizationChecker);

    public function addSubmenu(ItemInterface $menu, ?string $label = null, ?string $icon = null): ItemInterface;

    public function addHeading(ItemInterface $menu, string $label, ?string $icon = null): void;

    public function add(
        ItemInterface $menu,
        ?string $route = null,
        array|RouteParametersInterface|null $rp = null,
        ?string $label = null,
        ?string $uri = null,
        ?string $id = null,
        ?string $icon = null,
        string|int|null $badge = null,
        bool $returnItem = false,
    ): self|ItemInterface;

    public function addMenuItem(ItemInterface $menu, array $options, array $extra = []): ItemInterface;

    public function isGranted($attribute, $subject = null);

    public function authMenu(AuthorizationCheckerInterface $authorizationChecker,
                             Security $security,

                             ItemInterface                 $menu, $childOptions = []);

    public function supports(KnpMenuEvent $event): bool;
}
