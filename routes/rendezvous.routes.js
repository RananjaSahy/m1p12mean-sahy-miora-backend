const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Rendezvous = require('../models/Rendezvous');
const authMiddleware = require('../middlewares/authMiddleware');
const nodemailer = require('nodemailer');
const Service = require('../models/Service');
const Mail = require('../models/Mail');
const Vehicule = require('../models/Vehicule');
const Utilisateur = require('../models/Utilisateur');
require('dotenv').config();
// mail 
const { MailerSend, EmailParams, Recipient } = require("mailersend");

// Fonction de validation
async function validerRendezvous(date, vehicule, services) {
    const formattedDate = new Date(date);

    // Vérifier si la date est dans le futur
    const now = new Date();
    if (formattedDate < now) {
        return { valid: false, message: "La date sélectionnée doit être dans le futur." };
    }

    // Vérifier que l'heure est entre 5h00 et 21h00
    const heure = formattedDate.getHours();
    if (heure < 5 || heure > 21) {
        return { valid: false, message: "L'heure doit être entre 05:00 et 21:00." };
    }

    // Vérifier si une réservation existe déjà pour la même voiture et les mêmes services le même jour
    const debutJournee = new Date(formattedDate.setHours(0, 0, 0, 0));
    const finJournee = new Date(formattedDate.setHours(23, 59, 59, 999));

    const reservationExistante = await Rendezvous.findOne({
        vehicule: vehicule,
        // services: { $in: services },
        date: { $gte: debutJournee, $lte: finJournee }
    });

    if (reservationExistante) {
        return { valid: false, message: "Un rendez-vous existe déjà pour cette voiture et ces services à cette date." };
    }

    return { valid: true };
}

// Route POST pour ajouter un rendez-vous
router.post('/ajouter', authMiddleware(['client']), async (req, res) => {
    try {
        const utilisateur = req.user.id; // ID de l'utilisateur extrait du token
        const { date, vehicule, services, commentaire } = req.body;

        // Vérifier si l'ID du véhicule est valide
        if (!mongoose.Types.ObjectId.isValid(vehicule)) {
            return res.status(400).json({ message: "ID du véhicule invalide." });
        }
        const servicesValides = services.filter(s => mongoose.Types.ObjectId.isValid(s));

        // Vérifier et formater la date correctement
        const formattedDate = new Date(date);
        if (isNaN(formattedDate.getTime())) {
            return res.status(400).json({ message: "Date invalide." });
        }
        const devis = await calculDevis(date,vehicule,services);
        // Validation complète avant insertion
        const validation = await validerRendezvous(formattedDate, vehicule, servicesValides);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }
        res.status(201).json({ message: "Rendez-vous enregistré avec succès !" ,prix :devis});
    } catch (error) {
        console.log("Erreur backend :", error);
        res.status(500).json({ msg: "Erreur serveur." });
    }
});

router.post('/confirmer', authMiddleware(['client']), async (req, res) => {
    try {
        const utilisateur = req.user.id;
        console.log(req.body);
        const { date, vehicule, services, commentaire, email } = req.body;

        if (!mongoose.Types.ObjectId.isValid(vehicule)) {
            return res.status(400).json({ message: "ID du véhicule invalide." });
        }

        // 🔹 1. Trouver le véhicule pour récupérer son type
        const vehiculeInfo = await Vehicule.findById(vehicule).lean();
        if (!vehiculeInfo || !vehiculeInfo.typevehicule) {
            return res.status(400).json({ message: "Type de véhicule introuvable." });
        }
        const typeVehiculeId = vehiculeInfo.typevehicule.toString();

        // 🔹 2. Charger les services avec leur historique
        const servicesValides = await Service.find({ _id: { $in: services } })
            .populate('historique.typevehicule')
            .lean();

        const formattedDate = new Date(date);
        if (isNaN(formattedDate.getTime())) {
            return res.status(400).json({ message: "Date invalide." });
        }

        const validation = await validerRendezvous(formattedDate, vehicule, services);
        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        let totalPrix = 0;
        let totalDuree = 0;
        const servicesRendezVous = [];

        // 🔹 3. Filtrer les historiques avec le bon type de véhicule
        servicesValides.forEach(service => {
            if (!service.historique || service.historique.length === 0) return;

            const historiqueFiltre = service.historique
                .filter(h => h.etat && h.typevehicule && h.typevehicule._id.toString() === typeVehiculeId)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // Prendre le plus récent

            if (historiqueFiltre && historiqueFiltre.prix && historiqueFiltre.duree) {
                servicesRendezVous.push({
                    service: service._id,
                    prixEstime: historiqueFiltre.prix,
                    dureeEstimee: historiqueFiltre.duree
                });

                totalPrix += historiqueFiltre.prix;
                totalDuree += historiqueFiltre.duree;
            } else {
                console.log(`Aucun historique valide trouvé pour le service ${service._id} et le type de véhicule ${typeVehiculeId}`);
            }
        });

        if (servicesRendezVous.length === 0) {
            return res.status(400).json({ message: "Aucun service valide trouvé pour ce type de véhicule." });
        }

        const nouveauRendezvous = new Rendezvous({
            date: formattedDate,
            utilisateur,
            vehicule,
            services: servicesRendezVous,
            commentaire
        });

        await nouveauRendezvous.save();
        console.log(" ============= " + email);
        await sendMailUsingTemplate(formattedDate, servicesRendezVous, totalPrix, totalDuree, email);
        
        res.status(201).json({ 
            message: "Rendez-vous enregistré avec succès !", 
            prixTotal: totalPrix,
            dureeTotale: totalDuree
        });

    } catch (error) {
        console.log("Erreur backend :", error);
        res.status(500).json({ msg: "Erreur serveur." });
    }
});


