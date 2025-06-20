/**
 * @module routes/routes.js
 * @description Routes principales de l'application, gérant l'affichage des livres, du panier, du compte utilisateur, et des thèmes.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authentification from '../middleware/authentification.js';
import fetch from 'node-fetch';
import db from '../db.js'
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Récupère les noms des auteurs depuis l'API OpenLibrary à partir d'une liste d'objets auteurs.
 *
 * @async
 * @function
 * @param {Array<Object>} authors - Tableau d'objets contenant des informations sur les auteurs.
 * @param {Object} authors[].author - Objet contenant une clé de l'auteur.
 * @param {string} authors[].author.key - Clé d'URL pour accéder à l'auteur (ex: "/authors/OL123456A").
 * @returns {Promise<string>} Une promesse résolue contenant les noms des auteurs concaténés par une virgule. 
 */
async function getAuthorNames(authors) {
  return await Promise.all(
    authors.map(async (authorObj) => {
      try {
        const res = await fetch(`https://openlibrary.org${authorObj.author.key}.json`);
        const data = await res.json();
        return data.name;
      } catch {
        return "Auteur inconnu";
      }
    })
  ).then(names => names.join(", "));
}

/**
 * Récupère les livres les plus récemment publiés depuis l'API OpenLibrary.
 *
 * @async
 * @function
 * @param {number} [limit=3] - Le nombre maximum de livres à retourner (par défaut 3).
 * @returns {Promise<Array<Object>>} Une promesse résolue contenant un tableau d'objets représentant les livres.
 *
 * @throws {Error} Si la requête échoue ou si la réponse n'est pas au format JSON.
 */
