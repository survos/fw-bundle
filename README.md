# Survos Fw (Framework7) Bundle

A collection of tools to help create Symfony-based mobile apps.

* framework7
* pwa-bundle
* Dexie

Work in Progress.  See https://github.com/survos-sites/framework7-bundle-demo to see this in action.

## Adding fw7 to an existing PWA (simple, no Dexie)

Everything below the "Notes" heading documents the full Dexie-synced,
multi-tab-store SPA pattern used by `framework7-bundle-demo`. If your app
is just plain server-rendered Symfony pages (every route a real page load,
not an in-app SPA router) and you want Framework7 purely as PWA chrome —
navbar, tabbar, card/list/button styling — you don't need any of that.
This is the simpler path, verified working end to end in
[survos-sites/sos](https://github.com/survos-sites/sos).

### 1. Install and register

```bash
composer require survos/fw-bundle spomky-labs/pwa-bundle
```

```php
// config/bundles.php
Survos\FwBundle\SurvosFwBundle::class => ['all' => true],
SpomkyLabs\PwaBundle\SpomkyLabsPwaBundle::class => ['all' => true],
```

`spomky-labs/pwa-bundle`'s recipe comes from `recipes-contrib` and gets
silently skipped by Flex in non-interactive installs — if `cache:clear`
throws about a missing `pwa.image_processor` or similar, just add the
bundle line above by hand and write `config/packages/pwa.yaml` yourself
(copy `sos`'s or `framework7-bundle-demo`'s as a starting point). Same
story for `survos/auth-bundle` if you use it: it needs
`KnpU\OAuth2ClientBundle\KnpUOAuth2ClientBundle::class` registered too,
also silently skipped for the same reason.

### 2. Pull in Framework7 via importmap

```bash
bin/console importmap:require framework7/bundle@9.1.1 framework7/css/bundle@9.1.1 framework7-icons framework7-icons/css/framework7-icons.min.css
```

### 3. The Stimulus controller — two non-obvious gotchas

```js
// assets/controllers/f7_controller.js
import { Controller } from '@hotwired/stimulus';
import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.min.css';

export default class extends Controller {
    connect() {
        window.app = new Framework7({
            el: this.element,
            theme: 'auto',
            // Framework7 auto-creates a routed "main view" on .view-main
            // and hijacks every <a> click inside it, fetching the target
            // via its own AJAX router instead of a normal navigation.
            // Without this, EVERY link in the app silently stops working
            // the moment you're not building an actual F7 SPA.
            clicks: {
                externalLinks: 'a',
            },
        });
    }
}
```

```twig
{# templates/base.html.twig #}
<body data-turbo="false">
```

The `data-turbo="false"` matters even if you never intentionally reach for
Turbo: `symfony/ux-turbo` ships in the default `symfony new --webapp`
skeleton and is enabled by default. Without disabling it, Turbo intercepts
a form submit or link click, does its own DOM-morphing navigation, and
Framework7's Stimulus controller reconnects on the un-reloaded page —
throwing `Framework7 is already initialized and can't be initialized more
than once`. Both of these were found the hard way building `sos`: the
Settings tab (and every other in-app link) was completely dead until the
`clicks.externalLinks` fix landed.

### 4. The page shell

```twig
{# templates/base.html.twig #}
<div id="app" class="framework7-root safe-areas" {{ stimulus_controller('f7') }}>
    <div class="view view-main view-init safe-areas" data-url="/">
        <div class="page page-current">
            <div class="navbar">
                <div class="navbar-bg"></div>
                <div class="navbar-inner">
                    <div class="title">{% block navbar_title %}App Name{% endblock %}</div>
                </div>
            </div>

            <div class="page-content">
                {% block body %}{% endblock %}
            </div>

            <div class="toolbar tabbar toolbar-bottom">
                <div class="toolbar-inner">
                    <a href="{{ path('some_route') }}" class="tab-link {{ app.request.attributes.get('_route') starts with 'some' ? 'tab-link-active' }}">
                        <i class="icon f7-icons">house_fill</i>
                        <span class="tabbar-label">Home</span>
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
```

Every real page in the app just `{% extends 'base.html.twig' %}` and fills
in `body`/`navbar_title` — no Dexie stores, no client-side routing, no
`<twig:dexie>` component. Symfony's own routing and Twig rendering do all
the work; Framework7 is purely CSS + the tabbar/navbar/card/list/button
markup conventions.

## Notes

These need to be cleaned up, but they're useful to me during development.

### Twig

The application can be run as an SPA.  The initial page must extend the base page

    {% extends "@SurvosFw/base.html.twig" %}

create app_controller and extend it from 


This is one way of loading a page, but possibly only relevant with OnsenUI

      {{ stimulus_action(_app_sc, 'loadPage', 'click', {
          route: 'whatever'
      }) }}

_app_sc should be set to 'app', someday this may change (https://github.com/hotwired/stimulus/issues/641)

### Tabs and Pages

Two fundamental concepts: the tabs at the bottom of the screen, and everything else.

All pages, though, are pre-loaded as twig templates in (MobileController?)

To create the tabs, the following, where id is the name of the tab template

```php
#[AsEventListener(event: KnpMenuEvent::MOBILE_TAB_MENU)]
public function tabMenu(KnpMenuEvent $event): void
{
    $menu = $event->getMenu();
        $this->add($menu, id: 'projects', label: 'projects', icon: 'fa-list');
        $this->add($menu, id: 'tours', label: 'tours', icon: 'fa-list', badge: 'x');
        $this->add($menu, id: 'share', label: 'share', icon: 'fa-qrcode');

```

## Events

Old way:
When a tab is clicked, a 'prechange' event is dispatched, with  event.tabItem as the tab that's about to become active.  We intercept  

### Dynamic Data

To load dynamic data into a page, you must first put the data into dixie.  The basic way is to set up "stores" and define the indexable fields, eg..

```yaml
survos_js_twig:
  debug: true
  db: omar-db
  version: 7
  stores:
    -
      name: items
      schema: "++id,code,title,projectCode"
      url: /api/items
    -
      name: projects
      schema: "code"
      url: /api/projects
```



## Requirement

```bash
bin/console importmap:require stimulus-attributes
bin/console importmap:require fos-routing
composer req friendsofsymfony/jsrouting-bundle
```

