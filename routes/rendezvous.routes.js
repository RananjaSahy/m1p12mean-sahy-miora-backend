const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const Rendezvous = require('../models/Rendezvous');
const authMiddleware = require('../middlewares/authMiddleware');
const nodemailer = require('nodemailer');
const Service = require('../models/Service');
const Mail = require('../models/Mail');
const Vehicule = require('../models/Vehicule');
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

// router.post('/comfirmer', authMiddleware(['client']), async (req, res) => {
//     try {
//         const utilisateur = req.user.id; // ID de l'utilisateur extrait du token
//         const { date, vehicule, services, commentaire } = req.body;

//         // Vérifier si l'ID du véhicule est valide
//         if (!mongoose.Types.ObjectId.isValid(vehicule)) {
//             return res.status(400).json({ message: "ID du véhicule invalide." });
//         }
//         const servicesValides = services.filter(s => mongoose.Types.ObjectId.isValid(s));

//         // Vérifier et formater la date correctement
//         const formattedDate = new Date(date);
//         if (isNaN(formattedDate.getTime())) {
//             return res.status(400).json({ message: "Date invalide." });
//         }
//         const devis = await calculDevis(date,vehicule,services);
//         // Validation complète avant insertion
//         const validation = await validerRendezvous(formattedDate, vehicule, servicesValides);
//         if (!validation.valid) {
//             return res.status(400).json({ message: validation.message });
//         }

//         // Enregistrement du rendez-vous
//         const nouveauRendezvous = new Rendezvous({
//             date: formattedDate,
//             utilisateur,
//             vehicule,
//             services: servicesValides,
//             commentaire
//         });

//         await nouveauRendezvous.save();
//         const servicesNoms = await Service.find({ _id: { $in: servicesValides } }).lean();
//         const servicesConcat = servicesNoms.map(s => s.nom).join(', ');
//         await  sendMailUsingTemplate(formattedDate,servicesConcat);

//         res.status(201).json({ message: "Rendez-vous enregistré avec succès !", prix: devis });
//     } catch (error) {
//         console.log("Erreur backend :", error);
//         res.status(500).json({ msg: "Erreur serveur." });
//     }
// });


router.post('/confirmer', authMiddleware(['client']), async (req, res) => {
    try {
        const utilisateur = req.user.id; // ID de l'utilisateur extrait du token
        const { date, vehicule, services, commentaire } = req.body;

        if (!mongoose.Types.ObjectId.isValid(vehicule)) {
            return res.status(400).json({ message: "ID du véhicule invalide." });
        }

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

        servicesValides.forEach(service => {
            // Trouver l'historique correspondant au type de véhicule et actif
            const historiqueFiltre = service.historique
                .filter(h => h.etat && h.typevehicule && h.typevehicule._id.toString() === vehicule)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0]; // Prendre le plus récent

            if (historiqueFiltre) {
                servicesRendezVous.push({
                    service: service._id,
                    prixEstime: historiqueFiltre.prix,
                    dureeEstimee: historiqueFiltre.duree
                });
                totalPrix += historiqueFiltre.prix;
                totalDuree += historiqueFiltre.duree;
            }
        });

        const nouveauRendezvous = new Rendezvous({
            date: formattedDate,
            utilisateur,
            vehicule,
            services: servicesRendezVous,
            commentaire
        });

        await nouveauRendezvous.save();

        // Générer le PDF avec les prix estimés
        const pdfPath = await generateDevisPDF(formattedDate, servicesRendezVous, totalPrix, totalDuree);
            await sen
        res.status(201).json({ 
            message: "Rendez-vous enregistré avec succès !", 
            prixTotal: totalPrix,
            dureeTotale: totalDuree,
            pdf: pdfPath
        });

    } catch (error) {
        console.log("Erreur backend :", error);
        res.status(500).json({ msg: "Erreur serveur." });
    }
});


// router.get('/mes-rendezvous', authMiddleware(['client']), async (req, res) => {
//     try {
//         const utilisateurId = req.user.id;

//         const rendezvous = await Rendezvous.find({ utilisateur: utilisateurId })
//             .populate('vehicule')
//             .populate('services');

