// app/js/main.js — vanilla JS frontend that uses Algolia (client) and calls backend
// NOTE: For Algolia, use a search-only key in the client. Admin keys must be on server.

const apiBase = '/API'; // when served via backend, API prefixes /API; in dev adjust via root scripts

// Quick ping test
document.getElementById('callAPI').addEventListener('click', async () => {
    const resEl = document.getElementById('apires');
    try {
        const r = await fetch(`${apiBase}/ping`);
        const j = await r.json();
        resEl.textContent = JSON.stringify(j, null, 2);
    } catch (err) {
        resEl.textContent = 'Error: ' + err.message;
    }
});

// Algolia InstantSearch initialisation using CDN global `algoliasearch` and `instantsearch`
const ALGOLIA_APP_ID = 'REPLACE_WITH_YOUR_APP_ID';           // put your app id here
const ALGOLIA_SEARCH_KEY = 'REPLACE_WITH_SEARCH_ONLY_KEY';  // put a search-only key here
const ALGOLIA_INDEX = 'my_index';                           // choose index name

if (window.algoliasearch && window.instantsearch && ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY) {
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
    const search = instantsearch({
        indexName: ALGOLIA_INDEX,
        searchClient: client
    });

    search.addWidgets([
        instantsearch.widgets.searchBox({
            container: '#searchbox',
            placeholder: 'Search the index'
        }),
        instantsearch.widgets.hits({
            container: '#hits',
            templates: {
                item: `<div class="p-2 bg-white border rounded mb-2">
                 <strong>{{#helpers.highlight}}{ "attribute": "title" }{{/helpers.highlight}}</strong>
                 <div class="text-sm text-gray-600">{{description}}</div>
               </div>`
            }
        })
    ]);

    search.start();
} else {
    // if keys not set, leave placeholder text
    document.getElementById('hits').innerHTML = '<div class="text-sm text-gray-500">Algolia not initialised (set APP_ID + SEARCH_KEY in js/main.js)</div>';
}