/**
 * @module style.js
 * @description Gère les interactions dynamiques de l'interface utilisateur, notamment les formulaires de connexion, d'inscription et d'édition de profil.
 */

/**
 * Gère les comportements dynamiques de l'interface utilisateur après le chargement du DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");

    const loginForm = document.querySelector(".login-form");
    const registerForm = document.querySelector(".register-form");
    const closeBtns = document.querySelectorAll(".close-btn");

    const editProfileButton = document.getElementById("editProfileButton");
    const usernameEditForm = document.querySelector(".edit-profile-container");
    const confirmEditButton = document.getElementById("confirmEditButton");
    const closeEditBtn = document.querySelector(".edit-profile-container .close-btn");

    /**
     * Affiche ou cache un formulaire de manière animée, tout en masquant ou affichant le bouton associé.
     * @param {HTMLElement} form - Le formulaire à afficher ou cacher.
     * @param {HTMLElement} button - Le bouton à cacher ou afficher selon l'état du formulaire.
     */
    function toggleForm(form, button) {
        if (form.classList.contains("active")) {
            form.classList.remove("active");
            form.style.maxHeight = null;
            setTimeout(() => {
                form.style.padding = "0";
                button.style.display = "block";
            }, 300);
        } else {
            loginForm.classList.remove("active");
            registerForm.classList.remove("active");

            loginForm.style.maxHeight = null;
            registerForm.style.maxHeight = null;

            loginForm.style.padding = "0";
            registerForm.style.padding = "0";

            loginBtn.style.display = "block";
            registerBtn.style.display = "block";

            form.classList.add("active");
            form.style.maxHeight = form.scrollHeight + "px";
            form.style.padding = "20px";

            button.style.display = "none";
        }
    }

    // Gestion du clic sur le bouton de connexion
    if (loginBtn) {
        loginBtn.addEventListener("click", () => toggleForm(loginForm, loginBtn));
    }

    // Gestion du clic sur le bouton d'inscription
    if (registerBtn) {
        registerBtn.addEventListener("click", () => toggleForm(registerForm, registerBtn));
    }

    // Gestion du clic sur les boutons de fermeture des formulaires
    closeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const form = btn.closest("form");
            if (form.classList.contains("login-form")) {
                loginBtn.style.display = "block";
            } else if (form.classList.contains("register-form")) {
                registerBtn.style.display = "block";
            }
            toggleForm(form);
        });
    });

    /**
     * Affiche ou masque le formulaire d'édition de profil avec une animation fluide.
     * Ferme également les formulaires login/register s'ils sont ouverts.
     */
    function toggleEditProfileForm() {
        const isActive = usernameEditForm.classList.contains("active");
        console.log("isActive", isActive);

        if (isActive) {
            usernameEditForm.classList.remove("active");
            usernameEditForm.style.maxHeight = null;
            setTimeout(() => {
                usernameEditForm.style.padding = "0";
                editProfileButton.style.display = "block";
            }, 300);
        } else {
            usernameEditForm.classList.add("active");
            usernameEditForm.style.maxHeight = usernameEditForm.scrollHeight + "px";
            usernameEditForm.style.padding = "10px 0";
            editProfileButton.style.display = "none";

            if (loginForm && loginForm.classList.contains("active")) {
                toggleForm(loginForm, loginBtn);
            }
            if (registerForm && registerForm.classList.contains("active")) {
                toggleForm(registerForm, registerBtn);
            }
        }
    }

    // Gestion du clic sur le bouton "Modifier le profil"
    if (editProfileButton) {
        editProfileButton.addEventListener("click", toggleEditProfileForm);
    }

    // Gestion de la confirmation d'édition du profil
    if (confirmEditButton) {
        confirmEditButton.addEventListener("click", () => {
            const newUsername = document.getElementById("usernameEdit").value;
            console.log("Nouveau nom d'utilisateur :", newUsername);
            // TODO: Envoyer la donnée au serveur (e.g. via fetch)

            toggleEditProfileForm();
        });
    }

    // Gestion du clic sur la croix pour fermer le formulaire d'édition
    if (closeEditBtn) {
        closeEditBtn.addEventListener("click", () => {
            usernameEditForm.classList.remove("active");
            usernameEditForm.style.maxHeight = null;
            setTimeout(() => {
                usernameEditForm.style.padding = "0";
                editProfileButton.style.display = "block";
            }, 300);
        });
    }
});