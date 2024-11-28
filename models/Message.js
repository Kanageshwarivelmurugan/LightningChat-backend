const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  content: String,
  from: Object,
  socketid: String,
  time: String,
  date: String,
  to: String,
  fileUrl: String  // New field to store the file URL
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
