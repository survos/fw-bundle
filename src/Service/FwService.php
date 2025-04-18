<?php

declare(strict_types=1);

namespace Survos\FwBundle\Service;

class FwService
{
    public function __construct(
        // from yaml configuration?
        private array $config = [],
        private array $configs = [],
    )
    {
    }

    public function getConfigs(): array
    {
        return $this->configs;
    }

    public function getConfig(): array
    {
        return $this->config;
    }

}
