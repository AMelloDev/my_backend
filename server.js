const cors = require('cors');

const express = require('express');
const app = express();


app.use(express.json());
app.use(cors());

// importar rotas
const userRoutes = require('./routes/users');
const userLoginRoutes = require('./routes/userslogin');
const institutionRoutes = require('./routes/institutions');
const projectsRoutes = require('./routes/projects');
const typeUsers = require('./routes/type_users');
const countriesRoutes =require('./routes/countries')

// usar rotas
app.use('/users', userRoutes);
app.use('/userslogin', userLoginRoutes);
app.use('/institutions', institutionRoutes);
app.use('/projects',projectsRoutes);
app.use('/type_users', typeUsers);
app.use('/countries', countriesRoutes);

app.listen(3000, () => console.log("🚀 Server running on port 3000"));