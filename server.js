const express = require('express');

const server = express();
const port = 5000;
server.use(express.json({ limit: '10mb' }));

const apiRoutes = require('./routes/index');

server.use(apiRoutes);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
