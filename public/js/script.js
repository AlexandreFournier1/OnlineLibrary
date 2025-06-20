/**
 * @module public/js/script
 * @description Script principal pour la gestion des interactions utilisateur dans l'application.
 */

/**
 * Redirige l'utilisateur vers la page du panier.
 * @function panierRedirect
 * @returns {void}
 */
function panierRedirect() {
    window.location.href = '/panier';
}

/**
 * Redirige l'utilisateur vers la page du catalogue.
 * @function catalogueRedirect
 * @returns {void}
 */
function catalogueRedirect() {
    window.location.href = '/catalogue';
}

/**
 * Redirige l'utilisateur vers la page de son compte.
 * @function compteRedirect
 * @returns {void}
 */
function compteRedirect() {
    window.location.href = '/compte';
}

/**
 * Redirige l'utilisateur vers la page d'accueil.
 * @function homeRedirect
 * @returns {void}
 */
function homeRedirect() {
    window.location.href = '/';
}

/**
 * Vide le panier après confirmation de l'utilisateur.
 * Envoie une requête POST au serveur et recharge la page si l’opération réussit.
 * Affiche des messages d’erreur en cas d’échec.
 *
 * @async
 * @function viderPanier
 * @returns {Promise<void>}
 */
async function viderPanier() {
  if (!confirm("Voulez-vous vraiment vider votre panier ?")) return;

  try {
    const res = await fetch('/vider-panier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (res.ok) {
      alert("Panier vidé !");
      window.location.reload(); // Recharge la page pour mettre à jour la vue
    } else {
      const msg = await res.text();
      alert("Erreur : " + msg);
    }
  } catch (err) {
    console.error("Erreur réseau :", err);
    alert("Impossible de vider le panier.");
  }
}

/**
 * Envoie une requête pour réaliser l'emprunt des livres présents dans le panier.
 * Redirige vers la page de compte si l'emprunt est réussi.
 * Affiche un message d’erreur en cas d’échec ou si le panier est vide.
 *
 * @async
 * @function realiserEmprunt
 * @returns {Promise<void>}
 */
async function realiserEmprunt() {
    const livres = document.querySelectorAll('.book-item');

    if (livres.length === 0) {
        alert("Votre panier est vide !");
        return;
    }

    try {
        const res = await fetch('/emprunter-livres', {
            method: 'POST'
        });

        if (res.ok) {
            alert("Commande effectuée !");
            window.location.href = "/compte";
        } else {
            const error = await res.text();
            alert("Erreur : " + error);
        }
    } catch (err) {
        console.error("Erreur réseau :", err);
        alert("Erreur de communication avec le serveur.");
    }
}

