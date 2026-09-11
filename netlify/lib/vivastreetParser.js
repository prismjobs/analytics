// ============================================
// PARSER VIVASTREET
// Extrai dados estruturados do anúncio
// ============================================

const cheerio = require('cheerio');
const axios = require('axios');

class VivastreetParser {
  constructor() {
    this.site = 'vivastreet';
    this.domain = 'vivastreet.co.uk';
  }

  // Detecta se a URL é do Vivastreet
  static isVivastreetUrl(url) {
    return url.includes('vivastreet.co.uk');
  }

  // Função principal de parsing
  async parse(url) {
    try {
      // Fetch da página
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(data);
      
      // Extração de dados
      const result = {
        site: this.site,
        url: url,
        ad_id_externo: this.extractAdId(url, $),
        titulo: this.extractTitulo($),
        descricao: this.extractDescricao($),
        localizacao: this.extractLocalizacao($),
        regiao: this.extractRegiao($),
        tipo_anuncio: this.extractTipoAnuncio($),
        genero: this.extractGenero($),
        idade: this.extractIdade($),
        etnia: this.extractEtnia($),
        idiomas: this.extractIdiomas($),
        publico_alvo: this.extractPublicoAlvo($),
        data_publicacao: this.extractDataPublicacao($),
        membro_desde: this.extractMembroDe($),
        visitors: this.extractVisitors($),
        fotos: this.extractFotos($),
        servicos: this.extractServicos($),
        precos: this.extractPrecos($)
      };

      return result;
    } catch (error) {
      throw new Error(`Erro ao parsear Vivastreet: ${error.message}`);
    }
  }

  // ============ EXTRACTORS ============

  extractAdId(url, $) {
    // URL format: /escort/region/title/123456
    const match = url.match(/\/(\d+)$/);
    return match ? match[1] : null;
  }

  extractTitulo($) {
    // data-automation="hdrAdTitle"
    return $('h1[data-automation="hdrAdTitle"]').text().trim();
  }

  extractDescricao($) {
    // div com data-automation="divClassifiedDescriptionCopy"
    const desc = $('div[data-automation="divClassifiedDescriptionCopy"]').html();
    return desc ? desc.trim() : '';
  }

  extractLocalizacao($) {
    // Prioridade 1: campo "Location" da tabela de especificações
    // (formato completo, ex: "Walthamstow - East London")
    const daTabela = this.extractFromSpecsTable($, 'Location');
    if (daTabela) return daTabela;

    // Prioridade 2 (fallback): badge no topo do anúncio (ex: "Walthamstow")
    // Nota: no HTML real este elemento é <div class="clad__spec">, não <p>
    const badge = $('div.clad__spec, p.clad__spec').first().text().trim();
    return badge;
  }

  extractRegiao($) {
    const localizacao = this.extractLocalizacao($);
    if (!localizacao) return '';
    // Formato "Cidade - Região" -> pega a parte depois do último hífen
    const partes = localizacao.split('-').map(p => p.trim()).filter(Boolean);
    return partes.length > 1 ? partes[partes.length - 1] : localizacao;
  }

  extractTipoAnuncio($) {
    // Tabela de especificações: "Type of ad"
    return this.extractFromSpecsTable($, 'Type of ad');
  }

  extractGenero($) {
    return this.extractFromSpecsTable($, 'Gender');
  }

