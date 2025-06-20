/**
 * Initialise les fonctionnalités après le chargement du DOM.
 * 
 * @event DOMContentLoaded
 * @description Configure la gestion de la déconnexion et ajoute un gestionnaire d'événement pour la recherche de livres.
 */
document.addEventListener("DOMContentLoaded", () => {
    configurerDeconnexion(); // Appelle la fonction qui gère la déconnexion de l'utilisateur

    const searchBtn = document.getElementById("search"); // Bouton de recherche
    const searchInput = document.getElementById("searchInput"); // Champ de saisie de la recherche

    /**
     * Gère le clic sur le bouton de recherche.
     * 
     * @event click
     * @description Redirige vers la page de catalogue avec le terme de recherche saisi.
     */
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim(); // Récupère et nettoie la valeur du champ
        if (query !== "") {
            // Redirige l'utilisateur vers la page de catalogue avec le paramètre de recherche
            window.location.href = `/catalogue?search=${encodeURIComponent(query)}`;
        }
    });
});

/**
 * Gère le chargement dynamique des derniers livres lors du chargement du DOM.
 * 
 * @event DOMContentLoaded
 * @description Récupère les derniers livres depuis l'API et met à jour dynamiquement leur affichage sur la page.
 */
document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("latest-arrivals"); // Conteneur des derniers livres
    // const container = document.querySelectorAll(".book-box")[1]; // Alternative : sélectionner le deuxième bloc de livres
    const booksDiv = container.querySelectorAll(".book-item-latest-arrival"); // Divs de chaque livre à mettre à jour

    try {
        // Requête vers l'API pour obtenir les derniers livres
        const res = await fetch('/api/latest-books');
        const livres = await res.json(); // Conversion de la réponse en JSON

        /**
         * Parcourt les livres reçus et met à jour les éléments DOM correspondants.
         * 
         * @param {Object} livre - Un livre contenant les propriétés `titre`, `couverture`, et `description`.
         * @param {number} index - L'indice du livre dans la liste (utilisé pour correspondre aux éléments DOM).
         */
        livres.forEach((livre, index) => {
            if (index < booksDiv.length) {
                booksDiv[index].querySelector("img").src = livre.couverture;
                booksDiv[index].querySelector("img").alt = livre.titre;
                booksDiv[index].querySelector("strong").innerText = livre.titre;
                booksDiv[index].querySelectorAll("p")[1].innerText = livre.description.slice(0, 200) + "...";
            }
        });
    } catch (err) {
        // Affiche une erreur en cas d'échec de la requête
        console.error("Erreur lors du chargement des livres :", err);
    }
});

/**
 * Sauvegarde un objet livre dans le localStorage sous la clé 'livreSelectionne'.
 *
 * @function sauvegarderLivreDansLocalStorage
 * @param {Object} livre - L'objet représentant le livre à sauvegarder (doit être sérialisable en JSON).
 * @returns {void}
 */
function sauvegarderLivreDansLocalStorage(livre) {
    localStorage.setItem('livreSelectionne', JSON.stringify(livre));
}

/**
 * Configure le bouton de déconnexion pour :
 * - Envoyer une requête de déconnexion au serveur.
 * - Réinitialiser le localStorage si la déconnexion est réussie.
 * - Rediriger l'utilisateur vers la page d'accueil.
 *
 * @function configurerDeconnexion
 * @returns {void}
 */
function configurerDeconnexion() {
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/logout');
                if (res.ok) {
                    localStorage.clear();
                    window.location.href = '/';
                }
            } catch (err) {
                console.error("Erreur de déconnexion :", err);
            }
        });
    }
}