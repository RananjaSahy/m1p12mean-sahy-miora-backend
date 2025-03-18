const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const authMiddleware = require('../middlewares/authMiddleware');
const Vehicule = require('../models/Vehicule');

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

router.get('/mesvehicules', authMiddleware(['client']), async(req,res) => {
    try{
        const myvehicules = await Vehicule.find({utilisateur: req.user.id});
        res.status(200).json(myvehicules);
    }catch(error){
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;