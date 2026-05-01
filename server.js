// Vercel Deploy
const express = require('express');
const cors = require('cors');
const path = require('path');

if (!process.env.VERCEL) {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const supabaseUrl = process.env.SUPABASE_URL || 'https://ajlwzusvmihajggxcom.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbHd6enVzdm1paGFqZ2d4Y29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjgxNjQsImV4cCI6MjA5MzIwNDE2NH0.V-wEmCiReVcUF2O66oXoi8IdHXDmMLIgaI2VahavzXM';

const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
};

app.post('/api/register', async (req, res) => {
    const { nome, login, senha } = req.body;
    
    if (!nome || !login || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos' });
    }
    
    if (login.length < 3 || senha.length < 3) {
        return res.status(400).json({ erro: 'Login e senha precisam de 3+ caracteres' });
    }
    
    try {
        // Verificar se login já existe
        const checkRes = await fetch(
            `${supabaseUrl}/rest/v1/users?login=eq.${encodeURIComponent(login)}`,
            { headers }
        );
        const existing = await checkRes.json();
        
        if (existing && existing.length > 0) {
            return res.status(400).json({ erro: 'Login já existe!' });
        }
        
        // Inserir novo usuário
        const insertRes = await fetch(
            `${supabaseUrl}/rest/v1/users`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ nome, login, senha })
            }
        );
        
        if (!insertRes.ok) {
            const err = await insertRes.text();
            return res.status(400).json({ erro: err });
        }
        
        res.json({ sucesso: true, message: 'Cadastro realizado!' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;
    
    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/users?login=eq.${encodeURIComponent(login)}&senha=eq.${encodeURIComponent(senha)}`,
            { headers }
        );
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            return res.status(401).json({ erro: 'Login ou senha incorretos' });
        }
        
        const user = data[0];
        res.json({ sucesso: true, nome: user.nome, login: user.login });
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.get('/api/usuarios', async (req, res) => {
    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/users?select=id,nome,login,created_at`,
            { headers }
        );
        const data = await response.json();
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    res.json({ sucesso: true });
});

if (process.env.VERCEL) {
    module.exports = app;
} else {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}