
// Bandera para evitar bucles infinitos
let isTranslating = false;

document.addEventListener("DOMContentLoaded", function () {
    // Función para esperar a que el elemento esté disponible
    function waitForElement(selector, callback) {
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect(); // Detener el observer
                callback(element); // Llamar al callback con el elemento encontrado
            }
        });

        // Configurar el observer para observar el cuerpo del documento
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Uso de la función
    waitForElement('.LanguageSelect', (languageSelect) => {
        // Carga el idioma seleccionado, o el idioma del navegador si no hay ninguno guardado
        var storedLanguage = localStorage.getItem('selectedLanguage')
        if (!storedLanguage) {
            storedLanguage = navigator.language.slice(0, 2);
            localStorage.setItem('selectedLanguage', storedLanguage);
        }
        languageSelect.value = storedLanguage;

        // Llama a la función translate con el idioma seleccionado
        translate(storedLanguage);

        // Agrega un evento al cambio de idioma
        languageSelect.addEventListener("change", function () {
            var selectedValue = languageSelect.value;
            translate(selectedValue);
            // guarda el idioma en localStorage
            localStorage.setItem('selectedLanguage', selectedValue);
        });

        // Configura el MutationObserver para detectar cambios en el DOM
        const observer = new MutationObserver(() => {
            if (!isTranslating) {
                translate(languageSelect.value); // Vuelve a traducir cada vez que hay un cambio
            }
        });

        // Observa el cuerpo del documento para cambios en hijos y atributos
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['es-translation', 'en-translation']
        });
    });
});


// Función para traducir el contenido de la página
function translate(language) {
    console.log("Selected language: " + language);
    isTranslating = true; // Marca el inicio de la traducción

    var elementsToTranslate = document.querySelectorAll('*[es-translation], *[en-translation]:not(script):not(style)');

    elementsToTranslate.forEach(function (element) {
        let translatedText;
        if (language === "es") {
            translatedText = element.getAttribute("es-translation");
            // Si hay traducción, se guarda en es-translation y se elimina en-translation
            if (translatedText) {
                placeholder = element.getAttribute("placeholder")
                if (placeholder) {
                    element.setAttribute("en-translation", placeholder);
                    element.removeAttribute("es-translation");
                    element.setAttribute("placeholder", translatedText);
                } else {
                    element.setAttribute("en-translation", element.innerHTML);
                    element.removeAttribute("es-translation");
                    element.innerHTML = translatedText; // Actualiza el contenido del elemento
                }
            }
        } else if (language === "en") {
            translatedText = element.getAttribute("en-translation");
            // Si hay traducción, se guarda en en-translation y se elimina es-translation
            if (translatedText) {
                placeholder = element.getAttribute("placeholder")
                if (placeholder) {
                    element.setAttribute("es-translation", placeholder);
                    element.removeAttribute("en-translation");
                    element.setAttribute("placeholder", translatedText);
                } else {
                    element.setAttribute("es-translation", element.innerHTML);
                    element.removeAttribute("en-translation");
                    element.innerHTML = translatedText; // Actualiza el contenido del elemento
                }
            }
        }
    });

    document.documentElement.lang = language; // Cambia el idioma del documento
    isTranslating = false; // Marca el fin de la traducción
}

//Repeat set language for 2 seconds (page loading)
const interval = setInterval(function() {
    translate(localStorage.getItem('selectedLanguage'));
}, 50);

setTimeout(function() {
    clearInterval(interval);
}, 2000);
