const express = require('express');
const mongoose = require('mongoose');
const Action = require('./models/Action'); // Assurez-vous que le chemin est correct

const router = express.Router();
router.post('/', async (req, res) => {
    try {
        const action = new Action(req.body);
        await action.save();
        res.status(201).json(action);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/', async (req, res) => {
    try {
        const actions = await Action.find().populate('service vehicule responsables depend_de rendezVous');
        res.json(actions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const action = await Action.findById(req.params.id).populate('service vehicule responsables depend_de rendezVous');
        if (!action) return res.status(404).json({ error: 'Action non trouvée' });
        res.json(action);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// router.put('/:id', async (req, res) => {
//     try {
//         const action = await Action.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
//         if (!action) return res.status(404).json({ error: 'Action non trouvée' });
//         res.json(action);
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// });

module.exports = router;
