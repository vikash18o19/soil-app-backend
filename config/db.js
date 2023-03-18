const mongoose = require('mongoose');
const { log } = require('util');
require('dotenv').config();
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("DB Connected");
    })
    .catch((err) => {
        console.log(err);
    });