require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// routes - will add more as we go
app.get('/', (req, res) => {
  res.send('circleback api running');
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/elder-profile', require('./routes/elderProfile'));

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/circleback')
  .then(() => console.log('mongo connected'))
  .catch(err => console.log('mongo error', err));

app.listen(PORT, () => console.log('server started on port', PORT));