  extractIdade($) {
    const idade = this.extractFromSpecsTable($, 'Age');
    // "25 years old" -> 25
    const match = idade.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  extractEtnia($) {
    return this.extractFromSpecsTable($, 'Ethnicity');
  }

  extractIdiomas($) {
    return this.extractFromSpecsTable($, 'Language');
  }

  extractPublicoAlvo($) {
    return this.extractFromSpecsTable($, 'My service is for');
  }

  extractDataPublicacao($) {
    // Prioridade 1: dado estruturado JSON-LD da própria página (mais confiável)
    let datePublished = null;
    $('script[type="application/ld+json"]').each((i, el) => {
      if (datePublished) return;
      try {
        const json = JSON.parse($(el).contents().text());
        const nodes = json['@graph'] || [json];
        nodes.forEach(node => {
          if (node && node.datePublished) datePublished = node.datePublished;
        });
      } catch (e) {
        // ignora JSON-LD malformado
      }
    });
    if (datePublished) {
      const parsed = new Date(datePublished);
      return isNaN(parsed) ? null : parsed.toISOString();
    }

    // Prioridade 2 (fallback): campo textual, caso o template mude
    const text = $('li[data-automation="liCreateDate"]').text();
    return text ? this.parseDate(text) : null;
  }

  extractMembroDe($) {
    const text = $('li[data-automation="liMemberSinceDate"]').text();
    if (!text) return null;
    // Formato real do site: "Member since 18/02/2020" (dd/mm/yyyy)
    return this.parseDateDMY(text) || this.parseDate(text);
  }

  extractVisitors($) {
    // ".views_counter" ou similar
    let visitors = 0;
    
    // Tenta múltiplos seletores
    const text = $('.views_counter').text() || 
                 $('[data-automation="divViewCount"]').text() ||
                 $('span:contains("views")').text();
    
    if (text) {
      const match = text.match(/(\d+)/);
      visitors = match ? parseInt(match[1]) : 0;
    }
    
    return visitors;
  }

  extractFotos($) {
    const fotos = [];
    
    // Seletor para imagens do carrossel
    $('img[data-automation^="imgDetailCarouselImage"]').each((i, img) => {
      const url = $(img).attr('data-src') || $(img).attr('src');
      if (url && !url.includes('placeholder')) {
        fotos.push({
          url: url,
          ordem: i
        });
      }
    });
    
    return fotos;
  }

  extractServicos($) {
    const servicos = [];
    const MAX_NOME_LENGTH = 60; // nome real de serviço é curto (ex: "Massage")
    const MAX_SERVICOS = 60; // trava de segurança contra páginas fora do padrão

    // IMPORTANTE: escopo restrito à tabela de serviços (data-automation="tblServices").
    // Antes buscava "ul li" na página inteira e capturava menu, breadcrumbs,
    // tags populares, banner de cookies, etc. como se fossem serviços.
    $('table[data-automation="tblServices"] li').each((i, li) => {
      if (servicos.length >= MAX_SERVICOS) return false; // break

      const $li = $(li);
      const automation = ($li.attr('data-automation') || '').toLowerCase();
      const classe = $li.attr('class') || '';

      // Serviço incluído: class="service-true" (ou termina em "true" no automation)
      const incluido = classe.includes('service-true') || automation.endsWith('true');

      // O preço extra vem dentro de um <span> filho (ex: "£30 extra") — removemos
      // esse span antes de ler o texto para não misturar nome + preço
      const $clone = $li.clone();
      const precoTexto = $clone.find('span').text().trim();
      $clone.find('span').remove();
      const nome = $clone.text().trim();

      // Filtro de segurança: se o "nome" vier muito longo ou com quebra de
      // linha, provavelmente a extração pegou o elemento errado (página com
      // template diferente do esperado) — melhor descartar do que gravar
      // lixo no banco de dados.
      if (nome && nome.length <= MAX_NOME_LENGTH && !nome.includes('\n')) {
        servicos.push({
          nome: nome,
          incluido: incluido,
          preco_extra: precoTexto ? this.parsePrice(precoTexto) : null
        });
      }
    });

    return servicos;
  }

  extractPrecos($) {
    const precos = [];
    const MAX_DURACAO_LENGTH = 30;
    const MAX_LINHAS = 20;

    // IMPORTANTE: escopo restrito à tabela de preços (data-automation="tblRates").
    // Antes buscava "table tr" na página inteira, pegando linhas de outras
    // tabelas (anúncios similares, cookies, etc.) por engano.
    $('table[data-automation="tblRates"] tr').each((i, tr) => {
      if (precos.length >= MAX_LINHAS) return false; // break

      const $tr = $(tr);
      const $tds = $tr.find('td');

      if ($tds.length >= 3) {
        const duracao = $($tds[0]).text().trim();
        const incall = $($tds[1]).text().trim();
        const outcall = $($tds[2]).text().trim();

        if (duracao && duracao.length <= MAX_DURACAO_LENGTH) {
          precos.push({
            duracao: duracao,
            preco_incall: this.parsePrice(incall),
            preco_outcall: this.parsePrice(outcall)
          });
        }
      }
    });

    return precos;
  }

  // ============ HELPERS ============

  extractFromSpecsTable($, label) {
    // Procura a label na tabela de especificações e pega o valor correspondente.
    // Restringe a busca ao id="details-tbl-specs" (tabela real de specs do
    // Vivastreet) quando ela existir, para não confundir com outras tabelas
    // da página (anúncios similares, agência, cookies, etc). Se o template
    // mudar e esse id não existir, cai de volta para busca na página toda.
    const $tabelaSpecs = $('#details-tbl-specs');
    const $linhas = $tabelaSpecs.length ? $tabelaSpecs.find('tr') : $('tr');
    let result = '';

    $linhas.each((i, tr) => {
      const $tr = $(tr);
      const $th = $tr.find('th, td').first();
      const $td = $tr.find('td').last();

      if ($th.text().includes(label)) {
        result = $td.text().trim();
        return false; // break
      }
    });

    return result;
  }

  parseDate(dateStr) {
    // "Posted on 05 Sep, 2026" ou "Member since 01 Jan, 2024"
    try {
      const cleaned = dateStr.replace(/Posted on|Member since|Last updated/i, '').trim();
      const parsed = new Date(cleaned);
      return isNaN(parsed) ? null : parsed.toISOString();
    } catch {
      return null;
    }
  }

  parseDateDMY(dateStr) {
    // Formato real usado pelo Vivastreet: "18/02/2020" (dia/mês/ano)
    // new Date() nativo do JS interpretaria isso como mês/dia/ano e erraria.
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    const [, dia, mes, ano] = match;
    const data = new Date(Date.UTC(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10)));
    return isNaN(data) ? null : data.toISOString();
  }

  parsePrice(priceStr) {
    // "£150" -> 150, "£50 extra" -> 50
    const match = priceStr.match(/£(\d+)/);
    return match ? parseFloat(match[1]) : null;
  }
}

module.exports = VivastreetParser;
