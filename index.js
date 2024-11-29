const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');  // Import multer for file upload
const path = require('path');  // To handle file paths
const app = express();
const server = http.createServer(app);

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // Store files in the 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Use the current timestamp as the filename
  }
});

const upload = multer({ storage: storage });

const corsOptions = {
  origin: 'https://lightning-chat-frontend.vercel.app', // Your frontend URL
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type, Authorization'
};

const io = socketIo(server, {
  cors: {
    origin: 'https://lightning-chat-frontend.vercel.app',
    methods: ['GET', 'POST'],
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true
  }
});

const rooms = ['Family', 'Friends', 'OfficeNest', 'Colleage'];

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
require('./connection')

const userRoutes = require("./routes/userRoutes");
const User = require('./models/User');
const Message = require('./models/Message');
const Group = require("./models/Group");

app.use('/api/users', userRoutes);

// Route to create a new group
app.post('/api/groups', async (req, res) => {
  const { name, members } = req.body;

  // Check if group already exists
  const existingGroup = await Group.findOne({ name });
  if (existingGroup) {
    return res.status(400).json({ message: "Group already exists" });
  }

  try {
    const newGroup = new Group({ name, members });
    await newGroup.save();
    res.status(201).json(newGroup); // Respond with the created group
  } catch (error) {
    res.status(500).json({ message: "Error creating group", error });
  }
});

// Route to fetch all groups
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Group.find().populate("members", "name status"); // Populate member info
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: "Error fetching groups", error });
  }
});

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (req.file) {
    const fileUrl = `/uploads/${req.file.filename}`; // Send back the file URL
    res.status(200).json({ fileUrl });
  } else {
    res.status(400).json({ message: "No file uploaded" });
  }
});

// Socket.io logic for handling messages and multimedia sharing
async function getLastMessagesFromRoom(room) {
  let roomMessages = await Message.aggregate([
    { $match: { to: room } },
    { $group: { _id: '$date', messagesByDate: { $push: '$$ROOT' } } }
  ]);
  return roomMessages;
}

function sortRoomMessagesByDate(messages) {
  return messages.sort(function(a, b) {
    let date1 = a._id.split('/');
    let date2 = b._id.split('/');
    date1 = date1[2] + date1[0] + date1[1];
    date2 = date2[2] + date2[0] + date2[1];
    return date1 < date2 ? -1 : 1;
  });
}

io.on('connection', (socket) => {

  socket.on('new-user', async () => {
    const members = await User.find();
    io.emit('new-user', members);
  });

  socket.on('join-room', async (newRoom, previousRoom) => {
    socket.join(newRoom);
    socket.leave(previousRoom);
    let roomMessages = await getLastMessagesFromRoom(newRoom);
    roomMessages = sortRoomMessagesByDate(roomMessages);
    // sending message to room
    socket.emit('room-messages', roomMessages);
  });

  socket.on('message-room', async (room, content, sender, time, date, fileUrl) => {
    console.log('new message', content);
    const newMessage = await Message.create({ content, from: sender, time, date, to: room, fileUrl });
    let roomMessages = await getLastMessagesFromRoom(room);
    roomMessages = sortRoomMessagesByDate(roomMessages);
    // sending message to room
    io.to(room).emit('room-messages', roomMessages);

    socket.broadcast.emit('notifications', room);
  });

  app.delete('/logout', async (req, res) => {
    try {
      const { _id, newMessages } = req.body;
      const user = await User.findById(_id);
      user.status = "offline";
      user.newMessages = newMessages;
      await user.save();
      const members = await User.find();
      socket.broadcast.emit('new-user', members);
      res.status(200).send();
    } catch (e) {
      console.log(e);
      res.status(400).send();
    }
  });

});

app.get('/rooms', (req, res) => {
  res.json(rooms);
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
