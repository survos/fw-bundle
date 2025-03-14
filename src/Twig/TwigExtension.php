<?php

namespace Survos\FwBundle\Twig;

use Survos\FwBundle\Model\Fw7Meta;
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
            new TwigFunction('fw7_metadata', $this->getFw7MetaData(...))
        ];
    }

    public function getFw7MetaData(string $_self, string $type, array $extra = []): Fw7Meta
    {
        // return $this->event??($this->type === 'page' ? 'postpush' : 'prechange');

        $templateId = $this->basename($_self);
        $triggerEvent = sprintf("%s.%s", $templateId, ($type === 'tab') ? "prechange" : "postpush");
        // optionsResolver?
        return new Fw7Meta(
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
