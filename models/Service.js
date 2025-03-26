const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    description: { type: String, required: true },
    etat : {type:Boolean,required : true},
    historique: [
        {
            date: { type: Date, required: true, default: Date.now },
            prix: { type: Number, required: true },
            duree: { type: Number, required: true }, // Durée en nombre
            etat:{type:Boolean,required:true},
            typevehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Typevehicule', required: true } // Référence au type de véhicule
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);