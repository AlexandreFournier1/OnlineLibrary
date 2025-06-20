/**
 * @module middleware/authentification
 * @description Middleware pour vérifier l'authentification de l'utilisateur.
 */

/**
 * Middleware Express pour vérifier si un utilisateur est authentifié.
 * Redirige vers la page de connexion si l'utilisateur n'est pas connecté.
 *
 * @function
 * @name authentification
 * @param {import('express').Request} req - L'objet de requête Express.
 * @param {import('express').Response} res - L'objet de réponse Express.
 * @param {import('express').NextFunction} next - La fonction suivante dans la chaîne middleware.
 */
const authentification = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/loginRegister');
  }
};

export default authentification;