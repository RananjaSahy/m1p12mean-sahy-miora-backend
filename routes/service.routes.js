const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
router.post('/', authMiddleware(['manager']), async (req, res) => {
    try {
        const { nom, description, historique } = req.body;

        // Assurer que etat est toujours true
        const newService = new Service({
            nom,
            description,
            etat: true, 

            // Vérifier si un historique est fourni, sinon créer une entrée par défaut
            historique: historique && historique.length > 0 ? 
                historique.map(item => ({
                    ...item,
                    etat: true 
                })) 
                : []
        });

        await newService.save();
        res.status(201).json(newService);
    } catch (error) {
        console.error(" Erreur lors de la création du service :", error);
        res.status(400).json({ message: error.message });
    }
});


router.get('/', authMiddleware(['client', 'manager', 'mecanicien']), async (req, res) => { 
    try {
        let { page = 1, limit = 10 } = req.query;
        const role = req.user.role; // Récupérer le rôle depuis le token utilisateur

        // Convertir les valeurs en nombres
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        let services = [];
        let totalServices = 0;

        if (role === 'client') {
            // 🌟 Requête 1 : Services actifs pour les clients
            totalServices = await Service.countDocuments({ etat: true });

            services = await Service.find({ etat: true }) // Services actifs uniquement
                .populate('historique.typevehicule')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            // 🌟 Requête 2 : Filtrer les historiques actifs + garder le plus récent par typevehicule
            services = services.map(service => {
                let latestHistory = {};

                service.historique.forEach(entry => {
                    if (!entry.etat) return; // Ignorer les historiques inactifs

                    const typeId = entry.typevehicule._id.toString();
                    if (!latestHistory[typeId] || new Date(entry.date) > new Date(latestHistory[typeId].date)) {
                        latestHistory[typeId] = entry;
                    }
                });

                return { ...service, historique: Object.values(latestHistory) };
            });

        } else {
            // 🌟 Requête 1 : Services pour managers et mécaniciens (tout)
            totalServices = await Service.countDocuments();

            services = await Service.find()
                .populate('historique.typevehicule')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean();

            // 🌟 Requête 2 : Garder uniquement le dernier historique par typevehicule (même les inactifs)
            services = services.map(service => {
                let latestHistory = {};

                service.historique.forEach(entry => {
                    const typeId = entry.typevehicule._id.toString();
                    if (!latestHistory[typeId] || new Date(entry.date) > new Date(latestHistory[typeId].date)) {
                        latestHistory[typeId] = entry;
                    }
                });

                return { ...service, historique: Object.values(latestHistory) };
            });
        }

        res.json({
            total: totalServices,
            page,
            limit,
            totalPages: Math.ceil(totalServices / limit),
            data: services
        });

    } catch (error) {
        console.error("❌ Erreur GET /services :", error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/search', authMiddleware(['client', 'manager', 'mecanicien']), async (req, res) => {
    try {
        let { page = 1, limit, service, typevehicule, prixMin, prixMax } = req.query;
        const role = req.user.role;
        // Conversion des paramètres
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);
        if (isNaN(page) || page < 1) page = 1;
        if (isNaN(limit) || limit < 1) limit = 10;

        let filter = {};

        // Filtrer par nom du service et description
        if(service){
            filter.$or = [
                { nom: { $regex: service, $options: 'i' } },
                { description: { $regex: service, $options: 'i' } }
            ];
        }
        // Filtrer par type de véhicule
        if(typevehicule){
            if(role === 'client'){
                filter['historique'] = {
                    $elemMatch: {
                        typevehicule: typevehicule,
                        etat: true 
                    }
                };
            }else{
                filter['historique.typevehicule'] = typevehicule;
            }
        }
        // Filtrer par plage de prix
        if (prixMin || prixMax) {
            filter['historique.prix'] = {};
            if (prixMin) filter['historique.prix'].$gte = parseFloat(prixMin);
            if (prixMax) filter['historique.prix'].$lte = parseFloat(prixMax);
        }

        if (role === 'client') {
            filter.etat = true;
        }

        let totalServices = await Service.countDocuments(filter);
        console.log(filter);
        let services = await Service.find(filter)
            .populate('historique.typevehicule')
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.json({
            total: totalServices,
            page,
            limit,
            totalPages: Math.ceil(totalServices / limit),
            data: services
        });

    } catch (error) {
        console.error(" Erreur GET /services/search :", error);
        res.status(500).json({ message: error.message });
    }
});


router.patch('/:id/historique/:historiqueId/toggle', authMiddleware(['manager']), async (req, res) => {
    try {
        const { id, historiqueId } = req.params;
        const { etat } = req.body; // Nouvel état à appliquer

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: "Service non trouvé." });
        }

        // Trouver l'historique spécifique et mettre à jour son état
        const historique = service.historique.id(historiqueId);
        if (!historique) {
            return res.status(404).json({ message: "Historique non trouvé." });
        }

        historique.etat = etat;
        await service.save();

        res.json({ message: `Historique ${etat ? 'activé' : 'désactivé'} avec succès.`, historique });

    } catch (error) {
        res.status(500).json({ message: "Erreur serveur.", error });
    }
});

