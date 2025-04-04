const mongoose = require('mongoose');
const leanVirtuals = require('mongoose-lean-virtuals');
const constantes = require('../config/variable.json'); // Importer le fichier JSON

const etatMessages = {
    [constantes.etatstatut.annule]: "Annulé",
    [constantes.etatstatut.plannifie]: "Planifié",
    [constantes.etatstatut.encours]: "En cours",
    [constantes.etatstatut.termine]: "Terminé"
};

const StatutSchema = new mongoose.Schema({
    action: { type: mongoose.Schema.Types.ObjectId, ref: 'Action', required:true },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true},
    etat: { type: Number, required: true }
   }, { timestamps: true });

    StatutSchema.virtual('etatString').get(function () {
        return etatMessages[this.etat] || "Statut inconnu";
    });

    // Activer les champs virtuels lors des conversions en JSON ou en objet
    StatutSchema.set('toJSON', { virtuals: true });
    StatutSchema.set('toObject', { virtuals: true });

    StatutSchema.plugin(leanVirtuals);

module.exports = mongoose.model('Statut', StatutSchema);