# Repository Guidelines

Follow the shared Survos contributor guidance in `../../../showcase/*.md` first:

- `../../../showcase/AGENTS.md`
- `../../../showcase/CONVENTIONS.md`
- `../../../showcase/PLAN.md`

This repository-specific file only records local context for `survos/fw-bundle`.

## Local Project Notes

`survos/fw-bundle` is a Symfony bundle for Framework7-style mobile app support. PHP source lives in `src/` under `Survos\FwBundle\`. Templates are in `templates/`, translations in `translations/`, browser assets in `assets/`, public CSS in `public/`, and additional notes in `docs/`.

The main integration points are:

- `src/SurvosFwBundle.php`: bundle configuration, service wiring, compiler pass, and AssetMapper registration.
- `assets/package.json`: Stimulus and importmap metadata.
- `assets/src/controllers/mobile_controller.js`: mobile/Framework7 Stimulus controller.
- `templates/fw-base.html.twig`, `templates/start.html.twig`, and `templates/components/`: Framework7-facing Twig UI.

## Commands

- `composer validate`: validate package metadata.
- `vendor/bin/phpstan analyse`: run static analysis with `phpstan.neon`.
- `php -l src/SurvosFwBundle.php`: syntax-check a changed PHP file.
- In a consuming Symfony app, run `bin/console lint:twig templates/`, `bin/console debug:asset-map`, and relevant browser checks for Framework7 behavior.

## Modernization Direction

This bundle should track Symfony 8.1 and allow beta packages while Symfony 8.1 is pre-stable. It uses `survos/kit-bundle` and should follow the modern `AbstractUxBundle` pattern. Prefer setup centered in `src/SurvosFwBundle.php` and avoid adding legacy `DependencyInjection/*Extension.php` classes or sidecar service files.

Framework7 integration is more sensitive than most Survos bundles. When modernizing, verify importmap metadata, Stimulus controller registration, Twig component names, and the consuming app's `framework7/framework7-bundle` imports together.
