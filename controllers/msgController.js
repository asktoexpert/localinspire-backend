const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/user/User');

exports.sendMessage = async (req, res) => {
  try {
    const intendedReceiver = await User.findById(req.params.recipientId);

    if (!intendedReceiver)
      return res.status(404).json({
        status: 'NOT_FOUND',
        msg: 'The user whom you intend to send a message to, does not exist',
      });

    const newMessage = await Message.create({
      ...req.body,
      from: req.user._id,
      to: req.params.recipientId,
    });

    await Notification.create({
      for: req.params.recipientId,
      alertType: 'Message',
      alert: newMessage._id,
    });

    res
      .status(201)
      .json({ status: 'SUCCESS', message: newMessage, msg: 'Message sent successfully' });
  } catch (err) {
    console.log(err);
    res.status(400).json({ status: 'FAIL' });
  }
};

exports.getNewMessages = async (req, res) => {
  const msgs = await Message.find({ to: req.user._id, seen: false }).populate([
    { path: 'from', select: 'firstName lastName' },
  ]);

  res.status(200).json({ status: 'SUCCESS', total: msgs.length, messages: msgs });
};
