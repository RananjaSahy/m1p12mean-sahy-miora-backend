const express = require('express');
const mongoose = require('mongoose');
const Action = require('../models/Action');
const authMiddleware = require('../middlewares/authMiddleware');
const Statut = require('../models/Statut');

const router = express.Router();
router.post('/', authMiddleware(['client','mecanicien','manager']), async (req, res) => {
    try {
        const userId = req.user.id;
        const action = new Action(req.body);
        action._userId = userId;
        action.etatPayement = 'non payé';
        await action.save();
        res.status(201).json(action);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/', authMiddleware(['manager']) , async (req, res) => {
    try {
        const actions = await Action.find().populate('service vehicule responsables depend_de rendezVous');
        res.json(actions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/statut', authMiddleware(['manager','mecanicien', 'client']), async (req, res) => {
    try{
        const { id } = req.params;

        const dernierStatut = await Statut.findOne({ action: id })
            .sort({ createdAt: -1 }) 
            .populate('utilisateur', 'nom prenom email');

        if (!dernierStatut) {
            return res.status(404).json({ message: "Aucun statut trouvé pour cette action" });
        }

        res.status(200).json(dernierStatut);
    }catch(error){
        res.status(500).json({ error: error.message });
    }
});


module.exports = router;
