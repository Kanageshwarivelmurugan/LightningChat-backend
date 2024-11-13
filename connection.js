const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(`mongodb+srv://vkanageshwari73:Mongo18@cluster0.ona8z.mongodb.net/Chatapp?retryWrites=true&w=majority&appName=Cluster0`)
.then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB', err);
    process.exit(1); // Exit the process if the connection fails
  });
