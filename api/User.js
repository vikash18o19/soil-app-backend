const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

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
                                    message: "An error occurred while saving new user.",
                                    error: err,
                                })
                            })
                    })
                    .catch((err) => {
                        res.status(500).json({
                            status: "FAILED",
                            message: "An error occurred while hashing the password",
                            error: err
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



router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({
            status: "FAILED",
            message: "User with the provided email does not exist"
        });
    }

    // Generate password reset token
    const token = jwt.sign({ userId: user._id }, 'secret', { expiresIn: '1h' });

    // Update user record with password reset token
    user.passwordResetToken = token;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour

    try {
        await user.save();

        // Create reusable transporter object using the default SMTP transport
        // let transporter = nodemailer.createTransport({
        //     service: 'gmail',
        //     auth: {
        //         user: process.env.EMAIL,
        //         pass: process.env.PASSWORD
        //     }
        // });

        // send mail with defined transport object
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });
        await transporter.sendMail({
            from: '"The Soil App" <soil.app.bit@gmail.com>', // sender address
            to: user.email, // list of receivers
            subject: "Password Reset", // Subject line
            text: `Please click the following link or paste it into your browser to reset your password:\n\n${process.env.CLIENT_URL}/reset-password/${token}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.`, // plain text body
            html: `<p>Please click the following link or paste it into your browser to reset your password:</p><p><a href="${process.env.CLIENT_URL}/reset-password/${token}">${process.env.CLIENT_URL}/reset-password/${token}</a></p><p>If you did not request this, please ignore this email and your password will remain unchanged.</p>` // html body
        });

        res.status(200).json({
            status: "SUCCESS",
            message: "Password reset link sent to your email"
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while sending password reset email."
        });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    const { password, confirmPassword, token } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({
            status: "FAILED",
            message: "Passwords do not match"
        });
    }

    try {
        // Verify password reset token
        const decoded = jwt.verify(token, 'secret');
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
            return res.status(400).json({
                status: "FAILED",
                message: "Invalid password reset token"
            });
        }
        if (user.passwordResetToken == null || token != user.passwordResetToken) {
            return res.status(400).json({
                status: "FAILED",
                message: "Invalid request"
            });
        }
        if (Date.now() > user.passwordResetExpires) {
            return res.status(400).json({
                status: "FAILED",
                message: "Password reset token has expired"
            });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        // Delete all refresh tokens for the user
        await refreshTokenModel.deleteMany({ userId: user._id });

        res.status(200).json({
            status: "SUCCESS",
            message: "Password reset successful"
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred while resetting password."
        });
    }
});

module.exports = router;