document.addEventListener("DOMContentLoaded", function () {
    var languageSelect = document.querySelector('.LanguageSelect');

    // Carga el idioma seleccionado, o el idioma del navegador si no hay ninguno guardado
    var storedLanguage = localStorage.getItem('selectedLanguage') || navigator.language.slice(0, 2);
    languageSelect.value = storedLanguage;

    // Llama a la función translate con el idioma seleccionado
    translate(storedLanguage);

    // Agrega un evento al cambio de idioma
    languageSelect.addEventListener("change", function () {
        var selectedValue = languageSelect.value;
        translate(selectedValue);
        // guarda el idioma en localStorage
        localStorage.setItem('selectedLanguage', selectedValue);

        // Si el idioma seleccionado es "en", recarga la página
        if (selectedValue === "en") {
            window.location.reload();
        }
    });
});

// Función para traducir el contenido de la página
function translate(language) {
    console.log("Selected language: " + language);
    // Si el idioma es "en", no hacer nada a menos que esté en "es" porque la página está en inglés
    if (language === "en" && document.documentElement.lang !== "es") {
        return;
    }

    var elementsToTranslate = document.querySelectorAll('*[es-translation]:not(script):not(style)');

    elementsToTranslate.forEach(function (element) {
        const translatedText = element.getAttribute("es-translation-" + language) || element.getAttribute("es-translation");
        element.innerHTML = translatedText;
    });

    document.documentElement.lang = language;
}