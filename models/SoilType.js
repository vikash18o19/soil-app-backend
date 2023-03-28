const mongoose = require('mongoose');

const SoilTypeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true,
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  soilType: {
    type: String,
    required: true
  }
});

const SoilType = mongoose.model('SoilType', SoilTypeSchema);

module.exports = SoilType;
