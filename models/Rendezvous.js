const mongoose = require('mongoose');

const RendezvousSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    vehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicule', required: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    commentaire: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Rendezvous', RendezvousSchema);
