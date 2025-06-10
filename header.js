// Create the link element for the stylesheet
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/header-styles.css';

// Append the link to the head
document.head.appendChild(link);

// Wait for the stylesheet to load
link.addEventListener('load', () => {

    const header = document.createElement('header');
    header.id = 'header-container';


    const innerNav = `
        <a href="/" es-translation="Inicio">Home</a>
            <a href="/social" es-translation="Redes Sociales">Social Media</a>

            <!-- Dropdown for Creations -->
        <div class="dropdown">
            <a href="/creations" class="dropdown-toggle" es-translation="Creaciones">Creations</a>
            <div class="dropdown-menu">
                <a href="/apps/discord-timestamps" es-translation="Discord Timestamps">Discord Timestamps</a>
                <a target="_blank" href="/apps/notepad" es-translation="Notepad">Notepad</a>
                <div class="dropdown">
                    <a href="/apps/video/" class="dropdown-toggle" es-translation="Herramientas de Video">Video Tools</a>
                    <div class="dropdown-menu">
                        <a href="/apps/video/compressor" es-translation="Compresor de Video">Video Compress</a>
                        <a href="/apps/video/conversor" es-translation="Conversor de Multimedia">Media Conversor</a>
                        <a href="/apps/video/mp4-to-mp3" es-translation="MP4 a MP3">MP4 to MP3</a>
                    </div>
                </div>
                
            </div>
        </div>

        <a href="/photos" es-translation="Fotos">Photos</a>
`


    header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 20px; justify-content: space-between;">
        <p class="headertitle" style="margin: 0;" es-translation="Página Web de Bertogim">Bertogim's Website</p>

        <nav class="navbar">
            ${innerNav}
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
        ${innerNav}
    </div>
    `

    document.body.prepend(header);

    // Añadir la clase 'selected' al enlace actual
    const currentPage = window.location.pathname;
    document.querySelectorAll('nav a, .mobile-menu a').forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('selected');
        }
    });

    // Selecciona todos los dropdowns
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');

        // Agrega evento mouseenter al dropdown principal
        dropdown.addEventListener('mouseenter', function () {
            dropdownMenu.classList.add('show');
        });

        // Agrega evento mouseleave al dropdown principal
        dropdown.addEventListener('mouseleave', function () {
            dropdownMenu.classList.remove('show');
        });
    });

    // Selecciona todos los submenús
    const subDropdowns = document.querySelectorAll('.dropdown-menu .dropdown');

    subDropdowns.forEach(subDropdown => {
        const subDropdownMenu = subDropdown.querySelector('.dropdown-menu');

        // Agrega evento mouseenter a los submenús
        subDropdown.addEventListener('mouseenter', function () {
            subDropdownMenu.classList.add('show');

            // Comprobar si el submenú se sale de la pantalla
            const rect = subDropdownMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                subDropdownMenu.style.left = 'auto'; // Anula la propiedad 'left'
                subDropdownMenu.style.right = '100%'; // Cambia a la izquierda del menú principal
            } else {
                subDropdownMenu.style.left = '100%'; // Mantiene la posición a la derecha
                subDropdownMenu.style.right = 'auto'; // Asegúrate de que 'right' esté desactivado
            }
        });

        // Agrega evento mouseleave a los submenús
        subDropdown.addEventListener('mouseleave', function () {
            subDropdownMenu.classList.remove('show');
        });
    });




});


// Toggle mobile menu
function toggleMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    mobileMenu.classList.toggle('active');
}