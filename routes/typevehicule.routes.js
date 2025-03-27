// const authMiddleware = require("../middlewares/authMiddleware");
// const Typevehicule = require("../models/Typevehicule");

// const express = require('express');
// const router = express.Router();

// router.post('/', authMiddleware(['manager']), async (req,res) => {
//     try{
//         const typevehicule = new Typevehicule(req.body);
//         await typevehicule.save();
//         res.status(201).json(typevehicule);
//     }catch(error){
//         res.status(400).json({ message: error.message });
//     }
// });

// router.get('/', async(req,res) => {
//     try{
//         const typevehicules =await Typevehicule.find();
//         res.json(typevehicules);
//     }catch(error){
//         res.status(500).json({ message: error.message });
//     }
// });

// router.get('/:id', async(req,res) => {
//     try {
//         const typevehicule = await Typevehicule.findById(req.params.id);
//         if (!typevehicule) return res.status(404).json({ message: 'Type véhicule non trouvé' });
//         res.status(200).json(typevehicule);
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// });

// module.exports = router;


const authMiddleware = require("../middlewares/authMiddleware");
const Typevehicule = require("../models/Typevehicule");

const express = require('express');
const router = express.Router();

router.post('/', authMiddleware(['manager']), async (req,res) => {
    try{
        const typevehicule = new Typevehicule(req.body);
        await typevehicule.save();
        res.status(201).json(typevehicule);
    }catch(error){
        res.status(400).json({ message: error.message });
    }
});

router.get('/', async(req,res) => {
    try{
        const { page = 1, limit, search = "", order = "asc", sort = "libelle" } = req.query;
        const searchQuery = search
        ? {
              $or: [
                  { libelle: { $regex: search, $options: "i" } },
                  { description: { $regex: search, $options: "i" } },
              ],
          }
        : {};
        const totalTypevehicule = await Typevehicule.countDocuments({...searchQuery });
        const sortOrder = order === "desc" ? -1 : 1;
        let query = Typevehicule.find({ ...searchQuery }).sort({ [sort]: sortOrder });

        if (limit && parseInt(limit) > 0) {
            query = query.skip((page - 1) * limit).limit(parseInt(limit));
        }

        const typevehicules = await query;
        res.status(200).json({typevehicules, total: totalTypevehicule});
    }catch(error){
        res.status(500).json({message : error.message});
        console.log(error.message);
    }
});

router.get('/:id', async(req,res) => {
    try {
        const typevehicule = await Typevehicule.findById(req.params.id);
        if (!typevehicule) return res.status(404).json({ message: 'Type véhicule non trouvé' });
        res.status(200).json(typevehicule);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;