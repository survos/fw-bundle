# Survos Fw (Framework7) Bundle

A collection of tools to help create Symfony-based mobile apps.

* framework7
* pwa-bundle
* Dexie

Work in Progress.  See https://github.com/survos-sites/framework7-bundle-demo to see this in action.

See `docs/events.md` for how Framework7 v9's page/tab lifecycle events actually work (DOM events
vs. F7's own internal pub/sub, and the real gotcha: they only fire when F7's router is driving the
navigation) — read that before wiring up any new event listener in an app built on this bundle.

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

Because `clicks.externalLinks: 'a'` routes every link through a real
browser navigation instead of F7's own router, F7's page lifecycle events
(`page:init`/`pageInit` and friends — see `docs/events.md`) never fire in
this mode. That's expected, not a bug: there's no F7-managed page
transition for them to fire *for*. Do data-loading in a normal Stimulus
`connect()`/`initialize()` here, not an F7 event listener.

## Multi-project apps: Dexie-synced, no full page loads

This is the pattern that actually delivers "installable app, not a website" — every tab switch
and every detail-page navigation happens client-side, with zero server round-trip after the
initial page load. It's real and working today in
[survos-sites/framework7-bundle-demo](https://github.com/survos-sites/framework7-bundle-demo)
(`chijal`/`modo`/`cmas` projects) — that repo is the canonical reference implementation; this
section is the map of how its pieces fit together, since previously the only trace of it here was
a partial, admittedly-unfinished note. If you're building a new multi-tenant app on this bundle,
copy from that demo, not from scratch.

### The pieces, end to end

1. **`config/packages/survos_fw.yaml`** — one `projects:` entry per tenant. Each project is a
   `code`, `logo`, `name`, an ordered `tabs` list (each tab name maps to a
   `templates/tabs/<name>.html.twig` include), a Dexie `database` name, and `stores` (the
   `{name, schema, url}` triplets Dexie syncs — `schema` is a Dexie index spec, `url` is the
   fetch source; `url: null` for a store that's purely local/client-written, e.g. a
   `checkins`/`claps` table nothing ever fetches):

   ```yaml
   survos_fw:
     projects:
       chijal:
         code: chijal
         logo: /logos/chijal-logo.jpg
         name: Chijal
         tabs: [locations, map, artists, obras, info]
         database: chijal
         stores:
           - { name: artists, schema: code, url: https://chijal.org/api/artists }
           - { name: locations, schema: code, url: https://chijal.org/api/locations }
           - { name: checkins, schema: "locationCode,timestamp", url: null }
   ```

2. **`@SurvosFw/start.html.twig`** (this bundle's own template — extend or override, don't
   copy) renders **every tab's content into the DOM in one page load**:

   ```twig
   <div class="tabs">
       {% for t in config.tabs %}
           <div id="tab-{{ t }}" class="page-content tab">
               {{ include('tabs/%s.html.twig'|format(t), {t: t}) }}
           </div>
       {% endfor %}
   </div>
   ```

   Switching tabs is Framework7's own native tab mechanism — no navigation, no fetch. F7 fires
   `tabShow`/`tabHide`; the app controller (below) turns `tabShow` into a plain DOM
   `CustomEvent('tab-{id}-show')`. This re-dispatch is legitimate, not a workaround: F7's real
   `tab:show` DOM event already exists and fires fine on its own (see `docs/events.md`), but it's
   generic — the same name for every tab. Constructing a per-tab-id event name here is genuinely
   new information F7 doesn't provide, needed so each tab's own `<twig:dexie refreshEvent="tab-
   {{t}}-show">` only re-renders itself, not every tab at once.

3. **Each `tabs/<name>.html.twig`** wraps its content in `<twig:dexie>`, keyed to that same
   event, so the tab (re-)renders from whatever's already in IndexedDB every time it's shown —
   not on a timer, not on page load, on the F7 event:

   ```twig
   <twig:dexie refreshEvent="tab-{{ t }}-show" :store="t" :globals="{}" :filter="{}" :caller="_self">
       <twig:block name="twig_template">
           {% for row in rows %}
               <a href="/pages/artist/{{ row.code }}" class="item-link">{{ row.name }}</a>
           {% endfor %}
       </twig:block>
   </twig:dexie>
   ```

   `rows` there comes from `window.db.table(t).toArray()`, filtered by `:filter` if given — see
   `assets/src/controllers/dexie_controller.js` in `survos/js-twig-bundle`.

4. **Detail pages** (`/pages/artist/{code}`) are plain `<a href>` links, but they resolve through
   **Framework7's own client-side router** (`routes.js`, `app.views.main.router`), not the
   browser — so this layer of navigation is app-like too, not just tab-switching. This is the
   part easiest to miss: there's nothing conspicuously "SPA" about the markup, it's just an
   `<a href>`, and the app-like behavior is entirely down to F7 owning routing for anything under
   its view root.

5. **The app Stimulus controller** (`_app_sc`, conventionally named `app` — see the Twig note
   above) does three things on `initialize()`: constructs `new Framework7({...el: '#app',
   routes...})`, listens for the `dbready` event dispatched once Dexie has finished its initial
   sync (see `survos/js-twig-bundle`'s `DbUtilities`) to settle the initial tab/route from the
   URL hash, and constructs `new DbUtilities(config.projects[configCode], locale)` inside F7's
   own `init:` callback — this is what actually triggers the Dexie sync for this project's
   configured `stores`. Copy `framework7-bundle-demo/assets/controllers/app_controller.js`
   wholesale as your starting point; it's short and every piece in it is load-bearing.

### Known limitation — projects are static config today

Adding a new project means adding a YAML entry and redeploying. That's an accepted stopgap for
getting navigation and dynamic rendering working, not the intended end state — a project is just
a name, a logo, and a handful of endpoints, and that's a natural fit for a small admin-managed
registry (a database table + a simple CRUD UI) instead of static YAML requiring a rebuild per
addition. Not built yet; flagging it here so the next person who reaches for `survos_fw.yaml`
doesn't assume static config is the permanent design.

## Requirement

```bash
bin/console importmap:require stimulus-attributes
bin/console importmap:require fos-routing
composer req friendsofsymfony/jsrouting-bundle
```

