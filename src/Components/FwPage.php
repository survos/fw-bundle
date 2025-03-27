<?php

namespace Survos\FwBundle\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;
use Symfony\UX\TwigComponent\Attribute\PreMount;

#[AsTwigComponent('SurvosFw:Framework7Page', template: '@SurvosFw/components/FwPage.html.twig')]
final class FwPage
{
    public string $caller;
    public ?string $name=null;
    public ?string $title=null;

    #[PreMount]
    public function preMount(array $data): array
    {
        return $data;
    }
    public function mount(string $caller): void
    {
        $baseName = pathinfo($caller, PATHINFO_FILENAME);
        if (!$this->name) {
            $this->name = $baseName;
        }
        if (!$this->title) {
            $this->title = strtoupper($baseName);
        }
    }
}
