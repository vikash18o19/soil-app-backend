const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const refreshTokenModel = require('../models/refreshToken');

router.post('/signup', (req, res) => {
    let name = req.body.name;
    let phone = req.body.phone;
    let email = req.body.email;
    let password = req.body.password;
    name = name.trim();
    phone = phone.trim();
    email = email.trim();
    password = password.trim();

    if (name == "" || email == "" || phone == "" || password == "") {
        res.status(400).json({
            status: "FAILED",
            message: "Empty input fields"
        });
    } else if (!/^[a-zA-Z ]*$/.test(name)) {
        res.status(400).json({
            status: "FAILED",
            message: "Invalid name entered"
        });
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        res.status(400).json({
            status: "FAILED",
            message: "Invalid email entered"
        });
    } else if (password.length < 8) {
        res.status(400).json({
            status: "FAILED",
            message: "Password is too short"
        });
    } else {
        //checking if user already exists
        User.find({ email }).then((result) => {
            if (result.length) {
                // user already exists
                res.status(500).json({
                    status: "FAILED",
                    message: "User with the provided email already exists"
                })
            } else {
                // Try to create new user
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds)
                    .then(hashedPassword => {
                        const newUser = new User({
                            name,
                            phone,
                            email,
                            password: hashedPassword
                        });
                        newUser.save().then(result => {
                            // Generate token and refresh token
                            const token = jwt.sign({ userId: result._id }, 'secret', { expiresIn: '1h' });
                            const refreshToken = uuidv4();
                            const expirationDate = new Date();
                            expirationDate.setDate(expirationDate.getDate() + 30);
                            const newRefreshToken = new refreshTokenModel({
                                userId: result._id,
                                token: refreshToken,
                                expiresAt: expirationDate,
                            });
                            newRefreshToken.save()
                                .then(() => {
                                    res.status(201).json({
                                        status: "SUCCESS",
                                        message: "Signup successful",
                                        data: {
                                            token,
                                            refreshToken,
                                            user: result,
                                        },
                                    })
                                })
                                .catch(err => {
                                    console.log(err);
                                    res.status(500).json({
                                        status: "FAILED",
                                        message: "An error occurred while saving refresh token."
                                    })
                                })
                        })
                            .catch(err => {
                                res.status(500).json({
                                    status: "FAILED",
                                    message: "An error occurred while saving new user."
                                })
                            })
                    })
                    .catch((err) => {
                        res.status(500).json({
                            status: "FAILED",
                            message: "An error occurred while hashing the password"
                        })
                    })
            }

        }).catch(err => {
            console.log(err);
            res.status(500).json({
                status: "FAILED",
                message: "An error occurred while checking for existing user!"
            })
        })
    }
});




// Signin

router.post('/signin', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    email = email.trim();
    password = password.trim();

    if (email == "" || password == "") {
        res.status(400).json({
            status: "FAILED",
            message: "Empty input fields"
        });
    }
    else {
        User.findOne({ email })
            .then(user => {
                if (!user) {
                    res.status(400).json({
                        status: "FAILED",
                        message: "Invalid email or password"
                    });
                } else {
                    const hashedPassword = user.password;
                    bcrypt.compare(password, hashedPassword)
                        .then(result => {
                            if (result) {
                                // Generate token and refresh token
                                const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '1h' });
                                const refreshToken = uuidv4();

                                // Set expiration date for refreshToken
                                const expirationDate = new Date();
                                expirationDate.setDate(expirationDate.getDate() + 30); // 30 days in milliseconds

                                // Find and update existing refreshToken record
                                refreshTokenModel.findOneAndUpdate({ userId: user._id }, { token: refreshToken, expiresAt: expirationDate }, { new: true, upsert: true })
                                    .then((updatedToken) => {
                                        res.status(200).json({
                                            status: "SUCCESS",
                                            message: "signin successful",
                                            data: {
                                                token,
                                                refreshToken,
                                                user,
                                            },
                                        });
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        res.status(500).json({
                                            status: "FAILED",
                                            message: "An error occurred while updating refresh token."
                                        });
                                    });
                            } else {
                                res.status(400).json({
                                    status: "FAILED",
                                    message: "Invalid email or password"
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            res.status(500).json({
                                status: "FAILED",
                                message: "An error occurred while comparing passwords.",
                            });
                        });
                }
            })
            .catch(err => {
                console.log(err);
                res.status(500).json({
                    status: "FAILED",
                    message: "An error occurred while checking for existing user.",
                });
            });
    }
});



router.post('/refresh', (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        res.status(401).json({
            status: "FAILED",
            message: "Refresh token not provided"
        });
    } else {
        refreshTokenModel.findOne({ token: refreshToken })
            .then((foundToken) => {
                if (!foundToken) {
                    res.status(401).json({
                        status: "FAILED",
                        message: "Invalid refresh token"
                    });
                } else {
                    jwt.verify(foundToken.token, 'secret', (err, decoded) => {
                        if (err) {
                            refreshTokenModel.findByIdAndDelete(foundToken._id)
                                .then(() => {
                                    res.status(401).json({
                                        status: "FAILED",
                                        message: "Refresh token expired"
                                    });
                                })
                                .catch((err) => {
                                    console.log(err);
                                    res.status(500).json({
                                        status: "FAILED",
                                        message: "An error occurred while deleting expired refresh token"
                                    });
                                });
                        } else {
                            const userId = decoded.userId;
                            User.findById(userId)
                                .then((user) => {
                                    if (!user) {
                                        res.status(401).json({
                                            status: "FAILED",
                                            message: "Invalid refresh token"
                                        });
                                    } else {
                                        const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '1h' });
                                        const newRefreshToken = uuidv4();
                                        refreshTokenModel.findOneAndUpdate({ _id: foundToken._id }, { token: newRefreshToken }, { new: true })
                                            .then((updatedToken) => {
                                                res.status(200).json({
                                                    status: "SUCCESS",
                                                    message: "New token and refresh token generated",
                                                    data: {
                                                        token,
                                                        refreshToken: newRefreshToken,
                                                        user,
                                                    },
                                                });
                                            })
                                            .catch(err => {
                                                console.log(err);
                                                res.status(500).json({
                                                    status: "FAILED",
                                                    message: "An error occurred while updating refresh token."
                                                });
                                            });
                                    }
                                })
                                .catch((err) => {
                                    console.log(err);
                                    res.status(500).json({
                                        status: "FAILED",
                                        message: "An error occurred while finding user"
                                    });
                                });
                        }
                    });
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(500).json({
                    status: "FAILED",
                    message: "An error occurred while finding refresh token"
                });
            });
    }
});

module.exports = router;