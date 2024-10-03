document.getElementById('header-container').innerHTML = `
    <div style="display: flex; align-items: center; gap: 20px; justify-content: space-between;">
        <p class="headertitle" style="margin: 0;" es-translation="Página Web de Bertogim">Bertogim's Website</p>

        <nav class="navbar">
            <a href="/" es-translation="Inicio">Home</a>
            <a href="/social" es-translation="Redes Sociales">Social Media</a>

            <!-- Dropdown for Creations -->
            <div class="dropdown">
                <a href="/creations" class="dropdown-toggle" es-translation="Creaciones">Creations</a>
                <div class="dropdown-menu">
                    <a href="/apps/discord-timestamps" es-translation="Discord Timestamps">Discord Timestamps</a>
                    <a href="/apps/notepad" es-translation="Notepad">Notepad</a>
                    <a href="/apps/video-compress" es-translation="Video Compress">Video Compress</a>
                </div>
            </div>

            <a href="/photos" es-translation="Fotos">Photos</a>
        </nav>

        <!-- Language Selector -->
        <select class="LanguageSelect" aria-label="Select language">
            <option value="en" es-translation="English">English</option>
            <option value="es" es-translation="Español">Español</option>
        </select>

        <!-- Menu button for mobile view -->
        <span class="menu-toggle" onclick="toggleMenu()">☰</span>
    </div>

    <!-- Mobile menu overlay -->
    <div class="mobile-menu">
        <a href="/" es-translation="Inicio">Home</a>
        <a href="/social" es-translation="Redes Sociales">Social Media</a>

        <div class="dropdown">
            <a href="#" class="dropdown-toggle" es-translation="Creaciones">Creations</a>
            <div class="dropdown-menu">
                <a href="/apps/discord-timestamps" es-translation="Discord Timestamps">Discord Timestamps</a>
                <a href="/apps/notepad" es-translation="Notepad">Notepad</a>
                <a href="/apps/video-compress" es-translation="Video Compress">Video Compress</a>
            </div>
        </div>

        <a href="/photos" es-translation="Fotos">Photos</a>
    </div>
`;

// Añadir la clase 'selected' al enlace actual
const currentPage = window.location.pathname;
document.querySelectorAll('nav a, .mobile-menu a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('selected');
    }
});

// Dropdown hover events
document.querySelector('.dropdown').addEventListener('mouseenter', function () {
    this.querySelector('.dropdown-menu').classList.add('show');
});

document.querySelector('.dropdown').addEventListener('mouseleave', function () {
    this.querySelector('.dropdown-menu').classList.remove('show');
});

// Toggle mobile menu
function toggleMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    mobileMenu.classList.toggle('active');
}

// Apply header CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/header-styles.css';
document.head.appendChild(link);
