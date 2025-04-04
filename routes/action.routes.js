const express = require('express');
const mongoose = require('mongoose');
const Action = require('../models/Action');
const authMiddleware = require('../middlewares/authMiddleware');
const Statut = require('../models/Statut');
const constantes = require('../config/variable.json');
const actionController = require('../controllers/action.controller');
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
router.patch('/:id/encours', authMiddleware(['mecanicien']), async (req, res) => {
    try{
        const { id } = req.params;

        const dernierStatut = await Statut.findOne({ action: id })
            .sort({ createdAt: -1 }) 
            .populate('utilisateur', 'nom prenom email');

        if (!dernierStatut) {
            return res.status(404).json({ message: "Aucun statut trouvé pour cette action" });
        }

        if(dernierStatut.etat !== constantes.etatstatut.plannifie){
            return res.status(400).json({ error : "Seule une action plannifée peut être activé"});
        } else {
            const statut = new Statut({
                action : id,
                utilisateur : req.user.id,
                etat : constantes.etatstatut.encours
            });
            await statut.save();

            res.json({ message: "Action : statut en cours avec succès.", statut });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/terminer', authMiddleware(['mecanicien']), async (req, res) => {
    try{
        const { id } = req.params;

        const dernierStatut = await Statut.findOne({ action: id })
            .sort({ createdAt: -1 }) 
            .populate('utilisateur', 'nom prenom email');

        if (!dernierStatut) {
            return res.status(404).json({ message: "Aucun statut trouvé pour cette action" });
        }

        if(dernierStatut.etat !== constantes.etatstatut.encours){
            return res.status(400).json({ error : "Seule une action en cours peut être terminée"});
        } else {
            const statut = new Statut({
                action : id,
                utilisateur : req.user.id,
                etat : constantes.etatstatut.termine
            });
            await statut.save();

            res.json({ message: "Action : terminer action avec succès.", statut });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/annuler', authMiddleware(['mecanicien', 'client', 'manager']), async (req, res) => {
    try{
        const { id } = req.params;

        if(req.user.role === 'client'){
            const action = Action.findById(id);
            if(action.vehicule.utilisateur != req.user.id){
                return res.status(401).json({ message: "Accès refusé" });
            }
        }
        const dernierStatut = await Statut.findOne({ action: id })
            .sort({ createdAt: -1 }) 
            .populate('utilisateur', 'nom prenom email');

        if (!dernierStatut) {
            return res.status(404).json({ message: "Aucun statut trouvé pour cette action" });
        }

        if(dernierStatut.etat >= constantes.etatstatut.termine){
            return res.status(400).json({ error : "Cette action ne peut plus être annulée"});
        } else {
            const statut = new Statut({
                action : id,
                utilisateur : req.user.id,
                etat : constantes.etatstatut.annule
            });
            await statut.save();

            res.json({ message: "Action : annuler action avec succès.", statut });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id/replannifier', authMiddleware(['mecanicien', 'client', 'manager']), async (req, res) => {
    try{
        const { id } = req.params;

        if(req.user.role === 'client'){
            const action = Action.findById(id);
            if(action.vehicule.utilisateur != req.user.id){
                return res.status(401).json({ message: "Accès refusé" });
            }
        }
        const dernierStatut = await Statut.findOne({ action: id })
            .sort({ createdAt: -1 }) 
            .populate('utilisateur', 'nom prenom email');

        if (!dernierStatut) {
            return res.status(404).json({ message: "Aucun statut trouvé pour cette action" });
        }

        if(dernierStatut.etat >= constantes.etatstatut.termine || dernierStatut.etat === constantes.etatstatut.plannifie){
            return res.status(400).json({ error : "Cette action ne peut plus être replannifié"});
        } else {
            const statut = new Statut({
                action : id,
                utilisateur : req.user.id,
                etat : constantes.etatstatut.plannifie
            });
            await statut.save();

            res.json({ message: "Action : replannifier action avec succès.", statut });
        }
    } catch (error) {
        console.error(error);
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


router.get('/taux-occupation', actionController.getMecanicienOccupation);
router.get('/facture/:idRendezvous', actionController.getInvoiceByRendezvous);
module.exports = router;

