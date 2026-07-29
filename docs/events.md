# Framework7 v9 events: what actually fires, and where data-loading belongs

Written 2026-07-29 after a real confusion in a consuming app (rutado): the team believed
Framework7 v9 had dropped DOM events in favor of an "internal-only" event system, and built a
workaround that manually re-dispatched `CustomEvent`s from inside `app.on(...)` handlers to keep
existing `document.addEventListener(...)` code working. That premise turned out to be wrong — but
the *reason* it looked true is a real, useful thing to understand and document, because it's the
actual thing to check before wiring a new listener.

**Verified against the real installed `framework7@9.1.1` + `dom7@4.0.6` source** (not docs, not
memory — the actual vendored bundle), because the official docs page
(https://framework7.io/docs/page) turned out to match reality, and the confusion had a different
real cause.

## The short version

Framework7 page/tab/view lifecycle events (`page:init`, `pageInit`, `tab:show`, `tabShow`, etc.)
are dispatched from one place, [`Router.pageCallback()`](https://github.com/framework7io/framework7),
which does exactly this for every lifecycle step (`init`, `beforeIn`, `afterIn`, `beforeOut`,
`afterOut`, `mounted`, `beforeRemove`, `reinit`, ...):

```js
const camelCaseName = `page${capitalize(step)}`;   // e.g. "pageInit"
const domEventName  = `page:${step.toLowerCase()}`; // e.g. "page:init"

pageElement.trigger(domEventName, data); // Dom7 .trigger() -> REAL, BUBBLING, NATIVE CustomEvent
router.emit(camelCaseName, data);         // F7's own internal Eventable pub/sub -- NOT a DOM event
```

**Both fire, always, together.** They are not alternate implementations of the same thing — they're
two genuinely different delivery mechanisms for the same moment, and you pick based on *where* you
want to listen from, not because one is "more real" than the other.

## Form 1: the DOM event (`page:init`, colon-lowercase)

This **is** a real native DOM event. Verified directly in `dom7@4.0.6`'s `trigger()` implementation:

```js
// dom7/dom7.index.js, trigger() -- this is the ACTUAL code, not paraphrased
const customEvent = new window.CustomEvent(eventName, {
    detail: data,
    bubbles: true,      // <-- bubbles, so a delegated listener on document works
    cancelable: true,
});
element.dispatchEvent(customEvent); // real native dispatchEvent
```

`.on()` is a thin wrapper around real `addEventListener`. So both of these genuinely work and are
equivalent:

```js
// Framework7's own $$ (Dom7) wrapper
$$(document).on('page:init', (e) => { /* e.detail is the page data */ });

// Plain native DOM API -- also genuinely works, same event, same bubbling
document.addEventListener('page:init', (e) => { /* e.detail is the page data */ });
```

Delegated/scoped listening (only for a specific page) works via Dom7's selector-filtered `.on()`:

```js
$$(document).on('page:init', '.page[data-name="stories"]', (e) => {
    // only fires for the page whose element matches this selector
});
```

Use this form when the listener genuinely belongs to a specific DOM element or needs event
delegation (e.g. a Stimulus controller listening on its own `connect()`-scoped element, or a
handler that only cares about one named page).

## Form 2: the internal event (`pageInit`, camelCase)

This is **not** a DOM event at all — it's Framework7's own separate pub/sub (an "Eventable" mixin
on the `app`/`view`/`router` instances). It never touches `dispatchEvent`/`addEventListener`.

```js
app.on('pageInit', (page) => {
    // `page` is the same data object as `e.detail` above
});

// Or scoped to one view's router:
someView.router.on('pageInit', (page) => { ... });
```

Use this form for app/router-level logic that doesn't care about the DOM at all — e.g. central
data-loading orchestration, analytics, or anything that would otherwise mean attaching/detaching a
`document`-level listener manually.

## The actual gotcha: these only fire when F7's router is driving the navigation

**This is the real thing to check, not the DOM-vs-internal naming.** `pageCallback()` — the one
function that fires *both* forms — is called from inside Framework7's own View/Router page
transition logic. If a navigation in your app is **not** going through F7's router (e.g. a plain
`<a href>` causing a real full-page browser reload, or any code path that swaps DOM content without
going through `view.router.navigate(...)`), `pageCallback()` never runs, and **neither** `page:init`
nor `pageInit` fires. That looks identical to "DOM events are broken," but the actual cause is "F7's
router isn't involved in this navigation at all."

Concretely, in a consuming app: check how F7 is initialized.

```js
// If your app config includes something like this, F7's router deliberately does NOT
// handle normal links -- they become full server-rendered page loads, and F7's page
// lifecycle (both event forms) will never fire for that navigation:
new Framework7({
    el: this.element,
    clicks: {
        externalLinks: 'a[href]:not([href^="#"]):not([href^="javascript:"])',
    },
});
```

That's a legitimate, valid app mode (plain server-rendered pages, F7 used only for UI chrome) — but
it means "listen for `page:init` to load data" is the wrong pattern for that app entirely; there's
no F7 page lifecycle to hook into. Data-loading in that mode belongs in a normal Stimulus
`connect()`/`initialize()` on the page's own controller, not an F7 event listener.

For an app (or a sub-section of one) that **does** use F7's own router/tabs for navigation (an F7
SPA view), the lifecycle events are real and reliable — that's the right place for "on navigate,
fetch data, render" to live, using whichever event form matches where the listener naturally lives.

