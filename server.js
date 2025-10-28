const express = require('express');
const app = express();

app.use(express.json());

// importar rotas
const userRoutes = require('./routes/users');
const userLoginRoutes = require('./routes/userslogin');
const institutionRoutes = require('./routes/institutions');
const projectsRoutes = require('./routes/projects')

// usar rotas
app.use('/users', userRoutes);
app.use('/userslogin', userLoginRoutes);
app.use('/institutions', institutionRoutes);
app.use('/projects',projectsRoutes);

app.listen(3000, () => console.log("🚀 Server running on port 3000"));