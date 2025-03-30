const mongoose = require('mongoose');
const Action = require('./Action');

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

RendezvousSchema.post('save', async function (doc, next) {
    try {
        console.log('🛠 Hook post-save exécuté, insertion des actions...');

        if (!doc.services || doc.services.length === 0) {
            console.warn('⚠️ Aucun service trouvé, pas d’action créée.');
            return next();
        }

         // Vérification de l'utilisateur avant l'insertion des actions
         if (!mongoose.Types.ObjectId.isValid(doc.utilisateur)) {
            console.error('ID utilisateur invalide:', doc.utilisateur);
            return next(new Error("L'utilisateur connecté est requis"));
        }

        await Promise.all(doc.services.map(({ service, prixEstime }) => {
            console.log(`📌 Création action pour service: ${service}, util : ${doc.utilisateur}`);
            return Action.create({
                service,
                vehicule: doc.vehicule,
                prix: prixEstime,
                etatPayement: 'non payé',
                rendezVous: doc._id,
                responsables: [],
                _userId: doc.utilisateur
            });
        }));

        console.log('✅ Actions insérées avec succès');
        next();
    } catch (error) {
        console.error('❌ Erreur lors de l’insertion des actions :', error);
        next(error);
    }
});


module.exports = mongoose.model('Rendezvous', RendezvousSchema);
