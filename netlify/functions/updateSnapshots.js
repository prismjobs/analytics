const { createClient } = require('@supabase/supabase-js');
const VivastreetParser = require('../lib/vivastreetParser');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId é obrigatório' })
      };
    }

    // 1. Busca todos os anúncios do usuário
    const { data: ads } = await supabase
      .from('ads')
      .select('*')
      .eq('user_id', userId);

    if (!ads || ads.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Nenhum anúncio encontrado' })
      };
    }

    const parser = new VivastreetParser();
    const snapshots = [];

    // 2. Para cada anúncio, busca dados atualizados
    for (const ad of ads) {
      try {
        const updatedData = await parser.parse(ad.url);

        // 3. Insere snapshot
        snapshots.push({
          ad_id: ad.id,
          visitors: updatedData.visitors,
          data_snapshot: new Date().toISOString(),
          last_updated_site: updatedData.data_publicacao
        });

        // 4. Atualiza visitors_atual no ads
        await supabase
          .from('ads')
          .update({
            visitors_atual: updatedData.visitors,
            data_ultima_atualizacao: new Date().toISOString()
          })
          .eq('id', ad.id);
      } catch (error) {
        console.error(`Erro ao atualizar anúncio ${ad.id}:`, error.message);
      }
    }

    // 5. Insere todos os snapshots
    if (snapshots.length > 0) {
      await supabase.from('ad_snapshots').insert(snapshots);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        snapshots_criados: snapshots.length
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
