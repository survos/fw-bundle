<?php

declare(strict_types=1);

namespace Survos\FwBundle\Model;

/**
 * This set the metadata for an Onsen page and tab, and also sets the dexie parameters so that the proper events can be dispatched.
 */
class Fw7Meta
{
    public function __construct(
        public string $templateId,
        public string $type = 'page',
        public ?string $triggerEvent = null,
        public ?string $store = null,
    ) {
    }

    public function isTab(): bool
    {
        return 'tab' === $this->type;
    }

    public function isPage(): bool
    {
        return 'page' === $this->type;
    }
}