router.get('/mes-rendezvous', authMiddleware(['client']), async (req, res) => {
    try {
        const utilisateurId = req.user.id;
        const rendezvous = await Rendezvous.find({ utilisateur: utilisateurId })
            .populate({
                path: 'vehicule',
                select: 'libelle typevehicule' 
            })
            .populate({
                path: 'services.service', 
                select: 'nom description historique' 
            });

        const formattedRendezvous = rendezvous.map(rdv => {
            const servicesFormatted = rdv.services.map(serviceItem => {
                const service = serviceItem.service; 
                
                const historiqueValide = service.historique?.find(hist =>
                    hist.typevehicule.equals(rdv.vehicule.typevehicule) && hist.etat
                );

                return {
                    _id: service._id,
                    nom: service.nom,
                    description: service.description,
                    prixEstime: historiqueValide ? historiqueValide.prix : 'N/A',
                    dureeEstimee: historiqueValide ? historiqueValide.duree : 'N/A'
                };
            });

            return {
                _id: rdv._id,
                date: rdv.date,
                vehicule: rdv.vehicule,
                services: servicesFormatted,
                commentaire: rdv.commentaire
            };
        });

        res.status(200).json(formattedRendezvous);
    } catch (error) {
        console.error("Erreur lors de la récupération des rendez-vous :", error);
        res.status(500).json({ msg: "Erreur serveur." });
    }
});

  

async function sendMailUsingTemplate(date, services, totalPrix, totalDuree, email) {
    try {
        const auth = {
            user: process.env.USER_MAIL,
            pass: process.env.USER_PASS
        };
        
        const toEmail = email;
        const froms = process.env.USER_ADRESS;
        const formattedDate = new Date(date).toLocaleDateString('fr-FR'); // Format français

        // Effectuer un populate pour récupérer les noms des services à partir de leur ObjectId
        const servicesPopulated = await Service.find({ 
            '_id': { $in: services.map(service => service.service) }  // On utilise l'ObjectId dans "service"
        });

        // Transformation des services en une chaîne de noms concaténés
        const servicesString = servicesPopulated.map(service => service.nom).join(', ');

        // Affichage pour debug (vous pouvez supprimer cette ligne après)
        console.log("Services après population: ", servicesString);

        // Appel de la fonction Mail avec les services formatés en string et la date formatée
        await Mail(auth, toEmail, froms, formattedDate, servicesString, totalPrix, totalDuree);

    } catch (error) {
        console.log("Erreur lors de l'envoi de l'email :", error);
    }
}



