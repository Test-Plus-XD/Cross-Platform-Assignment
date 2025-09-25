<header class="header sticky-top">
    <div class="container">
        <div class="row">
            <!-- Navbar -->
            <nav class="navbar navbar-expand-lg bg-body-tertiary">
                <div class="container-fluid">
                    <a class="navbar-brand" href="index.php">
                        <img src="Multimedia/Sliver_Wolf.png" class="nav-icon" alt="Website Icon" />
                        <span class="website-name">烝汽坪檯 &nbsp VAPOR</span>
                    </a>
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-bs-controls="navbarNav" aria-bs-expanded="false" aria-bs-label="Toggle navigation">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navbarNav">
                        <ul class="navbar-nav ms-auto">
                            <li class="nav-item">
                                <a id="sessionButton" class="nav-link flex-fill text-center disabled" href="session.php" style="font-size: 0.8em;" hidden>Session ID:  <?php echo session_id() ; ?></a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link flex-fill" href="search.php">Search</a>
                            </li>
                            <li class="nav-item">
                                <a id="libraryButton" class="nav-link flex-fill text-center disabled" href="library.php" aria-disabled="true">
                                    Library
                                    <span class="badge bg-secondary position-absolute top-1" id="library_badge" hidden>0</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a id="cartButton" class="nav-link flex-fill text-center" href="cart.php">
                                    Cart
                                    <span class="badge rounded-pill bg-info position-absolute top-0 start-100 translate-middle" id="cart_badge" hidden>0</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a id="loginButton" class="nav-link flex-fill text-center" href="login.php"><p>My Account</p></a>
                            </li>
                            <li class="nav-item">
                                <a id="adminButton" class="nav-link flex-fill text-center" href="dashboard.php" hidden><p>Dashboard</p></a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </div>
    </div>
</header>