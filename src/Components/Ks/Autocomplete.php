<?php

namespace Survos\FwBundle\Components\Ks;

use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

/**
 * Framework7 dropdown autocomplete backed by a server-rendered JSON route
 * (the "Dropdown With Ajax-Data" kitchen-sink demo). Unlike the other Ks
 * components, this one needs the router service to turn a route name into
 * a URL, so it can't be an anonymous (class-less) component.
 */
#[AsTwigComponent('SurvosFw:Ks:Autocomplete', template: '@SurvosFw/components/Ks/Autocomplete.html.twig')]
final class Autocomplete
{
    public string $label;
    public string $inputId;
    public string $sourceUrl;
    public string $placeholder = '';

    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
    ) {
    }

    public function mount(string $label, string $sourceRoute, ?string $inputId = null, string $placeholder = ''): void
    {
        $this->label = $label;
        $this->inputId = $inputId ?? 'autocomplete-' . bin2hex(random_bytes(4));
        $this->sourceUrl = $this->urlGenerator->generate($sourceRoute);
        $this->placeholder = $placeholder;
    }
}
