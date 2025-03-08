import {Controller} from '@hotwired/stimulus';

/*
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
        let navigator = e.navigator;
        console.warn(e.type, e.currentPage.getAttribute('id'), e.detail, e.currentPage, e);
    }

    eventPostDispatch(e) {
        // idea: dispatch a "{page}:{eventName}" and let the stimulus controller listen for it.
        // let navigator = e.navigator;
        let enterPageName = e.enterPage.getAttribute('id');
        let leavePageName = '~';
        if (e.leavePage) {
            leavePageName = e.leavePage.getAttribute('id');
            let eventType = leavePageName + '.' + e.type;
            console.log('dispatching ' + eventType);
            document.dispatchEvent(new Event(eventType));
        }

        // this.dispatch("saved", { detail: { content:
        //         'saved content' } })

        console.info("%s %s => %s", e.type, leavePageName, enterPageName);
        let eventType = enterPageName + '.' + e.type;
        console.log('dispatching ' + eventType);
        if (e.type === 'postpush') {
            document.dispatchEvent(new CustomEvent(eventType, {detail: e.enterPage.data}));
        }
    }

    initialize() {
        super.initialize();
        console.error("adding a listener");
        document.addEventListener('ons-tabbar:init', function (event) {
            var tabBar = event.component;
            console.error(tabBar);
            // tabBar.setActiveTab(someIndex);
        });

        // page events
        ['init', 'show', 'destroy'].forEach(
            (eventName) => {
                console.warn(`Listening for ${eventName}`);
                document.addEventListener(eventName, function (event) {
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
        super.connect();
        console.log('hello from mobile_controller / ' + this.identifier);
        // ons.ready((x) => {
        //     // console.warn("ons is ready, " + this.identifier)
        // });

        // https://stackoverflow.com/questions/26851516/how-to-open-page-with-ons-tabbar-and-display-specific-tab
        ['init', 'show', 'hide', 'precache'].forEach(eventName =>
            document.addEventListener(eventName, (e) => {
                // console.error('%s:%s / %o', e.type, e.target.getAttribute('id'), e.target);
                // console.info('%s received for %s %o', e.type, e.target.getAttribute('id'), e.target);
                let tabItem = e.detail.tabItem;
                if (tabItem) {
                    let tabPageName = tabItem.getAttribute('page');
                    let eventType = tabPageName + '.' + e.type;
                    console.log('dispatching ' + eventType);
                    document.dispatchEvent(new CustomEvent(eventType, {'detail': e}));
                }
            })
        );
        // prechange happens on tabs only, e.tabItem is the tab that's clicked, before the transition
        document.addEventListener('prechange', (e) => {
            // console.log('target', target, e.target.dataset);

            let tabItem = e.detail.tabItem;
            if (tabItem) {
                // console.log('prechange', target, tabItem, pageName);

                // this is the tabItem component, not an HTML element
                let title = tabItem.getAttribute('label');
                if (this.hasTitleTarget) {
                    this.titleTarget.innerHTML = title;
                }
                // 'page', though it's really a tab.
                let tabPageName = tabItem.getAttribute('page');
                let eventType = tabPageName + '.' + e.type;
                console.warn(`dispatching %s`, eventType);
                document.dispatchEvent(new CustomEvent(eventType, {'detail': e}));
            }
        });
    }

    navigatorTargetConnected() {

        // The page element throws init, show, hide and destroy events depending on its lifecycle
        document.addEventListener('init', e => {
                // console.error(e)
            }
        );

        this.navigatorTarget.addEventListener('prepush', this.eventPreDebug);
        this.navigatorTarget.addEventListener('prepop', this.eventPreDebug);
        this.navigatorTarget.addEventListener('postpush', this.eventPostDispatch);
        this.navigatorTarget.addEventListener('postpop', this.eventPostDispatch);
        // https://thoughtbot.com/blog/taking-the-most-out-of-stimulus

    }

    tabbarTargetConnected(e) {
        console.log('tabbar connected');
        // e.element.addEventListener('init', e =>console.error(e));
    }

    setDb(db, debug = false) {
        if (db !== this.db) {
            this.db = db;
            if (debug) {
                db.tables.forEach(t =>
                    t.count().then(c => console.error(t.name + ': ' + c))
                );
            }
            console.log('db has been set!, @todo: dispatch an event up update related values');
        }
    }

    getDb() {
        // @todo: check if this is a real db? a Promise?
        // return this.db ? this.db : false;
        return window.db ? window.db : false;
    }


    setTitle(title) {
        // only PAGE title change, not tabs
        console.assert(this.hasPageTitleTarget, "missing page title target")
        this.pageTitleTarget.innerHTML = title;
        // console.assert(this.hasTitleTarget, "missing titleTarget")
        // this.titleTarget.innerHTML = title;
    }

    openMenu(e) {
        this.menuTarget.open();
    }


    log(x) {
        console.log(x);
    }


    messageTargetConnected(element) {
        // this.messageTarget.innerHTML = ''
    }

    loadPage(e) {
        this.menuTarget.close();
        let page = e.params.route;
        console.error('loading page ' + page, e.params);
        if (page) {
            this.navigatorTarget.bringPageTop(page, {
                data: e.params.extras.rp,
                animation: 'fade'
            });
            console.log('loading page ' + page);
        } else {
            console.error('missing page ', e.params);
        }

    }

    pushPage(e) {
        console.error(e.params);
        this.navigatorTarget.pushPage(e.params.page, {data: e.params})
            .then(p => console.log(p));
    }

    getFilter() {
        return {};
    }

}

