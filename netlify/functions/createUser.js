const { createClient } = require('@supabase/supabase-js');
const { requireAdmin } = require('../lib/requireAdmin');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const admin = await requireAdmin(event, supabase);

    const { email, password } = JSON.parse(event.body);
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email e senha são obrigatórios' }) };
    }
    if (password.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Senha precisa ter ao menos 6 caracteres' }) };
    }

    // Cria o usuário já com e-mail confirmado — não faz sentido exigir
    // confirmação por e-mail de alguém que o próprio admin está cadastrando
    const { data: novoUsuario, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) throw createError;

    const { error: profileError } = await supabase.from('user_profiles').insert([
      {
        id: novoUsuario.user.id,
        email: novoUsuario.user.email,
        role: 'user',
        ativo: true,
        criado_por: admin.id
      }
    ]);

    if (profileError) throw profileError;

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, id: novoUsuario.user.id, email: novoUsuario.user.email })
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
