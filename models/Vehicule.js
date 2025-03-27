// const mongoose = require('mongoose');

// const VehiculeSchema = new mongoose.Schema({
//     matricule: { type: String, required: true, unique: true },
//     libelle: { type: String, required: true },
//     description: { type: String, required: false },
//     utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
//     typevehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Typevehicule', required: false }
//    }, { timestamps: true });

// module.exports = mongoose.model('Vehicule', VehiculeSchema);

const mongoose = require('mongoose');

const VehiculeSchema = new mongoose.Schema({
    matricule: { type: String, required: true, unique: true },
    libelle: { type: String, required: true },
    description: { type: String, required: false },
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: true },
    typevehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Typevehicule', required: false }
   }, { timestamps: true });

module.exports = mongoose.model('Vehicule', VehiculeSchema);

   