const cors = require('cors');

const express = require('express');
const app = express();


app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// importar rotas
const userRoutes = require('./routes/users');
const userLoginRoutes = require('./routes/userslogin');
const institutionRoutes = require('./routes/institutions');
const projectsRoutes = require('./routes/projects');
const typeUsers = require('./routes/type_users');
const countriesRoutes =require('./routes/countries');
const editalRoutes =require('./routes/edital')
const messagesRoutes = require('./routes/messages');
const studentDashboardRoutes = require('./routes/student_dashboard');
const activitiesRoutes = require('./routes/activities');


// usar rotas
app.use('/users', userRoutes);
app.use('/userslogin', userLoginRoutes);
app.use('/institutions', institutionRoutes);
app.use('/projects',projectsRoutes);
app.use('/type_users', typeUsers);
app.use('/countries', countriesRoutes);
app.use('/edital', editalRoutes);
app.use('/messages', messagesRoutes);
app.use('/student_dashboard', studentDashboardRoutes);
app.use('/activities', activitiesRoutes);

app.listen(3000, '0.0.0.0', () => {
  console.log("🚀 Server running on port 3000");
});