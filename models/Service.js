const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    description: { type: String, required: true },
    etat: { type: Boolean, required: true },
    historique: [
        {
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Ajout de l'ID automatique
            date: { type: Date, required: true, default: Date.now },
            prix: { type: Number, required: true },
            duree: { type: Number, required: true }, // Durée en minutes
            etat: { type: Boolean, required: true, default: true }, // Etat avec une valeur par défaut
            typevehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Typevehicule', required: true } // Référence au type de véhicule
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
