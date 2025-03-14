const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const authMiddleware = require('../middlewares/authMiddleware');

// 📌 Route protégée : Récupérer le profil de l'utilisateur connecté
router.get('/me', authMiddleware(['client','mecanicien','manager']), async (req, res) => {
    try {
        const user = await Utilisateur.findById(req.user.id).select('-mdp'); // Exclut le mdp
        res.json(user);
    } catch (err) {
        console.error('Erreur: ', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

module.exports = router;