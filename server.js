// mongo

require('./config/db');

const express = require('express');
const app = express();
const port = 5000;

const UserRouter = require('./api/User');
const predictionRouter = require('./api/Prediction');
const authMiddleware = require('./middlewares/authMiddleware');

const bodyParser = require('body-parser');

// const bodyParser = require('express').json;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.get('/', (req, res) => {
    res.send('welcome to soil app backend');
});

app.use('/user', UserRouter);
app.use('/prediction', authMiddleware);
app.use('/prediction', predictionRouter)

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})



///////
