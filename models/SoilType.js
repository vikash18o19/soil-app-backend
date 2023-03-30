const mongoose = require('mongoose');

const SoilTypeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soilType: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
});

SoilTypeSchema.index({ location: '2dsphere' });

const SoilType = mongoose.model('SoilType', SoilTypeSchema);

module.exports = SoilType;