import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import nunjucks from 'nunjucks';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import multer from 'multer';
import { execSync } from 'child_process';

dotenv.config();
const app = express();
const PORT = process.env.PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vérifier et initialiser la base de données
const dbPath = path.resolve(__dirname, 'book.sqlite3');

if (!fs.existsSync(dbPath)) {
  console.log("📁 Base absente, création avec init-db.js...");
  try {
    execSync('node init-db.js', { stdio: 'inherit' });
  } catch (err) {
    console.error("❌ Erreur lors de la création :", err.message);
    process.exit(1);
  }

  const waitForFile = (filePath, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (fs.existsSync(filePath)) return resolve();
        if (Date.now() - start > timeoutMs) return reject(new Error("Fichier non trouvé"));
        setTimeout(check, 100);
      };
      check();
    });

  try {
    await waitForFile(dbPath);
    console.log("✅ Base prête.");
  } catch (err) {
    console.error("⛔ Timeout d'attente :", err.message);
    process.exit(1);
  }
}

// ✅ Importer dynamiquement la base
const { default: db } = await import('./db.js');
const routes = (await import('./routes/routes.js')).default;
const booksRouter = (await import('./routes/books.js')).default;
const authentification = (await import('./middleware/authentification.js')).default;

// Configuration du moteur de template
nunjucks.configure('view', {
    autoescape: true,
    express: app,
    watch: true
});

app.use(express.static(path.join(path.resolve(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/books', booksRouter);


const SESSION_SECRET = process.env.SESSION_SECRET || 'c"estSecret';


app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 10, // 10 minutes
            secure: false, // true si HTTPS
            httpOnly: true, // accessible uniquement par le serveur
        },
    })
);

// Utilisation des routes
app.use('/', routes);

app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});


/**
 * Route POST pour la connexion d'un utilisateur.
 * 
 * Récupère le nom d'utilisateur et le mot de passe depuis le corps de la requête,
 * vérifie si l'utilisateur existe dans le fichier JSON local 'user.json',
 * puis compare le mot de passe fourni avec le mot de passe haché stocké.
 * Si les identifiants sont corrects, initialise la session utilisateur.
 * Sinon, renvoie une erreur 401 (non autorisé).
 * 
 * @name POST /login
 * @function
 * @param {Request} req - Objet requête Express
 * @param {Response} res - Objet réponse Express
 * 
 * @returns {void} Envoie une réponse JSON indiquant succès ou échec de la connexion.
 */
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Chemin vers le fichier JSON contenant les utilisateurs
    const filePath = path.join(__dirname, 'user.json');
    
    let userList = [];

    // Vérifie si le fichier existe, puis le lit et parse la liste des utilisateurs
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        if (data.trim()) {
            userList = JSON.parse(data);
        }
    }

    // Recherche l'utilisateur correspondant au nom d'utilisateur fourni
    const userFound = userList.find(user => user.username === username);

    // Si utilisateur non trouvé ou mot de passe incorrect, renvoie une erreur 401
    if (!userFound || !(await bcrypt.compare(password, userFound.password))) {
        return res.status(401).json({ message: 'Identifiant ou Mot de Passe Incorrect' });
    }

    // Initialisation de la session avec les informations utilisateur
    req.session.user = {
        username: userFound.username,
        email: userFound.email,
        created_date: userFound.created_date,
        ImgProfil: userFound.ImgProfil
    };

    // Réponse JSON pour confirmer la connexion réussie
    res.json({ message: 'Login réussi' });
});

/**
 * Route POST pour l'enregistrement (inscription) d'un nouvel utilisateur.
 * 
 * Cette route récupère les informations d'inscription (username, password, email)
 * depuis le corps de la requête, vérifie si le nom d'utilisateur existe déjà dans 
 * le fichier JSON local 'user.json'. Si l'utilisateur n'existe pas, le mot de passe
 * est haché, un nouvel utilisateur est créé et ajouté à la liste, puis sauvegardé.
 * La session est initialisée avec les données utilisateur.
 * 
 * @name POST /register
 * @function
 * @param {Request} req - Objet requête Express
 * @param {Response} res - Objet réponse Express
 * 
 * @returns {void} Envoie une réponse JSON indiquant succès ou échec de la création.
 */
