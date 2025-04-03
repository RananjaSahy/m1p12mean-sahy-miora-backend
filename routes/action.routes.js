const express = require('express');
const mongoose = require('mongoose');
const Action = require('../models/Action');
const authMiddleware = require('../middlewares/authMiddleware');
const Statut = require('../models/Statut');

const { getMecanicienOccupation } = require('../controllers/action.controller');

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


router.get('/', async (req, res) => {
    try {
        const actions = await Action.find()
        .populate('rendezVous')
            .populate('service', 'nom description')
            .populate({
                path: 'vehicule',
                populate: { path: 'typevehicule' } 
            })
            .populate('responsables', 'nom prenom')
            .populate('statutActuel', 'etat')
            .exec();

        res.status(200).json(actions);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des actions", error });
    }
});
router.get('/rendezvous/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const actions = await Action.find({ rendezVous: id })
            .populate('service', 'nom description')
            .populate({
                path: 'vehicule',
                populate: { path: 'typevehicule' } 
            })
            .populate('responsables', 'nom prenom')
            .populate('statutActuel', 'etat')
            .populate('rendezVous')
            .exec();

        res.status(200).json(actions);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des actions", error });
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
// Mettre à jour une action (ajout de responsables et modification d'état)
router.put('/:id', authMiddleware(['client','mecanicien','manager']),  async (req, res) => {
    try {
        const { id } = req.params;
        const { responsables, etat, etatPayement } = req.body;

        const updateData = {};
        if (responsables) updateData.responsables = responsables;
        if (etat) updateData.statutActuel = etat;
        if (etatPayement) updateData.etatPayement = etatPayement;

        const action = await Action.findByIdAndUpdate(id, updateData, { new: true })
            .populate('service', 'nom description')
            .populate('vehicule', 'matricule libelle')
            .populate('responsables', 'nom prenom')
            .populate('statutActuel', 'etat');

        if (!action) {
            return res.status(404).json({ message: 'Action non trouvée' });
        }

        res.status(200).json(action);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'action', error });
    }
});


router.get('/taux-occupation', getMecanicienOccupation);
module.exports = router;

