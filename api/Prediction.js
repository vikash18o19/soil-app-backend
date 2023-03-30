const express = require('express');
const SoilType = require('./../models/SoilType.js');
const router = express.Router();
const geolib = require('geolib');
// mongodb Predictions model
// const User = require('./../models/SoilType.js');

router.post('/save', async (req, res) => {
    try {
        const { userId, prediction, latitude, longitude } = req.body;

        // Create a new soil type object
        const newSoilType = new SoilType({
            userId,
            soilType: prediction,
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
            },
        });

        // Save the new soil type object to the database
        const savedSoilType = await newSoilType.save();

        res.status(201).json(savedSoilType);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});



router.post('/search', async (req, res) => {
    const { latitude, longitude, radius } = req.body;

    try {
        const nearbySoilTypes = await SoilType.find({
            location: {
                $geoWithin: {
                    $centerSphere: [
                        [longitude, latitude],
                        radius / 6371 // 6371 km is the radius of the Earth
                    ]
                }
            }
        });
        const count = nearbySoilTypes.length;
        res.json({
            count: count,
            data: nearbySoilTypes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;