app.post('/register', async (req, res) => {
    console.log('Register route hit'); // Ligne de debug pour indiquer que la route est appelée

    const { username, password, email } = req.body;

    // Chemin vers le fichier JSON contenant les utilisateurs
    const filePath = path.join(__dirname, 'user.json');

    let userList = [];

    // Vérifie si le fichier existe et n'est pas vide, puis parse la liste des utilisateurs
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        if (data.trim()) {
            userList = JSON.parse(data);
        }
    } else {
        // Crée le fichier vide s'il n'existe pas encore
        fs.writeFileSync(filePath, JSON.stringify([]));
    }

    // Recherche si un utilisateur avec le même nom existe déjà
    const userFound = userList.find(user => user.username === username);

    // Si l'utilisateur existe déjà, renvoie un statut 409 (conflit)
    if (userFound) {
        return res.status(409).json({ message: 'Utilisateur déjà existant' });
    }

    // Hachage du mot de passe avec bcrypt (10 rounds de sel)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Formate la date de création au format français (jj/mm/aaaa)
    const formattedDate = new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    });

    // Création de l'objet utilisateur à sauvegarder
    const newUser = {
        username,
        password: hashedPassword,
        email,
        created_date: formattedDate,
        ImgProfil: "/img/maison.jpg" // Image de profil par défaut
    };

    // Ajoute le nouvel utilisateur à la liste
    userList.push(newUser);

    // Sauvegarde la liste mise à jour dans le fichier JSON
    fs.writeFileSync(filePath, JSON.stringify(userList, null, 2));

    // Initialise la session utilisateur avec les données essentielles
    req.session.user = {
        username,
        email,
        created_date: formattedDate,
        ImgProfil: "/img/user.jpeg" // Image de profil dans la session (différente de celle sauvegardée)
    };
    
    // Envoie la réponse JSON confirmant la création de l'utilisateur
    res.json({ message: 'Utilisateur créé' });
});

/**
 * Route POST pour la modification du profil utilisateur.
 * 
 * Cette route permet à un utilisateur authentifié de modifier son nom d'utilisateur.
 * Elle vérifie la validité du nouveau nom, s'assure qu'il n'est pas déjà pris,
 * met à jour le fichier JSON local des utilisateurs, renomme l'image de profil si besoin,
 * et met à jour la session.
 * 
 * @name POST /editProfile
 * @function
 * @param {Request} req - Objet requête Express
 * @param {Response} res - Objet réponse Express
 * @param {Function} authentification - Middleware vérifiant l'authentification
 * 
 * @returns {void} Envoie une réponse JSON indiquant succès ou erreur de la mise à jour.
 */
app.post('/editProfile', authentification, async (req, res) => {
    const { username } = req.body;
    const filePath = path.join(__dirname, 'user.json');

    // Validation basique du nouveau nom d'utilisateur
    if (!username || username.length < 3) {
        return res.status(400).json({ message: 'Nom d\'utilisateur invalide' });
    }

    let userList = [];
    // Lecture du fichier user.json si existant et non vide
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        if (data.trim()) {
            userList = JSON.parse(data);
        }
    }

    // Récupération du nom d'utilisateur actuel depuis la session
    const currentUsername = req.session.user.username;

    // Vérification si le nouveau nom d'utilisateur est déjà utilisé par un autre
    const existingUser = userList.find(u => u.username === username);
    if (existingUser && username !== currentUsername) {
        return res.status(409).json({ message: 'Utilisateur déjà existant' });
    }

    // Recherche de l'utilisateur courant dans la liste
    const currentUser = userList.find(u => u.username === currentUsername);
    if (!currentUser) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Gestion du renommage du fichier image de profil lié au nom d'utilisateur
    const imageFolder = path.join(__dirname, 'public', 'img', 'UserPDP');
    const oldImage = fs.readdirSync(imageFolder).find(f => f.startsWith(currentUsername));
    if (oldImage) {
        const ext = path.extname(oldImage);
        const oldPath = path.join(imageFolder, oldImage);
        const newPath = path.join(imageFolder, `${username}${ext}`);

        try {
            // Renommage du fichier image
            fs.renameSync(oldPath, newPath);
            // Mise à jour du chemin d'image dans l'objet utilisateur
            currentUser.ImgProfil = `/img/UserPDP/${username}${ext}`;
        } catch (err) {
            console.error("Erreur lors du renommage de l'image :", err);
        }
    }

    // Mise à jour du nom d'utilisateur dans l'objet utilisateur
    currentUser.username = username;

    // Sauvegarde de la liste d'utilisateurs modifiée dans user.json
    fs.writeFileSync(filePath, JSON.stringify(userList, null, 2));

    // Mise à jour des données utilisateur dans la session active
    req.session.user.username = username;
    if (currentUser.ImgProfil) {
        req.session.user.ImgProfil = currentUser.ImgProfil;
    }

    // Réponse JSON indiquant que la mise à jour est terminée
    res.json({ message: 'Profil mis à jour' });
});


