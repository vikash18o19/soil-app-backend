const express = require('express');
const SoilType = require('./../models/SoilType.js');
const router = express.Router();

// mongodb Predictions model
const User = require('./../models/SoilType.js');

router.post('/save', (req, res) => {
    console.log(req.body);
    let userId = req.body.userId;
    let latitude = req.body.latitude;
    let longitude = req.body.longitude;
    let prediction = req.body.prediction;
    prediction = prediction.trim();
    const newSoilType = new SoilType({
        userId,
        latitude,
        longitude,
        soilType: prediction,
    });
    newSoilType.save().then(result => {
        res.status(200).json({
            status: "SUCCESS",
            message: "Save Successfull",
            data: {
                result
            },
        })
    })
        .catch(err => {
            res.status(500).json({
                status: "FAILED",
                message: "An error occurred while saving prediction.",
                details: err,
            })
        })
})

module.exports = router;