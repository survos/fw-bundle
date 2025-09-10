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
This class has not been updated for Framework 7, it is for OnsenUI but we may want something like this.

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
        'message',
        'menu',
        'navigator']

    // ...

    eventPreDebug(e) {
        debug.lifecycle('🔄 Pre-event: %s for page %s', e.type, e.currentPage?.getAttribute('id'));
        debug.lifecycle('Event detail: %o', e.detail);
        debug.lifecycle('Current page: %o', e.currentPage);

        let navigator = e.navigator;
        console.warn(e.type, e.currentPage.getAttribute('id'), e.detail, e.currentPage, e);
    }

    eventPostDispatch(e) {
        debug.lifecycle('✅ Post-event: %s', e.type);

        // idea: dispatch a "{page}:{eventName}" and let the stimulus controller listen for it.
        // let navigator = e.navigator;
        let enterPageName = e.enterPage.getAttribute('id');
        let leavePageName = '~';
        if (e.leavePage) {
            leavePageName = e.leavePage.getAttribute('id');
            let eventType = leavePageName + '.' + e.type;
            debug.events('📤 Dispatching leave event: %s', eventType);
            console.log('dispatching ' + eventType);
            document.dispatchEvent(new Event(eventType));
        }

        // this.dispatch("saved", { detail: { content:
        //         'saved content' } })

        console.info("%s %s => %s", e.type, leavePageName, enterPageName);
        let eventType = enterPageName + '.' + e.type;
        debug.events('📤 Dispatching enter event: %s', eventType);
        console.log('dispatching ' + eventType);
        if (e.type === 'postpush') {
            debug.events('📋 Event data: %o', e.enterPage.data);
            document.dispatchEvent(new CustomEvent(eventType, {detail: e.enterPage.data}));
        }
    }

    initialize() {
        debug.main('🔧 Initializing mobile controller');
        super.initialize();

        document.addEventListener('ons-tabbar:init', function (event) {
            var tabBar = event.component;
            debug.tabs('📊 Tabbar initialized: %o', tabBar);
            console.error(tabBar);
            // tabBar.setActiveTab(someIndex);
        });

        // page events
        ['init', 'show', 'destroy'].forEach(
            (eventName) => {
                debug.lifecycle('🎧 Setting up listener for: %s', eventName);
                console.warn(`Listening for ${eventName}`);
                document.addEventListener(eventName, function (event) {
                    debug.lifecycle('📄 Page %s received %s event', event.target.id, eventName);
                    console.assert(event.target.id, "Missing id in page");
                    // when we get an event that matches the page, dispatch it so that dexie can get it
                    console.warn(`!page ${event.target.id}.${event.type}`, event.target);
                    // if (event.target.matches('#page1')) {
                    //     ons.notification.alert('Page 1 is initiated.');
                    // }
                }, false);
            }
        );
    }

    connect() {
        debug.main('🔌 Mobile controller connecting: %s', this.identifier);
        super.connect();
        console.log('hello from mobile_controller / ' + this.identifier);
        // ons.ready((x) => {
        //     // console.warn("ons is ready, " + this.identifier)
        // });

        // https://framework7.io/docs/page#page-events
        ['init', 'show', 'hide', 'precache',"page:afterin"].forEach(eventName =>
            document.addEventListener(eventName, (e) => {
                debug.lifecycle('📱 Framework7 event: %s for target: %s', e.type, e.target?.getAttribute('id'));

                // console.error('%s:%s / %o', e.type, e.target.getAttribute('id'), e.target);
                // console.info('%s received for %s %o', e.type, e.target.getAttribute('id'), e.target);
                let tabItem = e.detail.tabItem;
                if (tabItem) {
                    let tabPageName = tabItem.getAttribute('page');
                    let eventType = tabPageName + '.' + e.type;
                    debug.tabs('📊 Tab event: %s', eventType);
                    debug.tabs('Tab item: %o', e.detail.tabItem);
                    console.log('dispatching ' + eventType);
                    console.log(e.detail.tabItem);
                    document.dispatchEvent(new CustomEvent(eventType, {'detail': e}));
                }

                //catch page after in
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

        // prechange happens on tabs only, e.tabItem is the tab that's clicked, before the transition
        document.addEventListener('prechange', (e) => {
            debug.tabs('🔄 Tab prechange event');
            // console.log('target', target, e.target.dataset);

            let tabItem = e.detail.tabItem;
            if (tabItem) {
                debug.tabs('📊 Switching to tab: %s', tabItem.getAttribute('page'));
                // console.log('prechange', target, tabItem, pageName);

                // this is the tabItem component, not an HTML element
                let title = tabItem.getAttribute('label');
                if (this.hasTitleTarget) {
                    this.titleTarget.innerHTML = title;
                    debug.tabs('📝 Updated title to: %s', title);
                }
                // 'page', though it's really a tab.
                let tabPageName = tabItem.getAttribute('page');
                let eventType = tabPageName + '.' + e.type;
                debug.events('📤 Dispatching prechange event: %s', eventType);
                console.warn(`dispatching %s`, eventType);
                document.dispatchEvent(new CustomEvent(eventType, {'detail': e}));
            }
        });
    }

    navigatorTargetConnected() {
        debug.main('🧭 Navigator target connected');

        // The page element throws init, show, hide and destroy events depending on its lifecycle
        document.addEventListener('init', e => {
                debug.lifecycle('🔧 Init event received: %o', e);
                // console.error(e)
            }
        );

        // these look like onsen events!
        this.navigatorTarget.addEventListener('prepush', this.eventPreDebug);
        this.navigatorTarget.addEventListener('prepop', this.eventPreDebug);
        this.navigatorTarget.addEventListener('postpush', this.eventPostDispatch);
        this.navigatorTarget.addEventListener('postpop', this.eventPostDispatch);
        // https://thoughtbot.com/blog/taking-the-most-out-of-stimulus
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

    openMenu(e) {
        debug.navigation('🍔 Opening menu');
        this.menuTarget.open();
    }

    log(x) {
        debug.main('📝 Log: %o', x);
        console.log(x);
    }

    messageTargetConnected(element) {
        debug.main('📨 Message target connected');
        // this.messageTarget.innerHTML = ''
    }

    loadPage(e) {
        debug.navigation('📄 Loading page: %s', e.params.route);
        debug.navigation('Page params: %o', e.params);

        this.menuTarget.close();
        let page = e.params.route;
        console.error('loading page ' + page, e.params);
        if (page) {
            this.navigatorTarget.bringPageTop(page, {
                data: e.params.extras.rp,
                animation: 'fade'
            });
            debug.navigation('✅ Page loaded: %s', page);
            console.log('loading page ' + page);
        } else {
            debug.error('❌ Missing page in params: %o', e.params);
            console.error('missing page ', e.params);
        }
    }

    pushPage(e) {
        debug.navigation('🔀 Pushing page: %s', e.params.page);
        debug.navigation('Push params: %o', e.params);

        console.error(e.params);
        this.navigatorTarget.pushPage(e.params.page, {data: e.params})
            .then(p => {
                debug.navigation('✅ Page pushed successfully: %o', p);
                console.log(p);
            });
    }

    getFilter() {
        debug.main('🔍 Getting filter (empty by default)');
        return {};
    }
}