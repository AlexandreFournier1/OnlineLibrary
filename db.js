/**
 * @module db
 * @description Module pour gérer la base de données SQLite de l'application.
 */

import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Pour remplacer __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Chemin absolu vers le fichier de base SQLite.
 * @constant {string}
 */
const DB_PATH = path.resolve(__dirname, 'book.sqlite3');

/**
 * Instance SQLite connectée à la base de données.
 * @constant {sqlite3.Database}
 */
// Connexion à la base
if (!fs.existsSync(DB_PATH)) {
  throw new Error("❌ book.sqlite3 manquant. Exécute init-db.js avant !");
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Erreur SQLite :", err.message);
  } else {
    console.log("📚 Connexion à SQLite réussie.");
  }
});

/**
 * Récupère tous les livres dans la table Books.
 * 
 * @param {function(Error, Object[])} callback - Fonction callback avec signature (err, rows).
 */
function getAllBooks(callback) {
  db.all('SELECT * FROM Books', callback);
}

/**
 * Ajoute un utilisateur à la table Users.
 * 
 * @param {string} username - Nom d'utilisateur.
 * @param {function(Error)} callback - Fonction callback appelée à la fin de l'opération.
 */
function addUser(username, callback) {
  db.run(`INSERT OR IGNORE INTO Users (Username) VALUES (?)`, [username], callback);
}

/**
 * Ajoute un livre à la table Books (s'il n'existe pas déjà).
 * 
 * @param {{NumISBN: string, Title: string, Author: string}} book - Objet livre.
 * @param {function(Error)} callback - Fonction callback appelée à la fin.
 */
function addBook(book, callback) {
  db.run(
    `INSERT OR IGNORE INTO Books (NumISBN, Title, Author) VALUES (?, ?, ?)`,
    [book.NumISBN, book.Title, book.Author],
    callback
  );
}

/**
 * Ajoute un livre au panier d'un utilisateur.
 * 
 * @param {string} isbn - Numéro ISBN du livre.
 * @param {string} username - Nom d'utilisateur.
 * @param {function(Error)} callback - Fonction callback appelée à la fin.
 */
function addToPanier(isbn, username, callback) {
  db.run(
    `INSERT OR IGNORE INTO Panier (NumISBN, Username) VALUES (?, ?)`,
    [isbn, username],
    callback
  );
}

/**
 * Supprime un livre du panier d'un utilisateur.
 * 
 * @param {string} isbn - Numéro ISBN du livre.
 * @param {string} username - Nom d'utilisateur.
 * @param {function(Error)} callback - Fonction callback appelée à la fin.
 */
function removeFromPanier(isbn, username, callback) {
  db.run(
    `DELETE FROM Panier WHERE NumISBN = ? AND Username = ?`,
    [isbn, username],
    callback
  );
}

/**
 * Récupère tous les livres présents dans le panier d'un utilisateur.
 * 
 * @param {string} username - Nom d'utilisateur.
 * @param {function(Error, Object[])} callback - Fonction callback (err, livres).
 */
function getPanierByUser(username, callback) {
  db.all(
    `SELECT Books.* FROM Books
     JOIN Panier ON Books.NumISBN = Panier.NumISBN
     WHERE Panier.Username = ?`,
    [username],
    callback
  );
}

/**
 * Vide le panier d'un utilisateur.
 * 
 * @param {string} username - Nom d'utilisateur.
 * @param {function(Error)} callback - Fonction callback appelée à la fin.
 */
function clearPanierForUser(username, callback) {
  db.run(`DELETE FROM Panier WHERE Username = ?`, [username], callback);
}

/**
 * Ajoute un emprunt pour un utilisateur.
 * 
 * @param {string} isbn - Numéro ISBN du livre emprunté.
 * @param {string} username - Nom d'utilisateur.
 * @param {string} dateEmprunt - Date de début d'emprunt (format ISO string).
 * @param {string} dateRetour - Date prévue de retour (format ISO string).
 * @param {function(Error)} callback - Fonction callback appelée à la fin.
 */
function addEmprunt(isbn, username, dateEmprunt, dateRetour, callback) {
  db.run(
    `INSERT OR IGNORE INTO Emprunt (NumISBN, Username, DateEmprunt, DateRetour) VALUES (?, ?, ?, ?)`,
    [isbn, username, dateEmprunt, dateRetour],
    callback
  );
}

/**
 * Récupère tous les emprunts d'un utilisateur avec les informations des livres empruntés.
 * 
 * @param {string} username - Nom d'utilisateur.
 * @param {function(Error, Object[])} callback - Fonction callback (err, emprunts).
 */
function getEmpruntsByUser(username, callback) {
  db.all(
    `SELECT Books.NumISBN, Books.Title, Books.Author, Emprunt.DateEmprunt, Emprunt.DateRetour
     FROM Emprunt
     JOIN Books ON Emprunt.NumISBN = Books.NumISBN
     WHERE Emprunt.Username = ?`,
    [username],
    callback
  );
}

// Export des fonctions et de l'instance db
export default {
  getAllBooks,
  addBook,
  addUser,
  addToPanier,
  removeFromPanier,
  getPanierByUser,
  addEmprunt,
  getEmpruntsByUser,
  clearPanierForUser
};

export { db };