/**
 * Route GET pour la déconnexion (logout) de l'utilisateur.
 * 
 * Cette route nécessite une authentification préalable (middleware `authentification`).
 * Elle détruit la session en cours, supprime le cookie de session côté client,
 * et renvoie une réponse JSON indiquant le succès ou l'échec de la déconnexion.
 * 
 * @name GET /logout
 * @function
 * @param {Request} req - Objet requête Express
 * @param {Response} res - Objet réponse Express
 * @param {Function} authentification - Middleware vérifiant que l'utilisateur est authentifié
 * 
 * @returns {void} Envoie une réponse JSON confirmant la déconnexion ou une erreur serveur.
 */
app.get('/logout', authentification, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erreur destroy session:', err);
            return res.status(500).json({ message: 'Erreur lors de la déconnexion' });
        }
        // Suppression du cookie de session côté client
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout réussi' });
    });
});


const USERS_FILE = path.join(__dirname, 'user.json');

const storage = multer.diskStorage({
    /**
     * Définit le dossier de destination pour les fichiers uploadés.
     * Crée le dossier s'il n'existe pas.
     * 
     * @param {Request} req - Objet requête Express
     * @param {Express.Multer.File} file - Fichier uploadé
     * @param {function(Error|null, string)} cb - Callback avec chemin destination
     */
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, 'public', 'img', 'UserPDP');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    /**
     * Définit le nom du fichier uploadé.
     * Supprime l'ancienne image de profil si elle existe pour l'utilisateur.
     * 
     * @param {Request} req - Objet requête Express
     * @param {Express.Multer.File} file - Fichier uploadé
     * @param {function(Error|null, string)} cb - Callback avec nom du fichier
     */
    filename: (req, file, cb) => {
        const username = req.session.user?.username || 'defaultUser';
        const ext = path.extname(file.originalname);
        const destFolder = path.join(__dirname, 'public', 'img', 'UserPDP');

        try {
            const files = fs.readdirSync(destFolder);
            files.forEach(f => {
                if (f.startsWith(username)) {
                    fs.unlinkSync(path.join(destFolder, f));
                }
            });
        } catch (err) {
            console.error("Erreur lors de la suppression de l'ancienne image :", err);
        }

        cb(null, `${username}${ext}`);
    }
});

const upload = multer({ storage });

/**
 * Route POST pour uploader une nouvelle image de profil utilisateur.
 * Le fichier est stocké sur le serveur, le chemin mis à jour dans user.json et dans la session.
 * 
 * @name POST /uploadPDP
 * @function
 * @param {Request} req - Objet requête Express
 * @param {Response} res - Objet réponse Express
 * 
 * @returns {void} Envoie une réponse JSON indiquant le succès ou l'échec de l'opération.
 */
app.post('/uploadPDP', upload.single('pdp'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
    }

    const username = req.session.user.username;
    const ext = path.extname(req.file.originalname);
    const imagePath = `/img/UserPDP/${username}${ext}`;

    fs.readFile(USERS_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false, message: 'Erreur lecture user.json.' });

        let users;
        try {
            users = JSON.parse(data);
        } catch {
            return res.status(500).json({ success: false, message: 'Fichier utilisateur corrompu.' });
        }

        const user = users.find(u => u.username === username);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
        }

        user.ImgProfil = imagePath;

        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Erreur écriture user.json.' });

            req.session.user.ImgProfil = imagePath;
            return res.json({ success: true, path: imagePath });
        });
    });
});

