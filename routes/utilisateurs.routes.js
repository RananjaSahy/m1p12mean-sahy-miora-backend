const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const authMiddleware = require('../middlewares/authMiddleware');
const Vehicule = require('../models/Vehicule');
const Service = require('../models/Service');
const Rendezvous = require('../models/Rendezvous');
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

// get pour l'id utilisateur pour le manager
// router.get('/:idpers', authMiddleware(['manager']), async(req,res) => {
//     try{
//         const { page = 1, limit, search = "", order = "asc", sort = "libelle" } = req.params.idpers;
//         const searchQuery = search
//         ? {
//               $or: [
//                   { matricule: { $regex: search, $options: "i" } },
//                   { libelle: { $regex: search, $options: "i" } },
//                   { description: { $regex: search, $options: "i" } },
//               ],
//           }
//         : {};
//         const totalVehicule = await Vehicule.countDocuments({...searchQuery });
//         const sortOrder = order === "desc" ? -1 : 1;
//         let query = Vehicule.find({ utilisateur: req.user.id, ...searchQuery }).populate('typevehicule').sort({ [sort]: sortOrder });

//         if (limit && parseInt(limit) > 0) {
//             query = query.skip((page - 1) * limit).limit(parseInt(limit));
//         }

//         const mesvehicules = await query;
//         res.status(200).json({mesvehicules, total: totalVehicule});
//     }catch(error){
//         res.status(500).json({ message: error.message });
//     }
// });

router.get('/utilisateurs/:idpers', authMiddleware(['manager']), async (req, res) => {
    try {
        const { idpers } = req.params;  // L'ID de l'utilisateur passé dans les paramètres de l'URL

        // Rechercher les véhicules de cet utilisateur (idpers)
        const totalVehicule = await Vehicule.countDocuments({ utilisateur: idpers });

        // Requête pour récupérer les véhicules associés à l'utilisateur
        const vehicules = await Vehicule.find({ utilisateur: idpers }).populate('typevehicule');

        // Requête pour récupérer les rendez-vous associés à cet utilisateur et ses véhicules
        const rendezvous = await Rendezvous.find({ utilisateur: idpers })
            .populate({
                path: 'vehicule',
                match: { utilisateur: idpers },  // S'assurer que les véhicules sont liés à cet utilisateur
                select: 'libelle'
            })
            .populate({
                path: 'services.service',
                select: 'nom description historique',
            })
            .populate('utilisateur', 'nom prenom') // Populate de l'utilisateur pour récupérer les infos de l'utilisateur
            .sort({ date: -1 }); // Optionnel : trier les rendez-vous par date, si besoin

        // Retourner les résultats
        res.status(200).json({
            vehicules,
            rendezvous,
            totalVehicule
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des véhicules et rendez-vous", error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;