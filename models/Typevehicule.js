const mongoose = require('mongoose');

const TypevehiculeSchema = new mongoose.Schema({
    libelle: { type: String, required: true },
    description: { type: String, required: false }
   }, { timestamps: true });

module.exports = mongoose.model('Typevehicule', TypevehiculeSchema);