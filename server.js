const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialDB = { users: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 2));
        return initialDB;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.post('/api/register', (req, res) => {
    const { nome, login, senha } = req.body;
    
    if (!nome || !login || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos' });
    }
    
    if (login.length < 3 || senha.length < 3) {
        return res.status(400).json({ erro: 'Login e senha precisam de 3+ caracteres' });
    }
    
    const db = readDB();
    
    if (db.users.find(u => u.login === login)) {
        return res.status(400).json({ erro: 'Login já existe!' });
    }
    
    db.users.push({ id: Date.now(), nome, login, senha, createdAt: new Date().toISOString() });
    writeDB(db);
    
    res.json({ sucesso: true, message: 'Cadastro realizado!' });
});

app.post('/api/login', (req, res) => {
    const { login, senha } = req.body;
    
    const db = readDB();
    const user = db.users.find(u => u.login === login && u.senha === senha);
    
    if (!user) {
        return res.status(401).json({ erro: 'Login ou senha incorretos' });
    }
    
    res.json({ sucesso: true, nome: user.nome, login: user.login });
});

app.get('/api/usuarios', (req, res) => {
    const db = readDB();
    res.json(db.users.map(u => ({ id: u.id, nome: u.nome, login: u.login, createdAt: u.createdAt })));
});

app.post('/api/logout', (req, res) => {
    res.json({ sucesso: true });
});

const server = app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;