router.patch('/:id/desactiver', authMiddleware(['manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByIdAndUpdate(id, { etat: false }, { new: true });

        if (!service) {
            return res.status(404).json({ message: "Service non trouvé." });
        }

        res.json({ message: "Service désactivé avec succès.", service });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur." });
    }
});
router.patch('/:id/activer', authMiddleware(['manager']), async (req, res) => {
    try {
        const { id } = req.params;
        const service = await Service.findByIdAndUpdate(id, { etat: true }, { new: true });

        if (!service) {
            return res.status(404).json({ message: "Service non trouvé." });
        }

        res.json({ message: "Service désactivé avec succès.", service });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur." });
    }
});
router.patch('/:serviceId/historique/:historiqueId/desactiver', authMiddleware(['manager']), async (req, res) => {
    try {
        const { serviceId, historiqueId } = req.params;

        const service = await Service.findById(serviceId);
        if (!service) return res.status(404).json({ message: "Service non trouvé." });

        const historique = service.historique.id(historiqueId);
        if (!historique) return res.status(404).json({ message: "Historique non trouvé." });

        historique.etat = false;
        await service.save();

        res.json({ message: "Historique désactivé avec succès.", service });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur." });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id).populate('historique.typevehicule');

        if (!service) return res.status(404).json({ message: "Service non trouvé" });

        res.json(service); // Retourner toutes les historiques sans filtrer
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// router.put('/:id', authMiddleware(['manager']), async (req, res) => {
//     try {
//         const { nom, description, historique } = req.body;
//         const service = await Service.findById(req.params.id);

//         if (!service) {
//             return res.status(404).json({ message: "Service non trouvé" });
//         }

//         let modification = false;

//         // Mise à jour du nom et de la description si modifiés
//         if (nom && nom !== service.nom) {
//             service.nom = nom;
//             modification = true;
//         }

//         if (description && description !== service.description) {
//             service.description = description;
//             modification = true;
//         }

//         // Mise à jour des historiques
//         if (historique && historique.length > 0) {
//             historique.forEach(h => {
//                 const index = service.historique.findIndex(s => 
//                     s.typevehicule.toString() === h.typevehicule.toString()
//                 );

//                 if (index !== -1) {
//                     // Vérifier si le prix ou la durée a changé
//                     if (
//                         service.historique[index].prix !== h.prix ||
//                         service.historique[index].duree !== h.duree
//                     ) {
//                         service.historique[index].prix = h.prix;
//                         service.historique[index].duree = h.duree;
//                         service.historique[index].date = new Date(); // Mettre à jour la date
//                         modification = true;
//                     }
//                 } else {
//                     // Ajouter une nouvelle entrée si elle n'existe pas
//                     service.historique.push({
//                         date: new Date(),
//                         prix: h.prix,
//                         duree: h.duree,
//                         typevehicule: h.typevehicule
//                     });
//                     modification = true;
//                 }
//             });
//         }

//         if (modification) {
//             await service.save();
//             return res.json(service);
//         } else {
//             return res.status(400).json({ message: "Aucune modification détectée" });
//         }
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

router.put('/:id', authMiddleware(['manager']), async (req, res) => {
    try {
        const { nom, description, historique } = req.body;
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ message: "Service non trouvé" });
        }

        let modification = false;

        // 🔹 Mise à jour du nom et de la description si modifiés
        if (nom && nom !== service.nom) {
            service.nom = nom;
            modification = true;
        }

        if (description && description !== service.description) {
            service.description = description;
            modification = true;
        }

        // 🔹 Mise à jour des historiques
        if (historique && historique.length > 0) {
            for (const h of historique) {
                // 🔥 Trouver le dernier historique du même type de véhicule avec `etat: true`
                const lastHistory = service.historique
                    .filter(s => s.typevehicule.toString() === h.typevehicule.toString() && s.etat === true)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // Prendre le plus récent

                if (lastHistory) {
                    // 🔴 Désactiver l'ancien historique dans MongoDB
                    await Service.updateOne(
                        { _id: service._id, "historique._id": lastHistory._id },
                        { $set: { "historique.$.etat": false } }
                    );
                    modification = true;
                }

                // ✅ Ajouter un nouvel historique avec `etat: true`
                service.historique.push({
                    date: new Date(),
                    prix: h.prix,
                    duree: h.duree,
                    typevehicule: h.typevehicule,
                    etat: true
                });
                modification = true;
            }
        }

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


router.delete('/:id', authMiddleware(['manager']), async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        res.json({ message: "Service supprimé" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// router.post('/:id/historique', authMiddleware(['manager']), async (req, res) => {
//     try {
//         const { date, prix, duree, typevehicule } = req.body;
        
//         const service = await Service.findById(req.params.id);
//         if (!service) return res.status(404).json({ message: "Service non trouvé" });

//         // ,etat:true
//         service.historique.push({ 
//             date: date || new Date(), 
//             prix, 
//             duree, 
//             typevehicule,
//             etat: true // Ajoutez cette ligne pour correspondre au modèle
//           });
//         await service.save();

//         res.json(service);
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: error.message });
//     }
// });


router.post('/:id/historique', authMiddleware(['manager']), async (req, res) => {
    try {
        const { date, prix, duree, typevehicule } = req.body;
        const serviceId = req.params.id;

        // Vérifier si le service existe
        const service = await Service.findById(serviceId);
        if (!service) return res.status(404).json({ message: "Service non trouvé" });

        // Mettre à jour tous les historiques du même typevehicule en base de données
        await Service.updateOne(
            { _id: serviceId, "historique.typevehicule": typevehicule },
            { $set: { "historique.$[elem].etat": false } },
            { arrayFilters: [{ "elem.typevehicule": typevehicule }] }
        );

        // Ajouter le nouvel historique avec `etat: true`
        service.historique.push({
            date: date || new Date(),
            prix,
            duree,
            typevehicule,
            etat: true
        });

        // Sauvegarder la mise à jour
        await service.save();

        res.json(service);
    } catch (error) {
        console.error("Erreur :", error);
        res.status(500).json({ message: error.message });
    }
});


router.post('/filtre-par-types', async (req, res) => {
    try {
        console.log("mba ato kosa ehhhhhh");
        const { typeVehiculeIds } = req.body;

        if (!typeVehiculeIds || !Array.isArray(typeVehiculeIds) || typeVehiculeIds.length === 0) {
            return res.status(400).json({ message: "Aucun type de véhicule sélectionné" });
        }

        // 🔎 Recherche des services actifs correspondant aux types de véhicules donnés
        const services = await Service.find({ 
            'historique.typevehicule': { $in: typeVehiculeIds }, 
            actif: true  
        }).populate('historique.typevehicule');

        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/typevehicule/:typeId', async (req, res) => {
    try {
        const { typeId } = req.params;

        // 🔎 Recherche les services actifs et correspondant au type de véhicule sélectionné
        const services = await Service.find({ 
            'historique.typevehicule': typeId,  // Filtrer par type de véhicule
            actif: true  // Ne récupérer que les services actifs
        }).populate('historique.typevehicule'); // 📌 Pour récupérer les détails du type de véhicule

        if (!services.length) {
            return res.status(404).json({ message: "Aucun service trouvé pour ce type de véhicule" });
        }

        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
