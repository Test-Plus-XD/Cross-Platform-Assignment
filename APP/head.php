<?php
    //PHP Debug
    if (session_status() === PHP_SESSION_NONE) session_start();
    ini_set('display_errors', 1); // Ensure errors are shown
    ini_set('display_startup_errors', 1);
    ini_set('html_errors', 0);    // Disable HTML formatting of errors
    error_reporting(E_ALL);       // Report all PHP errors
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);// Report all SQL errors
    
    // Sentry
    require_once __DIR__ . '/PHP/vendor/autoload.php';
    require 'vendor/autoload.php';
    \Sentry\init([
      'dsn' => 'https://e378540833204990d51d30c26dff9dc4@o4509003279499264.ingest.de.sentry.io/4510038750330960test-plus / php-cross-platform-assignment',
      // Add request headers, cookies and IP address,
      // see https://docs.sentry.io/platforms/php/data-management/data-collected/ for more info
      'send_default_pii' => true,
      // Specify a fixed sample rate
      'traces_sample_rate' => 0.1,
      // Set a sampling rate for profiling - this is relative to traces_sample_rate
      'profiles_sample_rate' => 0.1,
      // Enable logs to be sent to Sentry
      'enable_logs' => true,
    ]);
    \Sentry\configureScope(function (\Sentry\State\Scope $scope): void {
        $scope->setUser(['id' => $_SESSION['user_id'] ?? 'guest']);
    });
    try {
      $this->functionFailsForSure();
    } catch (\Throwable $exception) {
      \Sentry\captureException($exception);
    }
?>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!--Third Parties-->
        <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Edu+AU+VIC+WA+NT+Guides:wght@400..700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Honk&display=swap" rel="stylesheet">
        <!-- Bootstrap Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
        <!-- Font Awesome Icon -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-9usAa10IRO0HhonpyAIVpjrylPvoDwiPUiKdWk5t3PyolY1cOd4DSE0Ga+ri4AuTroPR5aQvXU9xC6qOPnzFeg==" crossorigin="anonymous" referrerpolicy="no-referrer">
        <!-- Tailwind Play CDN (dev / prototyping). For production prefer building Tailwind. -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <!-- Ionic core (web components) via CDN -->
    <script type="module" src="https://unpkg.com/@ionic/core@6.0.0/dist/ionic/ionic.esm.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/@ionic/core@6.0.0/css/ionic.bundle.css"/>
        <!-- Algolia InstantSearch (vanilla JS) via CDN -->
    <script src="https://cdn.jsdelivr.net/npm/algoliasearch@4/dist/algoliasearch-lite.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/instantsearch.js@4"></script>
        <!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.canvasjs.com/ga/canvasjs.min.js"></script>
    <script src="https://js-de.sentry-cdn.com/a390895a61d9ae66ff37883b6cf73c6b.min.js" crossorigin="anonymous"></script>
        <!-- jQuery -->
    <script src="https://ajax.aspnetcdn.com/ajax/jQuery/jquery-3.3.1.min.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <!-- Firebase -->
    <script src="https://www.gstatic.com/firebasejs/11.5.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/11.5.0/firebase-app-check-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/11.5.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth__zh_tw.js"></script>
    <link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/6.1.0/firebase-ui-auth.css"/>

    <!--Custom-->
    <title><?php echo $pageTitle ?? 'Title Unavailable'; ?></title>
    <link rel="icon" type="image/x-icon" href="Multimedia/Amplifier.png">
    <script src="js/UI.js" defer></script>
    <?php require_once 'header.php'; ?>
    <?php include_once 'chatbot_widget.php'; chatbotWidget(); ?>
</head>