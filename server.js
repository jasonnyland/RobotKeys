const http = require('http');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_LOCATION, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const app = require('./app');

const port = (process.env.PORT || '3000');
const server = http.createServer(app);

server.listen(port);