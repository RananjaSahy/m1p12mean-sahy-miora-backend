const mongoose = require('mongoose');

const Statut = require('./Statut');
const config = require('../config/variable.json');

const ActionSchema = new mongoose.Schema({
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    etatPayement: { type: String, enum: ['payé', 'non payé'], required: true},
    vehicule: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicule', required: true },
    prix: { type: Number, required: true },
    responsables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur' }],
    depend_de: { type: mongoose.Schema.Types.ObjectId, ref: 'Action' },
    rendezVous: { type: mongoose.Schema.Types.ObjectId, ref: 'Rendezvous' },
    _userId : { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur'}
   }, { timestamps: true });
   
   ActionSchema.pre("save", function (next) {
    console.log("🔍 Vérification avant save :", this);
     if (!this._userId) {
       return next(new Error("L'utilisateur connecté est requis"));
     }
     next();
   });

   ActionSchema.post('save', async function (doc, next) {
       try {
           await Statut.create({
               action: doc._id,
               utilisateur: doc._userId,
               etat: config.etatstatut.plannifie
           });
           next();
       } catch (error) {
           next(error);
       }
   });

module.exports = mongoose.model('Action', ActionSchema);

   