/**
 * Script principal exécuté après le chargement complet du DOM.
 * Gère la connexion, l'inscription, la modification de profil, la déconnexion,
 * le changement de photo de profil, l'ajout d'un livre au panier
 * et l'affichage dynamique des délais de retour de livres.
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const editProfileButton = document.getElementById('confirmEditButton');
    const DisconnectButton = document.getElementById('DisconnectButton');
    const pdpUploadInput = document.getElementById('pdpUpload');
    const previewPDP = document.getElementById('previewPDP');
    const AjoutPanier = document.querySelector('.order-button');
    const retourElements = document.querySelectorAll('.retour');

    /**
     * Gère la soumission du formulaire de connexion.
     * Envoie les identifiants en POST au serveur et redirige si succès.
     */
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('usernameLogin').value;
            const password = document.getElementById('passwordLogin').value;

            const formData = { username, password };

            fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Login réussi') {
                    alert('Login réussi !');
                    compteRedirect();
                } else if (data.message === 'Identifiant ou Mot de Passe Incorrect') {
                    alert('Identifiant ou mot de passe incorrect!');
                } else {
                    alert('Erreur lors de la connexion : ' + data.message);
                }
            });
        });
    }

    /**
     * Gère la soumission du formulaire d'inscription.
     * Envoie les infos d'inscription en POST au serveur et redirige si succès.
     */
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('usernameRegister').value;
            const password = document.getElementById('passwordRegister').value;
            const email = document.getElementById('emailRegister').value;

            const formData = { username, password, email };

            fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Utilisateur créé') {
                    alert('Inscription réussie !');
                    compteRedirect();
                } else if (data.message === 'Utilisateur déjà existant') {
                    alert('Cet utilisateur existe déjà !');
                } else {
                    alert('Erreur lors de l\'inscription : ' + data.message);
                }
            });
        });
    }

    /**
     * Gère la mise à jour du profil utilisateur.
     * Valide le nom d'utilisateur, puis envoie une requête POST pour mise à jour.
     */
    if (editProfileButton) {
        editProfileButton.addEventListener('click', async (event) => {
            event.preventDefault();
            const username = document.getElementById('usernameEdit').value.trim();

            if (!username || username.length < 3) {
                alert("Veuillez entrer un nom d'utilisateur valide (au moins 3 caractères).");
                return;
            }

            try {
                const response = await fetch('/editProfile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });

                const data = await response.json();

                if (response.ok && data.message === 'Profil mis à jour') {
                    alert('Profil mis à jour !');
                    location.reload();
                } else {
                    alert(data.message || 'Une erreur est survenue.');
                }
            } catch (error) {
                alert('Erreur réseau : ' + error.message);
            }
        });
    }

    /**
     * Gère la déconnexion de l'utilisateur.
     * Fait un appel GET vers `/logout`, puis redirige vers l'accueil.
     */
    if (DisconnectButton) {
        DisconnectButton.addEventListener('click', (event) => {
            event.preventDefault();

            fetch('/logout', { method: 'GET' })
                .then(response => {
                    if (response.ok) {
                        alert('Déconnexion réussie !');
                        accueilRedirect();
                    } else {
                        alert('Erreur lors de la déconnexion');
                    }
                })
                .catch(error => {
                    console.error('Erreur lors de la déconnexion :', error);
                });
        });
    }

    /**
     * Gère l'upload de la photo de profil utilisateur.
     * Ouvre un sélecteur de fichier et envoie l'image au serveur.
     */
    if (previewPDP && pdpUploadInput) {
        previewPDP.addEventListener('click', () => {
            pdpUploadInput.click();
        });

        pdpUploadInput.addEventListener('change', () => {
            const file = pdpUploadInput.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('pdp', file);

            fetch('/uploadPDP', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('Photo de profil mise à jour !');
                    location.reload();
                } else {
                    alert('Erreur : ' + data.message);
                }
            })
            .catch(err => {
                console.error("Erreur FETCH :", err);
                alert("Erreur lors de l'envoi.");
            });
        });
    }

    /**
     * Gère l'ajout d'un livre au panier.
     * Récupère les données `isbn`, `titre` et `auteur` de l'attribut `data-*`,
     * puis les envoie en POST au serveur.
     */
    if (AjoutPanier) {
        AjoutPanier.addEventListener('click', async () => {
            const isbn = AjoutPanier.dataset.isbn;
            const titre = AjoutPanier.dataset.titre;
            const auteur = AjoutPanier.dataset.auteur;

            if (!isbn || !titre || !auteur) {
                alert("Données manquantes !");
                return;
            }

            try {
                const response = await fetch('/ajouter-au-panier', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isbn, titre, auteur })
                });

                if (response.ok) {
                    alert('Livre ajouté au panier !');
                    window.location.href = '/panier';
                } else if (response.status === 401) {
                    alert('Vous devez être connecté pour commander.');
                    window.location.href = '/login';
                } else {
                    const error = await response.text();
                    alert("Erreur : " + error);
                }
            } catch (err) {
                console.error("Erreur réseau :", err);
                alert("Erreur de communication avec le serveur.");
            }
        });
    }

    /**
     * Met à jour en temps réel le temps restant ou le retard pour chaque livre à retourner.
     * Utilise l'attribut `data-retour` pour calculer la différence avec la date actuelle.
     */
    function updateTimers() {
        const now = new Date();

        retourElements.forEach(el => {
            const retourStr = el.dataset.retour;
            const retourDate = new Date(retourStr);

            if (isNaN(retourDate)) {
                el.textContent = "Date invalide";
                return;
            }

            let diffMs = retourDate - now;

            const j = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
            const h = Math.floor((Math.abs(diffMs) / (1000 * 60 * 60)) % 24);
            const m = Math.floor((Math.abs(diffMs) / (1000 * 60)) % 60);
            const s = Math.floor((Math.abs(diffMs) / 1000) % 60);

            if (diffMs < 0) {
                el.textContent = `En retard de ${j}j ${h}h ${m}m ${s}s`;
                el.style.color = "red";
            } else {
                el.textContent = `${j}j ${h}h ${m}m ${s}s restants`;
            }
        });
    }

    /**
     * Lance la mise à jour des compteurs de retour si des éléments concernés sont présents.
     */
    if (retourElements.length > 0) {
        updateTimers();
        setInterval(updateTimers, 1000); // Actualise chaque seconde
    }
});