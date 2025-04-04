const Action = require('../models/Action');
const Utilisateur = require('../models/Utilisateur');
const constantes = require('../config/variable.json');
const Rendezvous = require('../models/Rendezvous');
  
exports.getMecanicienOccupation = async (req, res) => {
    try {
        const { dateMin, dateMax } = req.query;
        const dateFilter = {};

        if (dateMin) {
            const startDate = new Date(dateMin);
            startDate.setHours(0, 0, 0, 0);
            dateFilter['updatedAt'] = { $gte: startDate };
        }

        if (dateMax) {
            const endDate = new Date(dateMax);
            endDate.setHours(23, 59, 59, 999);
            dateFilter['updatedAt'] = dateFilter['updatedAt'] || {};
            dateFilter['updatedAt'].$lte = endDate;
        }

        const mecaniciens = await Utilisateur.find({ role: 'mecanicien' }).select('nom prenom');

        const actionsParMecanicien = await Action.find({
            responsables: { $exists: true, $ne: [] }, 
            ...dateFilter
        })
        .populate({
            path: "statutActuel", 
            select: "etat", 
            options: { sort: { createdAt: -1 } } 
        })
        .populate("responsables", "nom prenom") 
        .select("responsables statutActuel");

        const actionsFiltrees = actionsParMecanicien.filter(action => {
            return action.statutActuel && action.statutActuel.etat !== constantes.etatstatut.termine;
        });

        const occupationMap = {};

        actionsFiltrees.forEach(action => {
            action.responsables.forEach(responsable => {
                if (!occupationMap[responsable._id]) {
                    occupationMap[responsable._id] = { totalActions: 0 };
                }
                occupationMap[responsable._id].totalActions += 1;
            });
        });
        const data = mecaniciens.map(mecano => ({
            mecanoId: mecano._id,
            nom: mecano.nom,
            prenom: mecano.prenom,
            totalActions: occupationMap[mecano._id]?.totalActions || 0
        }));

        res.status(200).json(data);
    } catch (error) {
        console.error("Erreur récupération taux d'occupation :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};

exports.getInvoiceByRendezvous = async (req, res) => {
    try {
      const { idRendezvous } = req.params;
      
      // Récupérer le rendez-vous avec l'utilisateur associé
      const rendezvous = await Rendezvous.findById(idRendezvous)
        .populate('utilisateur', 'nom prenom email')  // Peupler l'utilisateur du rendez-vous
        .exec();
  
      if (!rendezvous) {
        return res.status(404).json({ message: "Rendez-vous non trouvé." });
      }
  
      // Récupérer les actions associées à ce rendez-vous
      const actions = await Action.find({ rendezVous: idRendezvous })
        .populate('service', 'nom prix')  
        .populate('vehicule', 'matricule libelle')  // Vous récupérez déjà les informations du véhicule
        .exec();
  
      if (actions.length === 0) {
        return res.status(404).json({ message: "Aucune action trouvée pour ce rendez-vous." });
      }
  
      let total = 0;
      const invoiceItems = actions.map((action, index) => {
        const totalPrice = action.prix;
        total += totalPrice;
  
        return {
          id: index + 1,
          item: action.service.nom,
          price: action.prix,
          total: totalPrice,
        };
      });
  
      // Inclure les informations de l'utilisateur et du véhicule
      const utilisateur = rendezvous.utilisateur;  // Utilisateur est associé au rendez-vous
      const vehicule = actions[0].vehicule;  // Puisque toutes les actions sont pour le même véhicule
  
      return res.status(200).json({
        rendezvous: idRendezvous,
        utilisateur: {
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          email: utilisateur.email,
        },
        vehicule: {
          matricule: vehicule.matricule,
          libelle: vehicule.libelle,
        },
        items: invoiceItems,
        total: total,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur interne du serveur" });
    }
  };
  

