const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const Utilisateur = require('../models/Utilisateur');
require('dotenv').config();

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// 📌 Route d'inscription (Client seulement)
router.post('/register', [
    body('email').isEmail(),
    body('mdp').isLength({ min: 6 }),
    body('nom').notEmpty(),
    body('prenom').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { email, mdp, nom, prenom } = req.body;
        let user = await Utilisateur.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Utilisateur déjà existant' });

        user = new Utilisateur({ email, mdp, nom, prenom, role: 'client' });
        await user.save();

        res.status(201).json({ msg: 'Utilisateur créé avec succès' });
    } catch (err) {
        console.error('Erreur: ', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

router.post('/login', [
    body('email').isEmail(),
    body('mdp').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { email, mdp } = req.body;
        const user = await Utilisateur.findOne({ email, role: 'client' });
        if (!user) return res.status(400).json({ msg: 'Email ou mot de passe incorrect' });

        const isMatch = await user.comparePassword(mdp);
        if (!isMatch) return res.status(400).json({ msg: 'Email ou mot de passe incorrect' });

        const token = generateToken(user);
        res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
    } catch (err) {
        console.error('Erreur: ', err);
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});


module.exports = router;