const { createClient } = require('@supabase/supabase-js');
const { requireAdmin } = require('../lib/requireAdmin');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    await requireAdmin(event, supabase);

    // auth.admin.listUsers traz os dados de autenticação (email, criado em,
    // se está banido, etc). Cruzamos com user_profiles para trazer role/ativo.
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });
    if (authError) throw authError;

    const { data: perfis, error: perfisError } = await supabase
      .from('user_profiles')
      .select('id, role, ativo, criado_em');
    if (perfisError) throw perfisError;

    const perfisPorId = Object.fromEntries(perfis.map((p) => [p.id, p]));

    const usuarios = authData.users.map((u) => ({
      id: u.id,
      email: u.email,
      criado_em_auth: u.created_at,
      ultimo_login: u.last_sign_in_at,
      banido: !!u.banned_until && new Date(u.banned_until) > new Date(),
      role: perfisPorId[u.id]?.role || 'user',
      ativo: perfisPorId[u.id]?.ativo ?? false
    }));

    usuarios.sort((a, b) => new Date(b.criado_em_auth) - new Date(a.criado_em_auth));

    return { statusCode: 200, body: JSON.stringify({ usuarios }) };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
