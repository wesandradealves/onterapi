const { Client } = require('pg');
const fs = require('fs');

// Carregar o certificado
const caCert = fs.readFileSync('D:\\www\\Onterapi\\prod-ca-2021.crt');

// Configuração do banco de dados do Supabase com certificado
const client = new Client({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.ogffdaemylaezxpunmop',
  password: '5lGR6N9OyfF1fcMc',
  ssl: {
    ca: caCert,
    rejectUnauthorized: true
  }
});

async function deleteAllUsers() {
  console.log('🔌 Conectando ao Supabase PostgreSQL...');
  
  try {
    await client.connect();
    console.log('✅ Conectado!\n');

    // Primeiro deletar as sessões (por causa da foreign key)
    console.log('🗑️  Deletando todas as sessões de usuário...');
    const deleteSessionsResult = await client.query('DELETE FROM user_sessions');
    console.log(`✅ ${deleteSessionsResult.rowCount || 0} sessões deletadas\n`);

    // Agora deletar todos os usuários
    console.log('🗑️  Deletando todos os usuários...');
    const deleteUsersResult = await client.query('DELETE FROM users');
    console.log(`✅ ${deleteUsersResult.rowCount || 0} usuários deletados\n`);

    console.log('🎉 Limpeza completa realizada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada.');
  }
}

deleteAllUsers();