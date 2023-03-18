const express = require('express');
const router = express.Router();

// mongodb Predictions model
const User = require('./../models/Predictions');

router.post('/save', (req, res) => {
    console.log(req.body);
    let location = req.body.location;
    let prediction = req.body.prediction;
    res.send("received");
})

module.exports = router;