// devis
async function calculDevis(date, vehicule, services) {
    try {
        if (!services || services.length === 0) {
            return { totalPrix: 0, totalDuree: 0, details: [] }; 
        }

        const vehiculeData = await Vehicule.findById(vehicule).populate('typevehicule');
        if (!vehiculeData || !vehiculeData.typevehicule) {
            throw new Error("Type de véhicule introuvable.");
        }

        const typeVehiculeId = vehiculeData.typevehicule._id;
        
        const servicesDetails = await Service.aggregate([
            { $match: { _id: { $in: services.map(id => new mongoose.Types.ObjectId(id)) } } }, // Filtrer les services demandés
            { $unwind: "$historique" }, // Décomposer l'historique
            { $match: { "historique.typevehicule": typeVehiculeId } }, // Filtrer par type de véhicule
            { $sort: { "historique.date": -1 } }, // Trier par date décroissante
            { 
                $group: { // Garder uniquement l'historique le plus récent
                    _id: "$_id",
                    nom: { $first: "$nom" },
                    description: { $first: "$description" },
                    prix: { $first: "$historique.prix" },
                    duree: { $first: "$historique.duree" }
                } 
            }
        ]);

        const totalPrix = servicesDetails.reduce((sum, service) => sum + service.prix, 0);
        const totalDuree = servicesDetails.reduce((sum, service) => sum + service.duree, 0);

        return { totalPrix, totalDuree, details: servicesDetails };
    } catch (error) {
        console.error("Erreur lors du calcul du devis :", error);
        throw new Error("Erreur lors du calcul du devis.");
    }
}

router.get('/', async (req, res) => {
    try {
        let filters = {};
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Fixe la date du jour à minuit
        
        console.log("req.query = ", req.query);
        console.log("FUSEAU HORAIRE SERVEUR:", Intl.DateTimeFormat().resolvedOptions().timeZone);

        if (req.query.dateMin || req.query.dateMax) {
            filters.date = {};
            
            if (req.query.dateMin) {
                const dateMin = new Date(req.query.dateMin);
                dateMin.setUTCHours(0, 0, 0, 0); // Fixer à 00:00 UTC pour inclure toute la journée
                filters.date.$gte = dateMin;
            }
        
            if (req.query.dateMax) {
                const dateMax = new Date(req.query.dateMax);
                dateMax.setUTCHours(23, 59, 59, 999); // Fixer à 23:59 UTC pour inclure toute la journée
                filters.date.$lte = dateMax;
            }
        }               
        if (req.query.heureMin || req.query.heureMax) {
            let conditions = [];
            const timezoneOffset = -new Date().getTimezoneOffset(); // Décalage en minutes (ex: -180 pour UTC+3)
        
            if (req.query.heureMin) {
                const [heureMin, minuteMin] = req.query.heureMin.split(':').map(Number);
                const totalMin = heureMin * 60 + (minuteMin || 0) - timezoneOffset; // Ajuster en UTC
                conditions.push({ 
                    $gte: [ 
                        { 
                            $add: [ 
                                { $multiply: [{ $hour: "$date" }, 60] }, 
                                { $minute: "$date" } 
                            ] 
                        }, 
                        totalMin
                    ] 
                });
            }
        
            if (req.query.heureMax) {
                const [heureMax, minuteMax] = req.query.heureMax.split(':').map(Number);
                const totalMax = heureMax * 60 + (minuteMax || 0) - timezoneOffset; // Ajuster en UTC
                conditions.push({ 
                    $lte: [ 
                        { 
                            $add: [ 
                                { $multiply: [{ $hour: "$date" }, 60] }, 
                                { $minute: "$date" } 
                            ] 
                        }, 
                        totalMax
                    ] 
                });
            }
        
            if (conditions.length > 0) {
                if (filters.date) {
                    filters.$and = [
                        { date: filters.date },
                        { $expr: { $and: conditions } }
                    ];
                    delete filters.date; // Mettre tout dans `$and`
                } else {
                    filters.$expr = { $and: conditions };
                }
            }
        }
        
        if (req.query.typevehicule) {
            filters['vehicule.type'] = req.query.typevehicule;
        }

        if (req.query.nomUtilisateur) {
            const utilisateur = await Utilisateur.findOne({ nom: req.query.nomUtilisateur });
            if (utilisateur) {
                filters.utilisateur = utilisateur._id;
            }
        }

        if (req.query.service) {
            filters['services.service'] = req.query.service;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // console.log("Final filters before query:", JSON.stringify(filters, null, 2));

        const rendezvousList = await Rendezvous.find(filters)
            .populate('utilisateur', 'nom prenom')
            .populate('vehicule')
            .populate('services.service')
            .skip(skip)
            .limit(limit);

        res.json({ success: true, data: rendezvousList });
    } catch (error) {
        console.error("Erreur lors de la récupération des rendez-vous:", error);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});


module.exports = router;
