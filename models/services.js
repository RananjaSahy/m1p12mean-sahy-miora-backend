const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    description: { type: String, required: true },
    historique: [
        {
            date: { type: Date, required: true, default: Date.now },
            prix: { type: Number, required: true }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
