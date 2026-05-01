const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
const rootDir = process.cwd();

app.use(express.static(rootDir));

app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'index.html'));
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Conectando ao Supabase...');
console.log('URL:', supabaseUrl);

supabase.from('users').select('id').limit(1).then(({ error }) => {
    if (error) {
        console.log('Erro ao conectar no Supabase:', error.message);
    } else {
        console.log('Conexão com Supabase OK!');
    }
});

app.post('/api/register', async (req, res) => {
    const { nome, login, senha } = req.body;
    
    if (!nome || !login || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos' });
    }
    
    if (login.length < 3 || senha.length < 3) {
        return res.status(400).json({ erro: 'Login e senha precisam de 3+ caracteres' });
    }
    
    try {
        const { data: existing } = await supabase
            .from('users')
            .select('*')
            .eq('login', login)
            .single();
        
        if (existing) {
            return res.status(400).json({ erro: 'Login já existe!' });
        }
        
        const { data, error } = await supabase
            .from('users')
            .insert([{ nome, login, senha }]);
        
        if (error) {
            console.log('Erro no insert:', error);
            console.log('Detalhes:', JSON.stringify(error));
            return res.status(400).json({ erro: error.message });
        }
        
        res.json({ sucesso: true, message: 'Cadastro realizado!' });
    } catch (err) {
        console.log('Erro catch:', err);
        res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('login', login)
            .eq('senha', senha)
            .single();
        
        if (error || !user) {
            return res.status(401).json({ erro: 'Login ou senha incorretos' });
        }
        
        res.json({ sucesso: true, nome: user.nome, login: user.login });
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.post('/api/login/github', async (req, res) => {
    try {
        const { access_token } = req.body;
        
        const { data: { user }, error } = await supabase.auth.getUser(access_token);
        
        if (error || !user) {
            return res.status(401).json({ erro: 'Token inválido' });
        }
        
        const email = user.email;
        const nome = user.full_name || user.user_metadata?.full_name || 'Usuário GitHub';
        
        let existingUser = await supabase
            .from('users')
            .select('*')
            .eq('login', email)
            .single();
        
        if (!existingUser.data) {
            const { data, error: insertError } = await supabase
                .from('users')
                .insert([{ nome, login: email, senha: 'github_oauth', tipo: 'github' }]);
            
            if (insertError && !insertError.message.includes('duplicate')) {
                throw insertError;
            }
        }
        
        res.json({ sucesso: true, nome, login: email, tipo: 'github' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro no login GitHub' });
    }
});

app.post('/api/auth/github', async (req, res) => {
    try {
        const { code } = req.body;
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: `${req.headers.origin}/auth/callback`,
                scopes: 'user:email'
            }
        });
        
        if (error) throw error;
        
        res.json({ url: data.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao iniciar login GitHub' });
    }
});

app.get('/api/usuarios', async (req, res) => {
    try {
        const { data } = await supabase
            .from('users')
            .select('id, nome, login, created_at');
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    res.json({ sucesso: true });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;