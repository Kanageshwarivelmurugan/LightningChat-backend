
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs who are part of this group
}, { timestamps: true });

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
