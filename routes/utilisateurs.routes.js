const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const authMiddleware = require('../middlewares/authMiddleware');
const Vehicule = require('../models/Vehicule');
const Service = require('../models/Service');
const Action = require('../models/Action');
const Statut = require('../models/Statut');
const Rendezvous = require('../models/Rendezvous');
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
        const { page = 1, limit, search = "", order = "asc", sort = "libelle" } = req.query;
        const searchQuery = search
        ? {
              $or: [
                  { matricule: { $regex: search, $options: "i" } },
                  { libelle: { $regex: search, $options: "i" } },
                  { description: { $regex: search, $options: "i" } },
              ],
          }
        : {};
        const totalVehicule = await Vehicule.countDocuments({...searchQuery });
        const sortOrder = order === "desc" ? -1 : 1;
        let query = Vehicule.find({ utilisateur: req.user.id, ...searchQuery }).populate('typevehicule').sort({ [sort]: sortOrder });

        if (limit && parseInt(limit) > 0) {
            query = query.skip((page - 1) * limit).limit(parseInt(limit));
        }

        const mesvehicules = await query;
        res.status(200).json({mesvehicules, total: totalVehicule});
    }catch(error){
        res.status(500).json({ message: error.message });
    }
});

router.get('/mesactions', authMiddleware(['client']), async(req,res) => {
    try{
        const userId = req.user.id; 

       const vehicules = await Vehicule.find({ utilisateur: userId }).select('_id');

       const vehiculeIds = vehicules.map(vehicule => vehicule._id);

       const mesactions = await Action.find({ vehicule: { $in: vehiculeIds } })
            .populate({
                path: 'vehicule',
                populate: { path: 'typevehicule' } // Ajout du type de véhicule dans les véhicules des actions
            })
           .populate('service')
           .populate('responsables')
           .populate('depend_de')
           .populate('rendezVous')
           .populate('statutActuel')
           .sort({ createdAt: -1 })

        res.status(200).json(mesactions);

    }catch(error){
        res.status(500).json({ message: error.message });
    }
});

router.get("/mecaniciens", authMiddleware(['manager']), async(req, res) => {
    try{
        const { page = 1, limit = 10, search = "" } = req.query;
        const searchQuery = search
        ? {
              $or: [
                  { nom: { $regex: search, $options: "i" } },
                  { prenom: { $regex: search, $options: "i" } },
                  { email: { $regex: search, $options: "i" } },
              ],
          }
        : {};
        const totalMecaniciens = await Utilisateur.countDocuments({ role: "mecanicien", ...searchQuery });
        const mecaniciens = await Utilisateur.find({role: "mecanicien", ...searchQuery}).select('-mdp')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });
        res.status(200).json({mecaniciens, total: totalMecaniciens});
    }catch(error){
        res.status(500).json({message : error.message});
        console.log(error.message);
    }
});
// services qu'une personne peut prendre pour ce véhicule
// nisy 2 teo de ny 1 nofafako
router.get('/services/:vehiculeId', authMiddleware(['client']), async (req, res) => {
    try {
        const vehiculeId = req.params.vehiculeId;

        // Récupérer le type de véhicule associé au véhicule sélectionné
        const vehicule = await Vehicule.findById(vehiculeId);
        if (!vehicule) {
            return res.status(404).json({ message: "Véhicule non trouvé." });
        }

        // Récupérer les services compatibles avec ce type de véhicule
        const services = await Service.find({
            etat:true,
            historique: { 
                $elemMatch: { 
                    typevehicule: vehicule.typevehicule, 
                    etat: true 
                } 
            }
        });             
        console.log("services = ",services)
        res.status(200).json(services);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
});

router.get('/utilisateurs/:idpers?', authMiddleware(['manager']), async (req, res) => {
    try {
        const { idpers } = req.params;  // Si pas d'id, ce sera undefined

        if (idpers) {
            // Cas avec un idpers : récupérer les détails d'un utilisateur spécifique
            const utilisateur = await Utilisateur.findById(idpers);
            if (!utilisateur) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            const totalVehicule = await Vehicule.countDocuments({ utilisateur: idpers });
            const vehicules = await Vehicule.find({ utilisateur: idpers }).populate('typevehicule');
            const rendezvous = await Rendezvous.find({ utilisateur: idpers })
                .populate({
                    path: 'vehicule',
                    match: { utilisateur: idpers },
                    select: 'libelle'
                })
                .populate({
                    path: 'services.service',
                    select: 'nom description historique',
                })
                .populate('utilisateur', 'nom prenom')
                .sort({ date: -1 });

            return res.status(200).json({
                utilisateur,
                vehicules,
                totalVehicule,
                rendezvous
            });
        } else {
            // Cas sans idpers : récupérer la liste de tous les utilisateurs (clients)
            const utilisateurs = await Utilisateur.find({ role: 'client' }); // Filtrer les clients
            return res.status(200).json({ utilisateurs });
        }
    } catch (error) {
        console.error("Erreur lors de la récupération des données", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
