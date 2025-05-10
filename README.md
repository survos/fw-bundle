# Survos Fw (Framework7) Bundle

A collection of tools to help create Symfony-based mobile apps.

* framework7
* pwa-bundle
* Dexie

Work in Progress.  See https://github.com/survos-sites/framework7-bundle-demo to see this in action.

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

