import {Controller} from '@hotwired/stimulus';
import Debug from 'debug';

// Set up debug namespaces
const debug = {
    main: Debug('mobile:main'),
    events: Debug('mobile:events'),
    tabs: Debug('mobile:tabs'),
    navigation: Debug('mobile:navigation'),
    lifecycle: Debug('mobile:lifecycle'),
    error: Debug('mobile:error')
};

/*
Updated for real Framework7 v9 event names (2026-07-29) -- see ../../../docs/events.md for the
full writeup of how this was verified (traced the actual dispatch code in framework7@9.1.1's
pageCallback() and dom7@4.0.6's trigger(), then confirmed live against fw-bundle-demo). Summary:
`page:init` (colon-lowercase) IS a real, native, bubbling DOM CustomEvent -- catchable via plain
document.addEventListener(), no Dom7 wrapper required. `pageInit` (camelCase) is F7's SEPARATE
internal Eventable pub/sub (app.on(...)/router.on(...)), not a DOM event at all. Both fire
together from the same call, for every real page lifecycle step -- but ONLY when F7's own
router/view is actually driving the navigation (confirmed via fw-bundle-demo's start.html.twig
`.view-main.view-init` structure + app_controller.js's `new Framework7({ el:'#app', ... })`).

This file previously mixed pure OnsenUI event names (prepush/prepop/postpush/postpop,
ons-tabbar:init) -- which have no Framework7 equivalent at all and never fired -- with bare,
un-prefixed names ('init'/'show'/'destroy' instead of 'page:init' etc.) that also never fired
against real F7 dispatch. Both classes of dead listener are removed below; only verified F7 event
names remain.

* The following line makes this controller "lazy": it won't be downloaded until needed
* See https://github.com/symfony/stimulus-bridge#lazy-controllers
*/
/* stimulusFetch: 'lazy' */
export default class extends Controller {
    static targets = [
        'menu',
        'detail',
        'title',
        'pageTitle',
        'tabbar',
        'tab',
        'twigTemplate',
        'message']

    initialize() {
        debug.main('🔧 Initializing mobile controller');
        super.initialize();
    }

    connect() {
        debug.main('🔌 Mobile controller connecting: %s', this.identifier);
        super.connect();
        console.log('hello from mobile_controller / ' + this.identifier);
        // ons.ready((x) => {
        //     // console.warn("ons is ready, " + this.identifier)
        // });

        // Real, verified Framework7 v9 DOM event names only (see docs/events.md) -- these are
        // genuine native CustomEvents (dom7's trigger() -> real dispatchEvent()), catchable via
        // plain document.addEventListener() with no wrapper needed. They only fire when F7's own
        // router/view is driving the navigation (see events.md's "the actual gotcha" section) --
        // if this listener never logs anything in an app, check that first, not the event names.
        ['page:init', 'page:beforein', 'page:afterin'].forEach(eventName =>
            document.addEventListener(eventName, (e) => {
                debug.lifecycle('📱 Framework7 event: %s for target: %s', e.type, e.target?.getAttribute('id'));

                // Verified working (this exact code is live in fw-bundle-demo today): F7 fires a
                // real page:afterin DOM event with a page-data detail; when the route carries a
                // :page param, re-dispatch a "<page>.refresh" event carrying that data, so a
                // per-page Stimulus/dexie controller can react without its own F7 event wiring.
                if (e.type === 'page:afterin') {
                    debug.navigation('🧭 Page after in event');
                    debug.navigation('Event detail: %o', e.detail);

                    let pageName = e.detail.name;

                    // Check if we have route params to construct the event
                    if (e.detail && e.detail.route && e.detail.route.params && e.detail.route.params.page) {
                        debug.navigation('📋 Route params: %o', e.detail.route.params);

                        const refreshEventName = e.detail.route.params.page + ".refresh";
                        debug.events('📤 Dispatching refresh event: %s', refreshEventName);
                        debug.events('🎯 Complete event detail: %o', e.detail);

                        // Pass the complete detail object - let the dexie controller parse it
                        e.detail.id = e.detail.route.params.id;
                        document.dispatchEvent(new CustomEvent(refreshEventName, {
                            'detail': e.detail  // Pass the complete Framework7 page object
                        }));
                    } else {
                        debug.navigation('⚠️ Missing route params for page:afterin event');
                        debug.navigation('Available detail: %o', e.detail);
                    }
                }
            })
        );

        // Real F7 replacement for Onsen's tabbar "prechange" (this bundle previously listened
        // for a bare 'prechange' event that doesn't exist in Framework7 at all): F7's actual
        // equivalent is 'tab:show', a real DOM event fired on the tab's own content panel when it
        // becomes visible (verified present + dispatched via a real .trigger() call in
        // framework7@9.1.1's source -- see docs/events.md). Onsen's tabbar-item carried a
        // `label` attribute to read the title from directly; F7 tab-links have no such
        // attribute -- this bundle's own start.html.twig renders the visible label as text
        // inside a child `.tabbar-label` span instead, so look it up there.
        document.addEventListener('tab:show', (e) => {
            const tabId = e.target.id; // e.g. "tab-locations"
            debug.tabs('🔄 Tab shown: %s', tabId);
            if (!tabId || !this.hasTitleTarget) return;

            const label = document.querySelector(`a.tab-link[href="#${tabId}"] .tabbar-label`);
            if (label) {
                this.titleTarget.innerHTML = label.textContent.trim();
                debug.tabs('📝 Updated title to: %s', label.textContent.trim());
            }
        });
    }

