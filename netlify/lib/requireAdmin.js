/**
 * Valida que a requisição vem de um usuário autenticado, com role='admin'
 * e ativo=true. Lança erro caso contrário.
 *
 * O front-end envia o token de sessão no header Authorization: Bearer <token>.
 * Usamos o cliente supabase com service role (que ignora RLS) apenas para
 * checar QUEM é o usuário do token e qual o papel dele — a decisão de
 * autorizar ou não fica sempre no backend, nunca confiando em nada vindo
 * do cliente além do token assinado pelo próprio Supabase Auth.
 */
async function requireAdmin(event, supabaseAdmin) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) {
    const err = new Error('Não autenticado');
    err.statusCode = 401;
    throw err;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

  if (userError || !userData?.user) {
    const err = new Error('Sessão inválida ou expirada');
    err.statusCode = 401;
    throw err;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role, ativo')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    const err = new Error('Perfil de usuário não encontrado');
    err.statusCode = 403;
    throw err;
  }

  if (!profile.ativo) {
    const err = new Error('Sua conta está desativada');
    err.statusCode = 403;
    throw err;
  }

  if (profile.role !== 'admin') {
    const err = new Error('Acesso restrito a administradores');
    err.statusCode = 403;
    throw err;
  }

  return userData.user;
}

module.exports = { requireAdmin };
