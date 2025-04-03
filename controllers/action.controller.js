const Action = require('../models/Action');
const Utilisateur = require('../models/Utilisateur');
const constantes = require('../config/variable.json');

  
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
