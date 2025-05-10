# Framework7 Bundle Demo Setup

Follow these steps to set up and configure the Framework7 Bundle Demo:

## 1. Create a New Symfony Project
```bash
symfony new fwpokemon --webapp
cd fwpokemon
```

## 2. Install Required Bundles
```bash
composer require survos/fw-bundle
composer req survos/maker-bundle --dev
composer require knplabs/knp-menu-bundle
composer require survos/js-twig-bundle
composer require symfony/ux-icons
composer require twig/intl-extra
composer require twig/markdown-extra
composer require league/commonmark
composer require friendsofsymfony/jsrouting-bundle
```

## 3. Create a Controller
```bash
bin/console make:controller AppController
```

## 4. Add Required Imports
Add the following imports to your controller:
```php
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Knp\Menu\FactoryInterface;
use Survos\FwBundle\Service\FwService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\OptionsResolver\OptionsResolver;
```

## 5. Configure Framework7 Bundle
- Create `config/packages/survos_fw.yaml`.
- Create a `templates/tabs/` folder.
- Add `info.html.twig` and `pokemons.html.twig` in the `tabs` folder.

## 6. Install Importmap Dependencies
```bash
bin/console importmap:require stimulus-attributes
bin/console importmap:require fos-routing
bin/console importmap:require framework7/framework7-bundle
bin/console importmap:require framework7/framework7-bundle.min.css
bin/console importmap:require @survos-js-twig/database --path="./vendor/survos/js-twig-bundle/assets/src/lib/dexieDatabase.js"
```

## 8. Configure `routes.js`
Ensure your `assets/routes.js` is properly configured.

## 9. Copy Configuration Files
```bash
cp ../framework7-bundle-demo/config/packages/ux_icons.yaml ./config/packages/
```

## 10. Update Composer Scripts
Add the following to your `composer.json`:
```json
"scripts": {
    "auto-scripts": {
        "cache:clear": "symfony-cmd",
        "assets:install %PUBLIC_DIR% --symlink": "symfony-cmd",
        "importmap:install": "symfony-cmd",
        "fos:js-routing:dump --format=js --target=public/js/fos_js_routes.js --callback=\"export default \"": "symfony-cmd"
    }
}
```

## 11. Create Details Views
### Example: Artist Details
1. Create a new view: `templates/pages/artist.html.twig`.
2. Add the opening tag:
   ```html
   <twig:SurvosFw:Framework7Page ... >
   ```
3. Add a title placeholder:
   ```html
   <twig:block name="title">
       @@title@@
   </twig:block>
   ```
4. Define queries:
   ```twig
   {% set queries = {
      artist: {store: 'artists', type: 'find', id: '{{event.details.id}}', templateName: 'artist'},
      objects: {store: 'objects', filters: {artistCode: '{{artist.code}}'}, filterType: 'where', templateName: 'objects'},
   } %}
   ```
5. Pass queries to the Dexie component:
   ```html
   <twig:dexie
       ...
       :queries="queries"
       ...
   >
   ```
6. Add templates for each block:
   ```html
   <twig:block name="artist" id="twig_artist_template">
       {% set locale = globals.locale %}
       <h1>Artist</h1>
       <div class="artist-detail">
           <h1>{{ data.name|title }}</h1>
       </div>
   </twig:block>
   ```

Follow these steps to complete the setup and start building your application.
