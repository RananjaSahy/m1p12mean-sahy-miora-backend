const mongoose = require('mongoose');

const StatutSchema = new mongoose.Schema({
    action: { type: mongoose.Schema.Types.ObjectId, ref: 'Action', required:true },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true},
    etat: { type: Number, required: true }
   }, { timestamps: true });

module.exports = mongoose.model('Statut', StatutSchema);