async function fetchLatestBooks(limit = 3) {
  try {
    const response = await fetch('https://openlibrary.org/search.json?q=the&limit=50', {
      headers: {
        'User-Agent': 'MyBookApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error("Réponse inattendue (HTML probablement) :", text.slice(0, 300));
      throw new Error("La réponse n'est pas du JSON !");
    }

    const data = await response.json();

    const sorted = data.docs
      .filter(b => b.first_publish_year && b.key?.startsWith("/works/"))
      .sort((a, b) => b.first_publish_year - a.first_publish_year)
      .slice(0, limit);

    return await Promise.all(sorted.map(async (book) => {
      let description = "Description non disponible";

      if (book.key) {
        const workUrl = `https://openlibrary.org${book.key}.json`;
        try {
          const workResponse = await fetch(workUrl);
          if (workResponse.ok) {
            const workData = await workResponse.json();
            description = typeof workData.description === "string"
              ? workData.description
              : workData.description?.value || description;
          }
        } catch (e) {
          console.error(`Erreur pour ${workUrl}`, e);
        }
      }

      return {
        id: book.key.split("/").pop(),
        titre: book.title,
        auteur: book.author_name ? book.author_name.join(", ") : "Auteur inconnu",
        annee: book.first_publish_year,
        couverture: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : process.env.DEFAULT_BOOK_COVER,
        description
      };
    }));
  } catch (err) {
    console.error("Erreur dans fetchLatestBooks:", err);
    throw err;
  }
}

/**
 * Récupère les livres les plus populaires depuis l'API OpenLibrary,
 * en se basant sur le nombre d'éditions disponibles comme indicateur de popularité.
 *
 * @async
 * @function
 * @param {number} [limit=3] - Le nombre maximum de livres à retourner (par défaut 3).
 * @returns {Promise<Array<Object>>} Une promesse résolue avec un tableau d'objets contenant les informations sur les livres populaires.
 *
 * @throws {Error} En cas de réponse HTTP invalide, d'erreur de parsing JSON, ou de problème de connexion.
 */
async function fetchPopularBooks(limit = 3) {
  try {
    const response = await fetch('https://openlibrary.org/search.json?q=bestseller&limit=50', {
      headers: {
        'User-Agent': 'MyBookApp/1.0'
      }
    });

    if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error("Réponse inattendue :", text.slice(0, 300));
      throw new Error("La réponse n'est pas du JSON !");
    }

    const data = await response.json();

    // Tri par nombre d'éditions comme indicateur de popularité
    const sorted = data.docs
      .filter(b => b.edition_count && b.key?.startsWith("/works/"))
      .sort((a, b) => b.edition_count - a.edition_count)
      .slice(0, limit);

    return await Promise.all(sorted.map(async (book) => {
      let description = "Description non disponible";

      if (book.key) {
        try {
          const workResponse = await fetch(`https://openlibrary.org${book.key}.json`);
          if (workResponse.ok) {
            const workData = await workResponse.json();
            description = typeof workData.description === "string"
              ? workData.description
              : workData.description?.value || description;
          }
        } catch (e) {
          console.error(`Erreur fetch work pour ${book.key}:`, e);
        }
      }

      return {
        id: book.key.split("/").pop(),
        titre: book.title,
        auteur: book.author_name ? book.author_name.join(", ") : "Auteur inconnu",
        annee: book.first_publish_year,
        couverture: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : process.env.DEFAULT_BOOK_COVER,
        description
      };
    }));
  } catch (err) {
    console.error("Erreur dans fetchPopularBooks:", err);
    throw err;
  }
}

/**
 * Route GET /theme
 * Affiche la page de sélection du thème visuel de l'utilisateur.
 *
 * @route GET /theme
 * @param {Request} req - Objet de requête Express, utilise `req.session.user.ImgProfil` si disponible.
 * @param {Response} res - Objet de réponse Express, rend la vue 'choixTheme.njk'.
 */
router.get('/theme', (req, res) => {
  res.render('choixTheme.njk', {
    profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg'
  });
});

/**
 * Route GET /
 * Affiche la page d'accueil avec les livres récents et populaires.
 *
 * @route GET /
 * @param {Request} req - Objet de requête Express, utilise `req.session.user.ImgProfil` si disponible.
 * @param {Response} res - Objet de réponse Express, rend la vue 'index.njk' avec les livres récupérés.
 *
 * @async
 */
router.get('/', async (req, res) => {
  const profileImage = req.session?.user?.ImgProfil || '/img/user.jpeg';

  try {
    const [latestBooks, popularBooks] = await Promise.all([
      fetchLatestBooks(3),
      fetchPopularBooks(3)
    ]);

    res.render('index.njk', {
      showHomeLink: true,
      showLoginLink: true,
      showPanierLink: true,
      profileImage,
      latestBooks,
      popularBooks
    });
  } catch (error) {
    console.error("Erreur lors du fetch des livres :", error);
    res.render('index.njk', {
      showHomeLink: true,
      showLoginLink: true,
      showPanierLink: true,
      profileImage,
      latestBooks: [],
      popularBooks: []
    });
  }
});

/**
 * Route GET /api/latest-books
 * Fournit une réponse JSON contenant les derniers livres.
 *
 * @route GET /api/latest-books
 * @param {Request} req - Objet de requête Express.
 * @param {Response} res - Objet de réponse Express. Retourne les livres récents ou un code d'erreur.
 *
 * @async
 */
router.get('/api/latest-books', async (req, res) => {
  try {
    const livres = await fetchLatestBooks(3);
    res.json(livres);
  } catch (err) {
    res.status(500).json({ error: "Erreur de récupération des livres." });
  }
});


/**
 * Route GET /compte
 * Affiche la page compte de l'utilisateur connecté, avec ses livres dans le panier et ses emprunts.
 * Nécessite une authentification préalable.
 * 
 * @name GET /compte
 * @function
 * @param {Request} req - Objet requête Express, contient la session utilisateur.
 * @param {Response} res - Objet réponse Express, utilisé pour envoyer la vue ou une redirection.
 * @param {Function} authentification - Middleware d'authentification, vérifie que l'utilisateur est connecté.
 * 
 * @returns {void}
 */
router.get('/compte', authentification, async (req, res) => {
  const user = req.session.user;
  const username = user?.username;
  if (!username) return res.redirect('/loginRegister');

  /**
   * Calcule le temps restant ou le retard par rapport à une date de retour.
   *
   * @param {string} dateRetourStr - Date de retour au format ISO ou similaire.
   * @returns {string} Texte indiquant le temps restant (ex: "2j 3h 15m 20s restants") 
   *                   ou le retard (ex: "En retard de 0j 1h 5m 0s").
   */
  function calculerTempsRestant(dateRetourStr) {
    const maintenant = new Date();
    const dateRetour = new Date(dateRetourStr);
    let diffMs = dateRetour - maintenant;

    if (diffMs < 0) {
      const retardMs = Math.abs(diffMs);
      const jours = Math.floor(retardMs / (1000 * 60 * 60 * 24));
      const heures = Math.floor((retardMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((retardMs / (1000 * 60)) % 60);
      const secondes = Math.floor((retardMs / 1000) % 60);
      return `En retard de ${jours}j ${heures}h ${minutes}m ${secondes}s`;
    }

    const jours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const heures = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const secondes = Math.floor((diffMs / 1000) % 60);

    return `${jours}j ${heures}h ${minutes}m ${secondes}s restants`;
  }


  // Récupère les livres dans le panier de l'utilisateur depuis la base de données
  db.getPanierByUser(username, async (err, livres) => {
    if (err) {
      console.error("Erreur récupération panier :", err.message);
      return res.status(500).send("Erreur serveur.");
    }

    /**
     * Transforme chaque livre du panier en objet enrichi avec une image provenant de l'API Open Library.
     * @type {Promise<Array<Object>>}
     */
    const panierLivres = await Promise.all(livres.map(async livre => {
      const id = livre.NumISBN;
      let image = "/img/default-book.png";

      try {
        const apiRes = await fetch(`https://openlibrary.org/works/${id}.json`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.covers?.length) {
            image = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
          }
        }
      } catch (apiErr) {
        console.warn(`Erreur API pour ${id}`, apiErr.message);
      }

      return {
        id,
        titre: livre.Title,
        auteur: livre.Author,
        image,
        dateRetour: livre.DateRetour,
        lienDescription: `/descriptionLivre/${id}`
      };
    }));

    // Récupère les emprunts de l'utilisateur depuis la base de données
    db.getEmpruntsByUser(username, async (err2, emprunts) => {
      if (err2) {
        console.error("Erreur récupération emprunts :", err2.message);
        return res.status(500).send("Erreur serveur.");
      }

      /**
       * Transforme chaque emprunt en objet enrichi avec image et temps restant.
       * @type {Promise<Array<Object>>}
       */
      const empruntsFormates = await Promise.all(emprunts.map(async e => {
        let image = "/img/default-book.png";

        try {
          const apiRes = await fetch(`https://openlibrary.org/works/${e.NumISBN}.json`);
          if (apiRes.ok) {
            const data = await apiRes.json();
            if (data.covers?.length) {
              image = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
            }
          }
        } catch (err) {
          console.warn(`Erreur API pour emprunt ${e.NumISBN}`, err.message);
        }

        return {
          titre: e.Title,
          auteur: e.Author,
          image,
          dateRetour: e.DateRetour,
          tempsRestant: calculerTempsRestant(e.DateRetour)
        };
      }));

      // Rend la page 'compte.njk' avec les données utilisateur, panier, emprunts, et options d'affichage
      res.render('compte.njk', {
        user,
        panierLivres,
        emprunts: empruntsFormates,
        showHomeLink: true,
        showLoginLink: false,
        showPanierLink: true,
        profileImage: user.ImgProfil || '/img/user.jpeg'
      });
    });
  });
});

/**
 * Route GET /loginRegister
 * Affiche la page de connexion et d'enregistrement.
 * 
 * @name GET /loginRegister
 * @function
 * @param {Request} req - Objet requête Express, contenant la session utilisateur.
 * @param {Response} res - Objet réponse Express, utilisé pour rendre la vue.
 * 
 * @returns {void}
 */
router.get('/loginRegister', (req, res) => {
  res.render('loginRegister.njk', {
    showHomeLink: true,
    showLoginLink: false,
    showPanierLink: true,
    profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg'  
  });
});

/**
 * Route GET /descriptionLivre/:id
 * Récupère les informations détaillées d'un livre via l'API Open Library et affiche la page de description.
 * 
 * @name GET /descriptionLivre/:id
 * @function
 * @param {Request} req - Objet requête Express, avec paramètre `id` (ISBN ou identifiant du livre).
 * @param {Response} res - Objet réponse Express, utilisé pour rendre la vue ou envoyer une erreur.
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} En cas d'erreur lors de la requête API ou du traitement des données.
 */
router.get('/descriptionLivre/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const response = await fetch(`https://openlibrary.org/works/${id}.json`);
    const livre = await response.json();

    if (livre) {
      const titre = livre.title || "Titre inconnu";
      const auteur = livre.authors ? await getAuthorNames(livre.authors) : "Auteur inconnu";
      const description = typeof livre.description === 'string'
        ? livre.description
        : livre.description?.value || "Description non disponible";
      const couverture = livre.covers
        ? `https://covers.openlibrary.org/b/id/${livre.covers[0]}-M.jpg`
        : process.env.DEFAULT_BOOK_COVER;
      const genre = livre.subjects ? livre.subjects.slice(0, 2).join(", ") : "Non défini";
      const themes = livre.subjects ? livre.subjects.slice(2, 5).join(", ") : "Non définis";
      const dateSortie = livre.created?.value?.split("T")[0] || "Date inconnue";

      res.render('descriptionLivre.njk', {
        livre: {
          isbn: id,
          titre,
          auteur,
          description,
          image: couverture,
          genre,
          themes,
          dateSortie
        },
        showHomeLink: true,
        showLoginLink: true,
        showPanierLink: true,
        profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg'  

      });
    } else {
      res.status(404).send("Livre introuvable.");
    }
  } catch (err) {
    console.error("Erreur API Open Library:", err);
    res.status(500).send("Erreur lors de la récupération des données.");
  }
});

