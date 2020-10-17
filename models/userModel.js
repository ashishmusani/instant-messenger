const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userModel = Schema({
    username: String,
    password: String,
    isOnline: Boolean,
    lastSeen: Date,
    isMobileDevice: Boolean,
    currentSocketId: String
});
module.exports = mongoose.model('User', userModel);