/**
 * Route POST pour ajouter un livre au panier d'un utilisateur connecté.
 * Nécessite une authentification préalable via le middleware `authentification`.
 * 
 * @name POST /ajouter-au-panier
 * @function
 * @param {Request} req - Objet requête Express, doit contenir dans `req.body` les propriétés `isbn`, `titre`, `auteur`.
 * @param {Response} res - Objet réponse Express.
 * 
 * @returns {void} Envoie une réponse HTTP selon le succès ou l'erreur rencontrée.
 */
app.post('/ajouter-au-panier', authentification, (req, res) => {
  const user = req.session.user;
  const { isbn, titre, auteur } = req.body;

  // Vérifie la présence des données nécessaires
  if (!isbn || !titre || !auteur) {
    return res.status(400).send("Données incomplètes");
  }

  // Ajoute l'utilisateur dans la base de données (si pas déjà présent)
  db.addUser(user.username, (err) => {
    if (err) return res.status(500).send("Erreur utilisateur");

    // Ajoute le livre à la base de données
    db.addBook({ NumISBN: isbn, Title: titre, Author: auteur }, (err2) => {
        if (err2) {
            console.error("💥 Erreur SQL (ajout livre) :", err2.message);
            return res.status(500).send("Erreur ajout livre");
        }

        // Ajoute le livre au panier de l'utilisateur
        db.addToPanier(isbn, user.username, (err3) => {
          if (err3) return res.status(500).send("Erreur panier");

          // Succès : envoie un message OK
          res.status(200).send("Ajout OK");
        });
    });
  });
});

/**
 * Route POST pour emprunter tous les livres présents dans le panier de l'utilisateur connecté.
 * Nécessite une authentification préalable via le middleware `authentification`.
 * 
 * Pour chaque livre dans le panier :
 * - crée un emprunt avec une durée de 7 jours à partir d'aujourd'hui,
 * - supprime le livre du panier.
 * 
 * Envoie une réponse HTTP indiquant le succès ou une erreur si une opération a échoué.
 * 
 * @name POST /emprunter-livres
 * @function
 * @param {Request} req - Objet requête Express, contient la session utilisateur.
 * @param {Response} res - Objet réponse Express.
 * @returns {void}
 */
app.post('/emprunter-livres', authentification, (req, res) => {
    const username = req.session.user?.username;
    if (!username) return res.status(401).send("Non autorisé");

    db.getPanierByUser(username, (err, livres) => {
        if (err) return res.status(500).send("Erreur récupération panier");

        const aujourdHui = new Date();
        const dateEmprunt = aujourdHui.toISOString().split('T')[0];
        const dateRetour = new Date(aujourdHui.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let erreurs = false;

        livres.forEach(livre => {
            db.addEmprunt(livre.NumISBN, username, dateEmprunt, dateRetour, (errInsert) => {
                if (errInsert) {
                    console.error("Erreur ajout emprunt :", errInsert.message);
                    erreurs = true;
                } else {
                    db.removeFromPanier(livre.NumISBN, username, (errDelete) => {
                        if (errDelete) {
                            console.error("Erreur suppression panier :", errDelete.message);
                            erreurs = true;
                        }
                    });
                }
            });
        });

        // Attend un court délai avant de répondre, pour permettre la fin des opérations asynchrones
        setTimeout(() => {
            if (erreurs) {
                return res.status(500).send("Une ou plusieurs erreurs ont eu lieu.");
            }
            return res.status(200).send("Emprunt réalisé !");
        }, 300);
    });
});


/**
 * Route POST pour vider le panier de l'utilisateur connecté.
 * Nécessite une authentification préalable via le middleware `authentification`.
 * 
 * Supprime tous les livres du panier associé à l'utilisateur.
 * Envoie une réponse HTTP selon le succès ou l'erreur rencontrée.
 * 
 * @name POST /vider-panier
 * @function
 * @param {Request} req - Objet requête Express, contient la session utilisateur.
 * @param {Response} res - Objet réponse Express.
 * @returns {void}
 */
app.post('/vider-panier', authentification, (req, res) => {
  const username = req.session.user?.username;

  if (!username) return res.status(401).send("Non autorisé");

  db.clearPanierForUser(username, (err) => {
    if (err) {
      console.error("Erreur vidage panier :", err.message);
      return res.status(500).send("Erreur lors du vidage du panier");
    }
    res.status(200).send("Panier vidé");
  });
});