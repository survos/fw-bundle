<?php

namespace Survos\FwBundle\Twig;

use Survos\FwBundle\Model\OnsMeta;
use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;
use Twig\TwigFunction;

class TwigExtension extends AbstractExtension
{
    public function __construct()
    {
    }

    public function getFilters(): array
    {
        return [
            new TwigFilter('basename', [$this, 'basename'])
        ];
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('ons_metadata', [$this, 'getOnsMetaData'])
        ];
    }

    public function getOnsMetaData(string $_self, string $type, array $extra = []): OnsMeta
    {
        // return $this->event??($this->type === 'page' ? 'postpush' : 'prechange');

        $templateId = $this->basename($_self);
        $triggerEvent = sprintf("%s.%s", $templateId, ($type === 'tab') ? "prechange" : "postpush");
        // optionsResolver?
        return new OnsMeta(
            $templateId,
            type: $type,
            triggerEvent: $triggerEvent,
                store: $extra['store'] ?? null,
        );

    }

    public function basename(string $_self): string
    {
        return basename($_self, '.html.twig');
    }
}
