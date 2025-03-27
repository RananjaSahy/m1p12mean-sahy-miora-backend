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


module.exports = router;