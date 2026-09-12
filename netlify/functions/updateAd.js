const { createClient } = require('@supabase/supabase-js');
const VivastreetParser = require('../lib/vivastreetParser');
const { updateSingleAd } = require('../lib/adUpdater');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Esta function existe porque a antiga "updateSnapshots" tentava atualizar
// TODOS os anúncios numa única chamada — com muitos anúncios cadastrados,
// isso ultrapassa o timeout da Netlify Function (10s no plano gratuito) e
// a função é encerrada no meio do processo, deixando anúncios sem atualizar.
//
// Agora o frontend chama esta function uma vez por anúncio, sequencialmente
// (o próximo só começa depois que o anterior terminar), então cada chamada
// só precisa ter tempo de fazer o scraping de 1 página.
//
// O parâmetro `modo` define O QUE é atualizado:
//   'visitors'  (padrão) — apenas o contador de visitantes + novo snapshot.
//                Não encosta em título, descrição, fotos, preços, serviços.
//   'telefone'  — apenas recaptura o número de telefone.
//   'completo'  — recaptura todo o conteúdo (ação explícita do usuário).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { userId, adId, modo } = JSON.parse(event.body);

    if (!userId || !adId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId e adId são obrigatórios' })
      };
    }

    const { data: ad, error: fetchError } = await supabase
      .from('ads')
      .select('*')
      .eq('id', adId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !ad) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Anúncio não encontrado' })
      };
    }

    const parser = new VivastreetParser();
    const resultado = await updateSingleAd(supabase, parser, ad, modo);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...resultado })
    };
  } catch (error) {
    console.error('Erro ao atualizar anúncio:', error);

    try {
      const { userId, adId } = JSON.parse(event.body);
      await supabase.from('parse_logs').insert([{
        user_id: userId,
        url: adId,
        site: 'vivastreet',
        status: 'error',
        mensagem_erro: error.message
      }]);
    } catch (logErr) {
      // se nem o log der certo, apenas ignora — não é crítico
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
