const express = require('express');
const app = express();

app.use(express.json());

// importar rotas
const userRoutes = require('./routes/users');
const institutionRoutes = require('./routes/institutions');

// usar rotas
app.use('/users', userRoutes);
app.use('/institutions', institutionRoutes);

app.listen(3000, () => console.log("🚀 Server running on port 3000"));