import { supabase } from './supabase';

async function authHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão não encontrada — faça login novamente');
  return { Authorization: `Bearer ${session.access_token}` };
}

export const api = {
  async parseAd(url, userId) {
    const response = await fetch('/.netlify/functions/parseAd', {
      method: 'POST',
      body: JSON.stringify({ url, userId })
    });
    return response.json();
  },

  // Atualiza UM único anúncio. Usado pelo botão de atualizar por linha e
  // também pelo "Atualizar todos", que agora chama isto sequencialmente
  // (um anúncio por vez) em vez de tentar tudo numa única requisição —
  // evitando o timeout que acontecia com muitos anúncios cadastrados.
  //
  // `modo` decide o que a atualização toca no banco:
  //   'visitors' (padrão) → só o contador de visitantes + novo snapshot.
  //                         Nenhum dado coletado (descrição, fotos, preços,
  //                         serviços) é sobrescrito. É o modo seguro para
  //                         anúncios que podem ter saído do ar.
  //   'telefone'          → só o telefone (data-phone-number da página).
  //   'completo'          → recaptura tudo; só usar de propósito, num
  //                         anúncio que se sabe estar no ar.
  async updateAd(userId, adId, modo = 'visitors') {
    const response = await fetch('/.netlify/functions/updateAd', {
      method: 'POST',
      body: JSON.stringify({ userId, adId, modo })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao atualizar anúncio');
    }
    return data;
  },

  // Mantida para uso futuro (ex: automação via cron fora do navegador).
  // O botão "Atualizar todos" do frontend não usa mais esta função.
  async updateSnapshots(userId, modo = 'visitors') {
    const response = await fetch('/.netlify/functions/updateSnapshots', {
      method: 'POST',
      body: JSON.stringify({ userId, modo })
    });
    return response.json();
  },

  async getAnalytics(userId, segmento = 'all') {
    const response = await fetch('/.netlify/functions/analytics', {
      method: 'POST',
      body: JSON.stringify({ userId, segmento })
    });
    return response.json();
  },

  // ===== Administração de usuários (apenas admin) =====

  async listUsers() {
    const response = await fetch('/.netlify/functions/listUsers', {
      method: 'POST',
      headers: await authHeader()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao listar usuários');
    return data.usuarios;
  },

  async createUser(email, password) {
    const response = await fetch('/.netlify/functions/createUser', {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao criar usuário');
    return data;
  },

  async manageUser(action, targetUserId, extra = {}) {
    const response = await fetch('/.netlify/functions/manageUser', {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, targetUserId, ...extra })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao gerenciar usuário');
    return data;
  }
};
