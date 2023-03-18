const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PredSchema = new Schema({
    prediction: String,
    location: [Number],
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference the User model
        // required: true,
    },
});

const Pred = mongoose.model('Pred', PredSchema);

module.exports = Pred;