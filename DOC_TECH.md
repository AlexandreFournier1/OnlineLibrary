# 📘 Documentation Technique – *The Online Library*

---

## 1. 🚀 Installation / Utilisation

Une fois sur la page principale, plusieurs options s’offrent à l’utilisateur :

- 🔐 **Se connecter**
- 🔎 **Rechercher un livre**
- 📚 **Accéder au catalogue**
- 🎬 **Choisir un des livres à l’affiche**

💡 **L’utilisateur peut naviguer librement** sur le site et consulter les livres sans être connecté.

Cependant, dès qu’il souhaite **emprunter un livre** ou **l’ajouter à son panier**, il devra **s’authentifier**.

Depuis la page **Profil**, l’utilisateur a accès à :

- 🧑‍💼 Ses informations de compte  
- ✏️ La modification de ses informations  
- 🛒 Son panier  
- 📖 Sa liste d’emprunts  

📌 **Le panier est accessible à tout moment**, peu importe où l’utilisateur se trouve sur le site.

Pour chaque livre, une **fiche détaillée** est disponible avec :

- 👤 Auteur  
- 🏷️ Genre  
- 📅 Date de sortie  
- 📄 Résumé  
- …etc.

---

## 2. 🛠️ Structure & Détails Techniques

### 🔐 Gestion des utilisateurs

- Les comptes utilisateurs sont sauvegardés dans un fichier `JSON`.
- Les mots de passe sont **cryptés**.

### 💾 Données dynamiques

- Le **panier** et les **emprunts** sont stockés dans une **base de données SQLite**.
- Les livres sont récupérés **dynamiquement** via l’API publique d’Open Library :  
  🌐 [https://openlibrary.org](https://openlibrary.org)

### 📌 Fichier principal de l'application

- Le **cœur** du projet se trouve dans le fichier **`server.js`**, qui initialise le serveur, configure les routes et établit la connexion à la base de données.

---

## 3. 📂 Arborescence du projet

```
📦 The Online Library
├── 🧱 middleware/
│ └── 🔐 authentification.js
│
├── 📁 node_modules/
│ └── 📦 dépendances Node.js
│
├── 🌐 public/
│ ├── 🎨 css/
│ │ ├── 📄 book_style.css
│ │ └── 📄 main_style.css
│ ├── 🖼️ img/
│ │ └── 🖼️ (images du site)
│ ├── 📜 js/
│ │ ├── 📄 api_book_script.js
│ │ ├── 📄 script.js
│ │ └── 📄 style.js
│ ├── 🗃️ old_catalogue.html
│ ├── 🗃️ old_choixTheme.html
│ ├── 🗃️ old_compte.html
│ ├── 🗃️ old_description.html
│ ├── 🗃️ old_loginRegister.html
│ └── 🗃️ old_panier.html
│
├── 🔁 routes/
│ ├── 📄 books.js
│ └── 📄 routes.js
│
├── 🧩 view/ (Templates Nunjucks)
│ ├── 🧱 partials/
│ │ └── 📄 header.njk
│ ├── 📄 base.njk
│ ├── 📄 book.njk
│ ├── 📄 catalogue.njk
│ ├── 📄 choixTheme.njk
│ ├── 📄 compte.njk
│ ├── 📄 description.njk
│ ├── 📄 index.njk
│ ├── 📄 loginRegister.njk
│ └── 📄 panier.njk
│
├── ⚙️ .env
├── 📄 .gitignore
├── 📄 package-lock.json
├── 📄 package.json
├── 🗃️ book.sqlite3
├── 📄 db.js
├── 📄 init-db.js
├── 🚀 server.js (Fichier principal)
├── 📄 user.json (Utilisateurs)
├── 📄 README.md
├── 📄 DOC_TECH.md
└── 📄 urlsite.md
```

---

### 🧭 Légende (emojis)

```
📦 Projet – 🧱 Dossier – 📄 Fichier – 🔐 Sécurité – 🌐 Web – 🎨 CSS – 📜 JS – 🖼️ Images – 🧩 Templates – 🗃️ Ancien fichier – 🚀 Principal – ⚙️ Config
```