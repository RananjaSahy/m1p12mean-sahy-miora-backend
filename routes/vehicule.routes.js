const express = require('express');
const Vehicule = require('../models/Vehicule');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Créer un véhicule
router.post('/', authMiddleware(['client']), async (req, res) => {
    try {
        const vehicule = new Vehicule(req.body);
        vehicule.utilisateur = req.user.id
        await vehicule.save();
        res.status(201).json(vehicule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Récupérer tous les véhicules
router.get('/', authMiddleware(['manager','mecanicien']), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const vehicules = await Vehicule.find().populate('utilisateur typevehicule')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json(vehicules);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Récupérer un véhicule par ID
router.get('/:id', async (req, res) => {
    try {
        const vehicule = await Vehicule.findById(req.params.id).populate('utilisateur typevehicule');
        if (!vehicule) return res.status(404).json({ message: 'Véhicule non trouvé' });
        res.status(200).json(vehicule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mettre à jour un véhicule
router.put('/:id', authMiddleware(['client']), async (req, res) => {
    try {
        const vehicule = await Vehicule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (vehicule.utilisateur.toString() !== req.user.id) {
            return res.status(403).json({ message: "Accès refusé : Vous n'êtes pas le propriétaire de ce véhicule" });
        }
        if (!vehicule) return res.status(404).json({ message: 'Véhicule non trouvé' });
        res.status(200).json(vehicule);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


module.exports = router;
