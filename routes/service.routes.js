const express = require('express');
const router = express.Router();
const Service = require('../models/services');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');


router.post('/',authMiddleware(['manager']),  async (req, res) => {
    try {
        const service = new Service(req.body);
        await service.save();
        res.status(201).json(service);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


router.get('/', async (req, res) => {
    try {
        const services = await Service.find();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: "Service non trouvé" });
        res.json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id',authMiddleware(['manager']),  async (req, res) => {
    try {
        const { nom, description, historique } = req.body;
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ message: "Service non trouvé" });
        }

        let modification = false;

        // Vérifier si le nom ou la description a changé
        if (nom && nom !== service.nom) {
            service.nom = nom;
            modification = true;
        }

        if (description && description !== service.description) {
            service.description = description;
            modification = true;
        }

        // Vérifier si un nouveau prix a été envoyé et l'ajouter à l'historique
        if (historique && historique.length > 0 && historique[0].prix) {
            service.historique.push({
                date: new Date(), // Date actuelle
                prix: historique[0].prix
            });
            modification = true;
        }

        // Sauvegarder uniquement si une modification a été faite
        if (modification) {
            await service.save();
            return res.json(service);
        } else {
            return res.status(400).json({ message: "Aucune modification détectée" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.delete('/:id',authMiddleware(['manager']),  async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.json({ message: "Service supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Ajouter une nouvelle entrée dans l'historique d'un service
router.post('/:id/historique',authMiddleware(['manager']), async (req, res) => {
    try {
        const { date, prix } = req.body;
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: "Service non trouvé" });

        service.historique.push({ date, prix });
        await service.save();

        res.json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
