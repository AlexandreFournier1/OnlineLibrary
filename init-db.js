/**
 * @module init-db
 * @description Module pour initialiser la base de données SQLite de l'application.
 */

import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Instance SQLite connectée au fichier 'book.sqlite3'.
 * Initialise la base de données et gère la connexion.
 * @constant {sqlite3.Database}
 */
const db = new sqlite3.Database(resolve(__dirname, 'book.sqlite3'), (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base :', err.message);
  } else {
    console.log('Connexion à la base réussie.');
  }
});

/**
 * Sérialisation des requêtes pour initialiser la base :
 * - Désactive temporairement les clés étrangères
 * - Supprime les tables existantes si présentes
 * - Réactive les contraintes de clés étrangères
 * - Crée les tables Users, Books, Panier, Emprunt avec leurs colonnes et relations
 */
db.serialize(() => {
  db.run("PRAGMA foreign_keys = OFF;"); // Désactivation temporaire des contraintes FK

  // Suppression des tables si elles existent, pour réinitialiser la base
  db.run("DROP TABLE IF EXISTS Emprunt;");
  db.run("DROP TABLE IF EXISTS Panier;");
  db.run("DROP TABLE IF EXISTS Books;");
  db.run("DROP TABLE IF EXISTS Users;");

  db.run("PRAGMA foreign_keys = ON;"); // Réactivation des contraintes FK

  // Création de la table Users avec une clé primaire sur Username
  db.run(`
    CREATE TABLE Users (
      Username TEXT PRIMARY KEY
    );
  `);

  // Création de la table Books avec NumISBN comme clé primaire et Title & Author obligatoires
  db.run(`
    CREATE TABLE Books (
      NumISBN TEXT PRIMARY KEY,
      Title TEXT NOT NULL,
      Author TEXT NOT NULL
    );
  `);

  // Création de la table Panier avec clé primaire composite et contraintes FK
  db.run(`
    CREATE TABLE Panier (
      NumISBN TEXT,
      Username TEXT,
      PRIMARY KEY (NumISBN, Username),
      FOREIGN KEY (NumISBN) REFERENCES Books(NumISBN),
      FOREIGN KEY (Username) REFERENCES Users(Username)
    );
  `);

  // Création de la table Emprunt avec clé primaire composite, colonnes de date et contraintes FK
  db.run(`
    CREATE TABLE Emprunt (
      NumISBN TEXT,
      Username TEXT,
      DateEmprunt TEXT,
      DateRetour TEXT,
      PRIMARY KEY (NumISBN, Username),
      FOREIGN KEY (NumISBN) REFERENCES Books(NumISBN),
      FOREIGN KEY (Username) REFERENCES Users(Username)
    );
  `);

  console.log("✅ Toutes les tables ont été recréées.");
});