## Recommended pattern: where data-loading fits

```js
// Stimulus controller for a specific F7-routed page/tab.
export default class extends Controller {
    connect() {
        // Scoped, delegated DOM-event form -- this controller's own concern, no manual
        // attach/detach bookkeeping needed since Stimulus already scopes `this.element`.
        this.element.addEventListener('page:init', this.onPageInit);
    }

    disconnect() {
        this.element.removeEventListener('page:init', this.onPageInit);
    }

    onPageInit = async (e) => {
        const { route } = e.detail;
        // fetch (Dexie today, sqlite-wasm tomorrow -- see rut's sqlite-wasm POC) ...
        // render (js-twig's renderBlock({ rows, globals }) -- source-agnostic) ...
    };
}
```

Don't manually re-dispatch a synthetic `CustomEvent` from inside an `app.on('pageInit', ...)`
handler to "make DOM events work" — that workaround is solving a problem that doesn't exist in v9:
DOM events already work natively. If they appear not to fire, the first thing to check is whether
the navigation in question is actually going through F7's router at all (see gotcha above), not
whether to bridge internal events to DOM events by hand.

## `mobile_controller.js` — fixed 2026-07-29

This file predated the Framework7 migration (its own header comment used to say "This class has
not been updated for Framework 7, it is for OnsenUI") and mixed real F7 event names with pure
OnsenUI ones that don't exist in F7 at all. All of the following were removed or replaced with
real, verified F7 equivalents — confirmed live against `fw-bundle-demo` (`vt.wip`), which
`mobile_controller.js` backs directly as `MobileController` (imported there as
`@survos-mobile/mobile`):

- `'prepush'`, `'prepop'`, `'postpush'`, `'postpop'`, `'ons-tabbar:init'` — OnsenUI-only, no F7
  equivalent. Removed, along with `navigatorTargetConnected()`/the `navigator` target entirely
  (confirmed unused in every template across `rut`, `fw-bundle-demo`, and this bundle's own).
- Bare `document.addEventListener('init'/'show'/'hide'/'destroy', ...)` — missing the `page:`
  prefix, never fired. Removed; the real event names (`page:init`, `page:beforein`, `page:afterin`)
  are used instead.
- `'prechange'` (Onsen tabbar event, no F7 equivalent) — replaced with F7's real `tab:show` DOM
  event, and the title-update logic now reads the visible label from `.tabbar-label` text (this
  bundle's own `start.html.twig` markup) instead of a `label` attribute Onsen tabs had and F7
  tab-links don't.
- `e.detail.tabItem` branch — never verified to exist on a real F7 page-event detail (F7's page
  data carries `route`/`name`/`position`, not a `tabItem` reference); removed rather than left as
  dead-but-plausible-looking code.
- `loadPage()`/`pushPage()` called `navigatorTarget.bringPageTop()`/`.pushPage()` — real OnsenUI
  component methods that don't exist on a plain DOM element, so they always threw. Merged into one
  `loadPage()` using F7's real navigation API (`window.app.views.main.router.navigate(...)`).
  Currently unwired by any template (confirmed), so implemented but not yet exercised by a real
  caller — verify the `e.params` shape against one before relying on it.
- `openMenu()`'s `this.menuTarget.open()` was the same category of bug (an OnsenUI side-menu
  method on a plain element). Left as a comment (`window.app.panel.open('left')` is F7's real API)
  rather than guessed at, since which side this app's menu target maps to isn't confirmed.

Verified via live testing in `fw-bundle-demo`: router init still succeeds
(`app.views.main`/`app.views.main.router` populated), `router.navigate(...)` still works, and the
new `tab:show`-based title update populates `data-app-target="title"` correctly on a real tab
switch (confirmed the rendered DOM: `<div class="title" data-app-target="title">Artists</div>`
after clicking the Artists tab).