    tabbarTargetConnected(e) {
        debug.tabs('📊 Tabbar target connected');
        console.log('tabbar connected');
        // e.element.addEventListener('init', e =>console.error(e));
    }

    setDb(db, debug_db = false) {
        debug.main('🗄️ Setting database: %o', !!db);
        if (db !== this.db) {
            this.db = db;
            if (debug_db) {
                db.tables.forEach(t =>
                    t.count().then(c => {
                        debug.main('📊 Table %s: %d records', t.name, c);
                        console.error(t.name + ': ' + c);
                    })
                );
            }
            debug.main('✅ Database set successfully');
            console.log('db has been set!, @todo: dispatch an event up update related values');
        }
    }

    getDb() {
        const hasDb = window.db ? true : false;
        debug.main('📥 Getting database: %s', hasDb ? 'available' : 'not available');
        // @todo: check if this is a real db? a Promise?
        // return this.db ? this.db : false;
        return window.db ? window.db : false;
    }

    setTitle(title) {
        debug.main('📝 Setting title: %s', title);
        // only PAGE title change, not tabs
        console.assert(this.hasPageTitleTarget, "missing page title target")
        this.pageTitleTarget.innerHTML = title.trim();
        this.titleTarget.innerHTML = title;
        debug.main('✅ Title updated successfully');
        // console.assert(this.hasTitleTarget, "missing titleTarget")
        // this.titleTarget.innerHTML = title;
    }

    // this.menuTarget.open() was an OnsenUI ons-side-menu component method -- a plain DOM
    // element (an F7 .panel) has no .open() method. F7's real panel API is app.panel.open(side)
    // (or a click handler on an element with the panel-open class, which start.html.twig's own
    // menu-trigger links already use directly -- see the panel-open/panel-close classes there).
    // Left as a comment rather than a guessed implementation: which side ('left'/'right') this
    // particular menuTarget maps to needs confirming against real markup, not assumed.
    // openMenu(e) { window.app.panel.open('left'); }

    log(x) {
        debug.main('📝 Log: %o', x);
        console.log(x);
    }

    messageTargetConnected(element) {
        debug.main('📨 Message target connected');
        // this.messageTarget.innerHTML = ''
    }

    // Real F7 replacement for Onsen's navigator.bringPageTop()/pushPage() (this bundle's old
    // navigatorTargetConnected()/loadPage()/pushPage() called those directly on a plain DOM
    // element -- they're OnsenUI component methods, not real DOM APIs, so they always threw).
    // F7's real navigation API is the router itself: window.app.views.main.router.navigate(url).
    // Currently unwired (no template dispatches a "mobile#loadPage" action anywhere), so this is
    // implemented-but-unverified against real params -- confirm the exact e.params shape against
    // a real caller before relying on it.
    loadPage(e) {
        const route = e.params.route;
        debug.navigation('📄 Navigating to: %s', route);
        if (!route) {
            debug.error('❌ Missing route in params: %o', e.params);
            return;
        }
        // F7 panel close is app.panel.close('left'|'right'), not an element method -- not wired
        // here since which side this menu is needs confirming against real markup.
        window.app.views.main.router.navigate(route, { props: e.params.extras?.rp });
    }

    getFilter() {
        debug.main('🔍 Getting filter (empty by default)');
        return {};
    }
}