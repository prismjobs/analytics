const { createClient } = require('@supabase/supabase-js');
const { requireAdmin } = require('../lib/requireAdmin');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Uma única function para todas as ações de gerenciamento de OUTROS
// usuários, para não multiplicar arquivos quase idênticos. A alteração da
// PRÓPRIA senha do usuário logado não passa por aqui — isso é feito
// diretamente no frontend com supabase.auth.updateUser(), sem precisar de
// privilégio de admin.
exports.handler = async (event) => {
  try {
    const admin = await requireAdmin(event, supabase);
    const { action, targetUserId, novaSenha, novoRole } = JSON.parse(event.body);

    if (!action || !targetUserId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'action e targetUserId são obrigatórios' }) };
    }

    if (targetUserId === admin.id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Esta função gerencia outros usuários. Para alterar sua própria senha, use "Alterar minha senha" no menu do usuário.'
        })
      };
    }

    switch (action) {
      case 'bloquear': {
        // "100 anos" de ban efetivamente bloqueia o login até ser desfeito
        await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: '876000h' });
        await supabase.from('user_profiles').update({ ativo: false }).eq('id', targetUserId);
        break;
      }

      case 'desbloquear': {
        await supabase.auth.admin.updateUserById(targetUserId, { ban_duration: 'none' });
        await supabase.from('user_profiles').update({ ativo: true }).eq('id', targetUserId);
        break;
      }

      case 'resetarSenha': {
        if (!novaSenha || novaSenha.length < 6) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Nova senha precisa ter ao menos 6 caracteres' }) };
        }
        const { error } = await supabase.auth.admin.updateUserById(targetUserId, { password: novaSenha });
        if (error) throw error;
        break;
      }

      case 'definirRole': {
        if (!['admin', 'user'].includes(novoRole)) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Role inválido' }) };
        }
        // Trava de segurança: não deixa remover o último admin do sistema
        if (novoRole === 'user') {
          const { count } = await supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin');
          const { data: alvo } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', targetUserId)
            .single();
          if (alvo?.role === 'admin' && count <= 1) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Não é possível remover o único administrador do sistema' })
            };
          }
        }
        await supabase.from('user_profiles').update({ role: novoRole }).eq('id', targetUserId);
        break;
      }

      case 'excluir': {
        const { error } = await supabase.auth.admin.deleteUser(targetUserId);
        if (error) throw error;
        // user_profiles é apagado em cascata (FK ON DELETE CASCADE)
        break;
      }

      default:
        return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${action}` }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
