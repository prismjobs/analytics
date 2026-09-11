const { createClient } = require('@supabase/supabase-js');
const VivastreetParser = require('../lib/vivastreetParser');
const { updateSingleAd } = require('../lib/adUpdater');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// AVISO: esta function tenta atualizar TODOS os anúncios do usuário numa
// única chamada. Com muitos anúncios cadastrados, isso pode ultrapassar o
// timeout da Netlify Function e ser encerrada no meio do processo.
//
// O frontend NÃO usa mais esta function para o botão "Atualizar todos" —
// agora ele chama netlify/functions/updateAd.js uma vez por anúncio,
// sequencialmente. Esta function foi mantida (e corrigida) apenas para uso
// futuro, como uma automação via cron/agendamento fora do navegador.
exports.handler = async (event) => {
  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId é obrigatório' })
      };
    }

    const { data: ads, error: fetchError } = await supabase
      .from('ads')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) throw fetchError;

    if (!ads || ads.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Nenhum anúncio encontrado' })
      };
    }

    const parser = new VivastreetParser();
    const resultados = [];

    for (const ad of ads) {
      try {
        const resultado = await updateSingleAd(supabase, parser, ad);
        resultados.push(resultado);
      } catch (error) {
        console.error(`Erro ao atualizar anúncio ${ad.id} (${ad.url}):`, error.message);

        await supabase.from('parse_logs').insert([{
          user_id: userId,
          url: ad.url,
          site: 'vivastreet',
          status: 'error',
          mensagem_erro: error.message
        }]);

        resultados.push({ ad_id: ad.id, titulo: ad.titulo, status: 'erro', mensagem: error.message });
      }
    }

    const sucesso = resultados.filter(r => r.status === 'ok').length;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        total: ads.length,
        atualizados_com_sucesso: sucesso,
        falhas: ads.length - sucesso,
        detalhes: resultados
      })
    };
  } catch (error) {
    console.error('Update error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
