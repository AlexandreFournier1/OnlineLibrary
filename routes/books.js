/**
 * @module routes/books
 * @description Routes pour gérer les livres dans l'application.
 */

import express from 'express';
import db from '../db.js';

const router = express.Router();

/**
 * Route GET /
 * Récupère tous les livres de la base de données et les affiche via le template `books.njk`.
 *
 * @name GET /books
 * @function
 * @memberof module:routes/books
 * @param {express.Request} req - Objet de requête HTTP
 * @param {express.Response} res - Objet de réponse HTTP
 */
router.get('/', (req, res) => {
  db.getAllBooks((err, books) => {
    if (err) {
      res.status(500).send("Erreur lors de la récupération des livres");
    } else {
      res.render('books.njk', { books });
    }
  });
});

/**
 * Route POST /add
 * Ajoute un livre à la base de données avec les données envoyées via le corps de la requête.
 *
 * @name POST /books/add
 * @function
 * @memberof module:routes/books
 * @param {express.Request} req - Objet de requête HTTP (doit contenir un objet livre dans `req.body`)
 * @param {express.Response} res - Objet de réponse HTTP
 */
router.post('/add', (req, res) => {
  const book = req.body;
  db.addBook(book, (err) => {
    if (err) {
      res.status(500).send("Erreur lors de l'ajout");
    } else {
      res.redirect('/books');
    }
  });
});

export default router;