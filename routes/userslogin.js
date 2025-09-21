const express = require('express');
const router = express.Router();
const client = require('../index'); 
const bcrypt = require('bcrypt');



router.post('/', async (req, res) => {
    try{
        const { name, password } = req.body;
        const result = await client.query('SELECT hashed_password FROM users WHERE user_name= $1', [name]);

        if (result.rows.length === 0) {
            return res.status(401).send('Usuário não encontrado');
        }

        const hashedPassword = result.rows[0].hashed_password;
        const match = await bcrypt.compare(password, hashedPassword);

        if(match){
            res.json({ message: 'Seja bem vindo' });
        }else{
            res.status(401).send('Usuário ou senha incorretos');
        }
    } catch (err) {
        console.error('Erro ao tentar recuperar usuário:', err.message);
        res.status(500).send('Erro interno no servidor');
    }
});

module.exports = router;
