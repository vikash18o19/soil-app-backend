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

        res.status(201).json({ message: "saved successfully", data: savedSoilType });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: 'Server Error', error: err });
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

router.post('/history', async (req, res) => {
    const { userId } = req.body;

    try {
        const history = await SoilType.find({
            userId: userId
        });
        const count = history.length;
        res.json({
            count: count,
            data: history
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error });
    }
});

router.delete('/delete', async (req, res) => {
    const { id } = req.body;
    try {
        const deletedSoilType = await SoilType.findByIdAndDelete(id);
        if (!deletedSoilType) {
            return res.status(404).json({ message: 'Soil Type not found' });
        }
        res.json({ message: 'Soil Type deleted successfully', data: deletedSoilType });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error });
    }
});




module.exports = router;