/**
 * Route GET /panier
 * Affiche la page du panier de l'utilisateur connecté avec les détails des livres ajoutés.
 * 
 * Cette route est protégée par un middleware d'authentification.
 * Elle récupère la liste des livres dans le panier de l'utilisateur depuis la base de données,
 * puis enrichit chaque livre avec des données provenant de l'API Open Library (description, image, titre).
 * 
 * @name GET /panier
 * @function
 * @param {Request} req - Objet requête Express contenant la session utilisateur.
 * @param {Response} res - Objet réponse Express utilisé pour rendre la vue ou envoyer une erreur.
 * 
 * @returns {Promise<void>}
 * 
 * @throws {Error} En cas d'erreur lors de la récupération du panier ou de la communication avec l'API.
 */
router.get('/panier', authentification, async (req, res) => {
  const username = req.session.user?.username;
  if (!username) return res.redirect('/loginRegister');

  db.getPanierByUser(username, async (err, livres) => {
    if (err) {
      console.error("Erreur récupération panier :", err.message);
      return res.status(500).send("Erreur serveur.");
    }

    const livresFormates = await Promise.all(livres.map(async livre => {
      const id = livre.NumISBN;

      // Valeurs par défaut
      let titre = livre.Title;
      let description = "Description non disponible.";
      let image = "/img/default-book.png";

      try {
        const apiRes = await fetch(`https://openlibrary.org/works/${id}.json`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          description = typeof data.description === 'string'
            ? data.description
            : data.description?.value || description;
          if (data.covers?.length) {
            image = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
          }
          if (data.title) {
            titre = data.title;
          }
        }
      } catch (apiErr) {
        console.warn(`Erreur API pour ${id}`, apiErr.message);
      }

      return {
        id,
        titre,
        description,
        image,
        lienDescription: `/descriptionLivre/${id}`
      };
    }));

    res.render('panier.njk', {
      livres: livresFormates,
      profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg'
    });
  });
});

