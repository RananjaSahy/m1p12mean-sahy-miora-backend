const jwt = require('jsonwebtoken');

module.exports = (roles = []) => (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ msg: 'Accès refusé' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;

        // Vérifier le rôle si nécessaire
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ msg: "Accès interdit" });
        }
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token invalide' });
    }
};
