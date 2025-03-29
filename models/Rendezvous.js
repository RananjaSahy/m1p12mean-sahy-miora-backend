const mongoose = require('mongoose');

const RendezvousSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    vehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicule', required: true },
    services: [{
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        prixEstime: { type: Number, required: true }, // Prix en fonction du type de véhicule
        dureeEstimee: { type: Number, required: true } // Durée estimée en fonction du type de véhicule
    }],
    commentaire: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Rendezvous', RendezvousSchema);