/**
 * Route GET /catalogue
 * Recherche et affiche une liste de livres correspondant à la requête utilisateur.
 * 
 * Cette route interroge l'API Open Library avec le paramètre de recherche `search` en query string.
 * Si aucune requête n'est fournie, la page affiche une liste vide.
 * Pour chaque livre retourné, la description est récupérée via une requête supplémentaire sur l'API Open Library.
 * 
 * @name GET /catalogue
 * @function
 * @param {Request} req - Objet requête Express contenant la query string.
 * @param {Response} res - Objet réponse Express utilisé pour rendre la vue avec les résultats.
 * 
 * @returns {Promise<void>} Rend la page 'book.njk' avec la liste des livres trouvés et la requête de recherche.
 * 
 * @throws {Error} En cas d'échec lors de la récupération des données depuis l'API Open Library.
 */
router.get('/catalogue', async (req, res) => {
  const searchQuery = req.query.search?.toLowerCase() || "";

  if (!searchQuery) {
      return res.render('book.njk', { livres: [], searchQuery });
  }

  try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      const docs = data.docs.slice(0, 10);

      const livres = await Promise.all(docs.map(async (book) => {
          let description = "Description non disponible";

          if (book.key) {
              try {
                  const workResponse = await fetch(`https://openlibrary.org${book.key}.json`);
                  const workData = await workResponse.json();

                  description =
                      typeof workData.description === "string"
                          ? workData.description
                          : workData.description?.value || description;

              } catch (err) {
                  console.warn(`Erreur lors de la récupération de la description pour ${book.key}`);
              }
          }

          return {
              id: book.key?.split("/").pop(),
              titre: book.title,
              auteur: book.author_name ? book.author_name.join(", ") : "Auteur inconnu",
              annee: book.first_publish_year || "Année inconnue",
              couverture: book.cover_i
                  ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
                  : process.env.DEFAULT_BOOK_COVER,
              description,
          };
      }));

      res.render('book.njk', { livres, searchQuery, profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg' });

  } catch (err) {
      console.error("Erreur API Open Library:", err);
      res.render('book.njk', {
          livres: [],
          searchQuery,
          error: "Erreur lors de la récupération des données.",
          profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg' 
      });
  }
});

/**
 * Route GET /catalogue/:theme
 * Recherche et affiche une liste de livres correspondant à un thème spécifique.
 * 
 * Interroge l'API Open Library en filtrant par sujet (theme).
 * Pour chaque livre retourné, récupère la description via une requête additionnelle.
 * Limite la liste à 15 livres.
 * 
 * @name GET /catalogue/:theme
 * @function
 * @param {Request} req - Objet requête Express avec un paramètre de route 'theme'.
 * @param {Response} res - Objet réponse Express utilisé pour rendre la vue.
 * 
 * @returns {Promise<void>} Rend la page 'book.njk' avec la liste des livres correspondant au thème et le profil utilisateur.
 * 
 * @throws {Error} En cas d'erreur lors de la récupération des données depuis l'API Open Library.
 */
router.get('/catalogue/:theme', async (req, res) => {
  const theme = req.params.theme.toLowerCase();

  try {
    const response = await fetch(`https://openlibrary.org/search.json?subject=${encodeURIComponent(theme)}`);
    const data = await response.json();

    const docs = data.docs.slice(0, 15);

    const livres = await Promise.all(docs.map(async (book) => {
      let description = "Description non disponible";

      if (book.key) {
        try {
          const workResponse = await fetch(`https://openlibrary.org${book.key}.json`);
          const workData = await workResponse.json();

          description =
            typeof workData.description === "string"
              ? workData.description
              : workData.description?.value || description;

        } catch (err) {
          console.warn(`Erreur lors de la récupération de la description pour ${book.key}`);
        }
      }

      return {
        id: book.key?.split("/").pop(),
        titre: book.title,
        auteur: book.author_name ? book.author_name.join(", ") : "Auteur inconnu",
        annee: book.first_publish_year || "Année inconnue",
        couverture: book.cover_i
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
          : process.env.DEFAULT_BOOK_COVER,
        description,
      };
    }));

    res.render('book.njk', { livres, searchQuery: theme, profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg'  });

  } catch (err) {
    console.error("Erreur API Open Library:", err);
    res.render('book.njk', {
      livres: [],
      searchQuery: theme,
      error: "Erreur lors de la récupération des données.",
      profileImage: req.session?.user?.ImgProfil || '/img/user.jpeg' 
    });
  }
});

export default router;
