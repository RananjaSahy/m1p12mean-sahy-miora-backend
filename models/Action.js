const mongoose = require('mongoose');

const ActionSchema = new mongoose.Schema({
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    etatPayement: { type: String, enum: ['payé', 'non payé']},
    vehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicule', required: true },
    prix: { type: Number, required: true },
    responsables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' }],
    depend_de: { type: mongoose.Schema.Types.ObjectId, ref: 'Action' },
    rendezVous: { type: mongoose.Schema.Types.ObjectId, ref: 'Rendezvous' },
   }, { timestamps: true });

module.exports = mongoose.model('Action', ActionSchema);

   