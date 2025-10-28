const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", 
  port: 587,
  secure: false, 
  auth: {
    user: "projectexchangeifsc@gmail.com", 
    pass: "mgmp xvor rszc bmer" 
  },
});