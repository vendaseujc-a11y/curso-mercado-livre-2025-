// Vercel Deploy
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

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

function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method: options.method || 'GET',
            headers: { ...headers, ...options.headers }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

app.post('/api/register', async (req, res) => {
    console.log('POST /api/register', req.body);
    const { nome, login, senha } = req.body;
    
    if (!nome || !login || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos' });
    }
    
    if (login.length < 3 || senha.length < 3) {
        return res.status(400).json({ erro: 'Login e senha precisam de 3+ caracteres' });
    }
    
    try {
        // Verificar se login já existe
        const existing = await httpRequest(
            `${supabaseUrl}/rest/v1/users?login=eq.${encodeURIComponent(login)}`
        );
        
        if (existing && existing.length > 0) {
            return res.status(400).json({ erro: 'Login já existe!' });
        }
        
        // Inserir novo usuário
        const result = await httpRequest(`${supabaseUrl}/rest/v1/users`, {
            method: 'POST',
            body: { nome, login, senha }
        });
        
        res.json({ sucesso: true, message: 'Cadastro realizado!' });
    } catch (err) {
        console.log('Erro:', err.message);
        res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    console.log('POST /api/login', req.body);
    const { login, senha } = req.body;
    
    try {
        const data = await httpRequest(
            `${supabaseUrl}/rest/v1/users?login=eq.${encodeURIComponent(login)}&senha=eq.${encodeURIComponent(senha)}`
        );
        
        if (!data || data.length === 0) {
            return res.status(401).json({ erro: 'Login ou senha incorretos' });
        }
        
        const user = data[0];
        res.json({ sucesso: true, nome: user.nome, login: user.login });
    } catch (err) {
        console.log('Erro login:', err);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.get('/api/usuarios', async (req, res) => {
    try {
        const data = await httpRequest(`${supabaseUrl}/rest/v1/users?select=id,nome,login,created_at`);
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