const express = require('express');

const server = express();
const port = 5000;
server.use(express.json());

const indexRoutes = require('./routes/index');

server.use(indexRoutes);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
