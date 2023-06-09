'use strict'

const mongoose = require('mongoose')

const DepositSchema = mongoose.Schema({
    Date:{
        type: Date,
        default: Date.now()
    },
    worker:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    noAccount:{
        type: Number,
        required: true
    },
    nameAccount:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    amount:{
        type: Number,
        required: true
    }
}, {versionKey: false})

module.exports = mongoose.model('Deposit', DepositSchema)