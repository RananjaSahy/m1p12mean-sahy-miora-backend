const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UtilisateurSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    mdp: { type: String, required: true },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    role: { type: String, required: true, enum: ['client', 'mecanicien', 'manager'] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Utilisateur', required: false },
   }, { timestamps: true });

// Hash du mot de passe avant sauvegarde
UtilisateurSchema.pre('save', async function (next) {
  if (!this.isModified('mdp')) return next();

  try {
      const salt = await bcrypt.genSalt(10);
      this.mdp = await bcrypt.hash(this.mdp, salt);
      next();
  } catch (err) {
      next(err);
  }
});
  
  // Vérifier le mot de passe
  UtilisateurSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.mdp);
  };

module.exports = mongoose.model('Utilisateur', UtilisateurSchema);
   