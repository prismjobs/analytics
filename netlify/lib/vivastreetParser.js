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
    // .clad__spec contém a localização (City)
    return $('p.clad__spec').first().text().trim();
  }

  extractRegiao($) {
    const localizacao = this.extractLocalizacao($);
    // Tenta extrair da localização (geralmente "City - Region")
    const match = localizacao.match(/([^-]+)$/);
    return match ? match[1].trim() : localizacao;
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
    const text = $('li[data-automation="liCreateDate"]').text();
    // "Posted on 05 Sep, 2026"
    return text ? this.parseDate(text) : null;
  }

  extractMembroDe($) {
    const text = $('li[data-automation="liMemberSinceDate"]').text();
    // "Member since 01 Jan, 2024"
    return text ? this.parseDate(text) : null;
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
    
    // Tabela de serviços (service-true / service-false)
    $('ul li').each((i, li) => {
      const $li = $(li);
      const texto = $li.text().trim();
      
      // Determina se está marcado ou não
      const incluido = !$li.attr('class')?.includes('service-false');
      
      // Tenta extrair preço extra se existir
      const preco = $li.find('.price').text();
      
      if (texto) {
        servicos.push({
          nome: texto.split('£')[0].trim(),
          incluido: incluido,
          preco_extra: preco ? this.parsePrice(preco) : null
        });
      }
    });
    
    return servicos;
  }

  extractPrecos($) {
    const precos = [];
    
    // Tabela de preços (rates)
    // Formato típico: linha = duração, colunas = incall/outcall
    
    const linhas = $('table').find('tr');
    
    linhas.each((i, tr) => {
      const $tr = $(tr);
      const cells = $tr.find('td');
      
      if (cells.length >= 3) {
        const duracao = $(cells[0]).text().trim();
        const incall = $(cells[1]).text().trim();
        const outcall = $(cells[2]).text().trim();
        
        if (duracao) {
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
    // Procura a label na tabela de specs e pega o valor correspondente
    let result = '';
    
    $('tr').each((i, tr) => {
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
      const cleaned = dateStr.replace(/Posted on|Member since/i, '').trim();
      return new Date(cleaned).toISOString();
    } catch {
      return null;
    }
  }

  parsePrice(priceStr) {
    // "£150" -> 150, "£50 extra" -> 50
    const match = priceStr.match(/£(\d+)/);
    return match ? parseFloat(match[1]) : null;
  }
}

module.exports = VivastreetParser;
