const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const authMiddleware = require('../middlewares/authMiddleware');
const Vehicule = require('../models/Vehicule');
const Service = require('../models/Service');

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
router.get('/messervicesdispo', authMiddleware(['client']), async (req, res) => {
    try {
        // Récupérer les véhicules de l'utilisateur
        const myVehicules = await Vehicule.find({ utilisateur: req.user.id });

        if (!myVehicules.length) {
            return res.status(404).json({ message: "Aucun véhicule trouvé pour cet utilisateur." });
        }

        // Extraire les types de véhicules
        const typeVehiculeIds = myVehicules.map(v => v.typevehicule);

        // Récupérer les services correspondant à ces types de véhicules
        const services = await Service.find({ 'historique.typevehicule': { $in: typeVehiculeIds } });

        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get('/services/:vehiculeId', authMiddleware(['client']), async (req, res) => {
    try {
        const vehiculeId = req.params.vehiculeId;

        // Récupérer le type de véhicule associé au véhicule sélectionné
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({ message: "Véhicule non trouvé." });
        }

        // Récupérer les services compatibles avec ce type de véhicule
        const services = await Service.find({ 'historique.typevehicule': vehicule.typevehicule });

        res.status(200).json(services);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
});




module.exports = router;