<!doctype html>
<html lang="en">
<?php
$pageTitle = 'Homepage of Vapor';
$pageCSS = 'index.css';
include 'head.php';
?>
<body class="bg-slate-50">

  <ion-app>
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title class="text-xl">Cross Platform Assignment</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="p-4">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-2xl mb-2">Search (Algolia demo)</h2>
        <!-- Simple search input -->
        <input id="searchbox" class="w-full p-3 border rounded mb-3" placeholder="Type to search (requires Algolia index)..."/>

        <div id="hits"></div>

        <hr class="my-4"/>

        <h3 class="text-lg">API demo</h3>
        <button id="callApi" class="p-2 bg-blue-600 text-white rounded">Call API /ping</button>
        <pre id="apires" class="mt-3 p-3 bg-white border rounded"></pre>
      </div>
    </ion-content>
  </ion-app>

  <script type="module" src="js/Algolia.js"></script>
</body>
</html>