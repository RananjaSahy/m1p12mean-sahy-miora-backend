const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Utilisateur = require('../models/Utilisateur');

const authMiddleware = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// Connexion staff (manager + mécaniciens)
router.post('/login', [
    body('email').isEmail(),
    body('mdp').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) return res.status(400).json({errors: errors.array});

    try{
        const {email, mdp} = req.body;
        const user = await Utilisateur.findOne({email, role: { $in: ['mecanicien', 'manager'] }});
        if (!user) return res.status(400).json({ msg: 'Email ou mot de passe incorrect' });
        
        const isMatch = await user.comparePassword(mdp);
        if (!isMatch) return res.status(400).json({ msg: 'Email ou mot de passe incorrect' });

        const token = generateToken(user);
        res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
    } catch(err) {
        console.error('Erreur: ', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// Inscription mécanicien (Protégé : accessible seulement au manager)
router.post('/register-mecanicien',authMiddleware(['manager']), [
    body('email').isEmail(),
    body('mdp').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('nom').notEmpty().withMessage('Le nom est requis'),
    body('prenom').notEmpty().withMessage('Le prenom est requis'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { email, mdp, nom, prenom } = req.body;
        let user = await Utilisateur.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Utilisateur déjà existant' });

        user = new Utilisateur({ email, mdp, nom, prenom, role: 'mecanicien', createdBy: req.user.id});
        await user.save();

        res.status(201).json({ msg: 'Mécanicien créé avec succès' });
    } catch (err) {
        console.error('Erreur: ', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});
module.exports = router;