//         res.status(200).json(rendezvous);
//     } catch (error) {
//         console.error("Erreur lors de la récupération des rendez-vous :", error);
//         res.status(500).json({ msg: "Erreur serveur." });
//     }
// });

router.get('/mes-rendezvous', authMiddleware(['client']), async (req, res) => {
    try {
        const utilisateurId = req.user.id;

        // Récupérer les rendez-vous avec les services et le véhicule associé
        const rendezvous = await Rendezvous.find({ utilisateur: utilisateurId })
            .populate({
                path: 'vehicule',
                select: 'libelle typevehicule' // On récupère le type du véhicule
            })
            .populate({
                path: 'services',
                select: 'nom description historique' // On récupère l'historique des prix
            });

        // Formatter les données pour ajouter prix et durée estimés
        const formattedRendezvous = rendezvous.map(rdv => {
            const servicesFormatted = rdv.services.map(service => {
                // Filtrer l'historique pour ne garder que celui du type de véhicule du rendez-vous
                const historiqueValide = service.historique.find(hist =>
                    hist.typevehicule.equals(rdv.vehicule.typevehicule) && hist.etat
                );

                return {
                    _id: service._id,
                    nom: service.nom,
                    description: service.description,
                    prixEstime: historiqueValide ? historiqueValide.prix : null,
                    dureeEstimee: historiqueValide ? historiqueValide.duree : null
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


async function  sendMailUsingTemplate(date,services,totalPrix,totalDuree){
    try{
        const auth = {
            user:process.env.USER_MAIL,
            pass:process.env.USER_PASS
        };
        const toEmail = "voninolivam@gmail.com"
        const froms = process.env.USER_ADRESS
        await Mail(auth,toEmail,froms,date,services,totalPrix,totalDuree);
    }catch(eror){
        console.log("error");
    }
}

// devis
async function calculDevis(date, vehicule, services) {
    try {
        if (!services || services.length === 0) {
            return { totalPrix: 0, totalDuree: 0, details: [] }; 
        }

        console.log("🔹 Services demandés :", services);
        console.log("🔹 ID du véhicule :", vehicule);

        // Récupérer le type de véhicule à partir de l'ID du véhicule
        const vehiculeData = await Vehicule.findById(vehicule).populate('typevehicule');
        if (!vehiculeData || !vehiculeData.typevehicule) {
            throw new Error("Type de véhicule introuvable.");
        }

        const typeVehiculeId = vehiculeData.typevehicule._id;
        console.log("🔹 Type de véhicule trouvé :", typeVehiculeId);

        // Récupérer les services demandés avec seulement l'historique le plus récent
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

        console.log("🔹 Services trouvés :", servicesDetails);

        // Calculer le total du devis
        const totalPrix = servicesDetails.reduce((sum, service) => sum + service.prix, 0);
        const totalDuree = servicesDetails.reduce((sum, service) => sum + service.duree, 0);

        return { totalPrix, totalDuree, details: servicesDetails };
    } catch (error) {
        console.error("Erreur lors du calcul du devis :", error);
        throw new Error("Erreur lors du calcul du devis.");
    }
}



router.get('/mail', async (req, res) => {
    try {
        // Configuration du transporteur SMTP
        const transporter = nodemailer.createTransport({
            host: 'smtp.mailersend.net',
            port: 587,
            secure: false, // true pour le port 465, false pour les autres ports
            auth: {
                user: 'MS_CxWqJP@trial-eqvygm0zr8dl0p7w.mlsender.net', // Ton adresse email vérifiée
                pass: 'mssp.oAkDMyx.0r83ql3j1k0gzw1j.vwCuibS', // Ton API Key
            },
        });

        // Configuration de l'email
        const mailOptions = {
            from: 'MeanAppli <MS_CxWqJP@trial-eqvygm0zr8dl0p7w.mlsender.net>', // Expéditeur
            to: 'voninolivam@gmail.com', // Destinataire
            subject: 'Subject', // Sujet
            text: 'Greetings from the team, you got this message through MailerSend.', // Texte brut
            html: 'Greetings from the team, you got this message through MailerSend.', // HTML
        };

        // Envoi de l'email
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);
        res.status(200).send("Email sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).send("Error sending email");
    }
});
module.exports = router;
