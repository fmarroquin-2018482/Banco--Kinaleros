'use strict'

const Transfer = require('./transfer.model')
const User = require('../user/user.model')
const moment = require('moment')
const { default: mongoose } = require('mongoose')

exports.test = async (req, res) => {
    res.send({ message: 'Test transfer is running' })
}

exports.save = async (req, res) => {
    try {
        //obtener data
        let data = req.body
        //obtener el token del usuario que hara la transferencia
        let token = req.user.sub
        //guardar la data del remitente
        data.sender = token

        let senderExit = await User.findOne({ _id: token })
        if (!senderExit) return res.status(400).send({ message: "El usuario no existe" })

        //el usuario no puede hacer mas de 10000 en transferencias al dia
        let horaIni = moment().startOf('day').utcOffset(-6).subtract(6, 'hour').toDate()/* .format('M/D/YYYY, h:mm A') */;

        let horaFin = moment().endOf('day').utcOffset(-6).subtract(6, 'hour').toDate()/* .format('M/D/YYYY, h:mm A') */;

        //obtener las transferencias del dia
        let totalTransfers = await Transfer.aggregate([
            {
                $match: {
                    sender: senderExit._id,
                    date: {
                        $gte: horaIni,
                        $lte: horaFin
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);

        // Validar si el total de transferencias supera los 10000
        if (totalTransfers.length > 0 && totalTransfers[0].total >= 10000) {
            return res.status(400).send({ message: "Ha excedido el límite de transferencias para el día actual" });
        }

        //validar que el remitente tenga el dinero suficiente
        let sender = await User.findOne({ _id: token })
        if (sender.money < data.amount) return res.status(400).send({ message: "No tiene suficiente dinero" })
        else if (data.amount > 2000) return res.status(400).send({ message: "No puede transferir mas de 2000" })

        //validar que el numero de cuenta que pone sea el mismo que el nombre
        let receiver = await User.findOne({ noAccount: data.noAccount })
        if (receiver._id != data.receiver) return res.status(400).send({ message: "El numero de cuenta no coincide con el nombre" })

        await User.findOneAndUpdate({ _id: sender._id }, {
            $inc: { money: Number(data.amount) * -1 }
        }, { new: true });

        await User.findOneAndUpdate({ _id: receiver._id }, {
            $inc: { money: Number(data.amount) }
        }, { new: true });

        //guardar transferencia
        let transfer = new Transfer(data)
        await transfer.save()
        return res.send({ message: "Transferencia realizada con exito" })
    } catch (err) {
        console.error(err)
    }
}

//update no tiene que ir en el proyecto
exports.update = async (req, res) => {
    try {
        //obtener id de la transferencia
        let transferId = req.params.id
        //obtener data de la transferencia
        let data = req.body

        //obtener datos de la transferencias
        let transfer = await Transfer.findOne({ _id: transferId })
        if (!transfer) return res.status(400).send({ message: "No se encontro la transferencia" })

        let sender = await User.findOne({ _id: transfer.sender })
        let receiver = await User.findOne({ _id: transfer.receiver })

        //cambiar la cantidad del sender
/*         await User.findOneAndUpdate({ _id: sender._id }, {
            $inc: { money: Number(transfer.amount) },
            $inc: { money: Number(data.amount) * -1}
        }, { new: true }); */

        //cambiar la cantida del receiver
/*         await User.findOneAndUpdate({ _id: receiver._id }, {
            $inc: { money: Number(data.amount) }
        }, { new: true });
 */

        //actualizar la transferencia
        let updateTransfer = await Transfer.findOneAndUpdate(
            { _id: transferId },
            data,
            { new: true }
        )
        if (!updateTransfer) return res.status(400).send({ message: "No se realizo la actualizacion de la transferencia" })
        return res.send({ message: "Actualizacion de transferencia realizada con exito" })
    } catch (err) {
        console.error(err)
    }
}

exports.cancel = async (req, res) => {
    try {
        //obtener id de la transferencia
        let transferId = req.params.id

        //obtener datos de la transferencias
        let transfer = await Transfer.findOne({ _id: transferId })
        if (!transfer) return res.status(400).send({ message: "No se encontro la transferencia" })

        //validacion de tiempo
        let hora = moment()
        let trasnferHour = moment(transfer.date)

        let diff = hora.diff(trasnferHour, 'minutes')

        if (diff > 1) return res.status(400).send({ message: "No se puede revertir la transferencia :(" })

        let sender = await User.findOne({ _id: transfer.sender })
        let receiver = await User.findOne({ _id: transfer.receiver })

        //regresar la cantidad de dinero al emisor
        await User.findOneAndUpdate({ _id: sender._id }, {
            $inc: { money: Number(transfer.amount) }
        }, { new: true });

        await User.findOneAndUpdate({ _id: receiver._id }, {
            $inc: { money: Number(transfer.amount) * -1 }
        }, { new: true });

        //eliminar la transferencia
        let deleteTransfer = await Transfer.findOneAndDelete({ _id: transferId })
        if (!deleteTransfer) return res.status(400).send({ message: "No se realizo la cancelacion de la transferencia" })
        return res.send({ message: "Cancelacion de transferencia realizada con exito" })
    } catch (err) {
        console.error(err)
    }
}

exports.getTransfers = async (req, res) => {
    try {
        let transfers = await Transfer.find()
        return res.send({ message: "transferencias", transfers })
    } catch (err) {
        console.error(err)
    }
}

exports.getTransfersByUser = async (req, res) => {
    try {
        let token = req.user.sub
        let transfers = await Transfer.find({ sender: token })
        return res.send({ message: "transferencias del usuario", transfers })
    } catch (err) {
        console.log(err)
    }
}