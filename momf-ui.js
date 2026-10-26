/**
 * MOMF-UI.JS
 * Interface do Usuário para o Mestre das Muitas Formas (D&D 3.5)
 * Totalmente otimizado para iPhone / iOS Safari & Telas Touch
 */

import {
  getMoMFCharacterStats,
  applyTransformation,
  revertTransformation,
  toggleFavoriteShape,
  isFavoriteShape,
  MOMF_CREATURES,
  MOMF_PROGRESSION,
  MOMF_RULES,
  MOMF_TYPES_BY_LEVEL,
  MOMF_SIZES_BY_LEVEL
} from './momf-model.js';

export function createMoMFUI({ current, save, render, modal, esc, toast, icon, openDice }) {
  // Estado interno da UI de Metamorfose
  let momfSubTab = 'catalog'; // 'catalog' | 'bible' | 'saved' | 'rules'
  let searchQuery = '';
  let selectedType = 'all';
  let selectedSize = 'all';
  let selectedMovement = 'all';
  let onlyAllowed = true;
  let sortBy = 'name-asc';
  let bibleLevel = 1;

  function filterCreatures(c) {
    const stats = getMoMFCharacterStats(c);
    let list = MOMF_CREATURES;

    // Filtro "Apenas formas que posso assumir"
    if (onlyAllowed) {
      list = list.filter(cr => stats.canAssume(cr));
    }

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(cr => {
        return (cr.name && cr.name.toLowerCase().includes(q)) ||
               (cr.name_en && cr.name_en.toLowerCase().includes(q)) ||
               (cr.type && cr.type.toLowerCase().includes(q)) ||
               (cr.special_attacks && cr.special_attacks.toLowerCase().includes(q)) ||
               (cr.special_qualities && cr.special_qualities.toLowerCase().includes(q));
      });
    }

    // Filtro de Tipo
    if (selectedType !== 'all') {
      list = list.filter(cr => cr.type === selectedType);
    }

    // Filtro de Tamanho
    if (selectedSize !== 'all') {
      list = list.filter(cr => cr.size === selectedSize);
    }

    // Filtro de Deslocamento
    if (selectedMovement !== 'all') {
      list = list.filter(cr => {
        const modes = cr.movement_modes || [];
        const speedStr = (cr.speed || '').toLowerCase();
        if (selectedMovement === 'Voo') return modes.includes('Voo') || speedStr.includes('voo');
        if (selectedMovement === 'Natação') return modes.includes('Natação') || speedStr.includes('natação');
        if (selectedMovement === 'Escavação') return modes.includes('Escavação') || speedStr.includes('escavação');
        return true;
      });
    }

    // Ordenação
    list = list.slice().sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '', 'pt-BR');
      if (sortBy === 'hd-desc') return (Number(b.hd_val) || 0) - (Number(a.hd_val) || 0);
      if (sortBy === 'str-desc') return (Number(b.str) || 0) - (Number(a.str) || 0);
      if (sortBy === 'dex-desc') return (Number(b.dex) || 0) - (Number(a.dex) || 0);
      if (sortBy === 'nat-desc') return (Number(b.natural_armor) || 0) - (Number(a.natural_armor) || 0);
      return 0;
    });

    return list;
  }

  function renderActiveShapeCard(c) {
    const ws = c.wildShape;
    if (!ws || !ws.active) {
      return `
        <article class="card momf-active-card natural-form">
          <div class="card-head">
            <h3><span>👤</span> Forma Natural (Não Metamorfoseado)</h3>
          </div>
          <p class="help">
            Você está atualmente em sua forma biológica original.
            Escolha uma das criaturas abaixo e toque em <strong>Assumir Forma</strong> para metamorfosear seu personagem!
          </p>
        </article>
      `;
    }

    const strMod = Math.floor(((ws.str || 10) - 10) / 2);
    const dexMod = Math.floor(((ws.dex || 10) - 10) / 2);
    const conMod = Math.floor(((ws.con || 10) - 10) / 2);
    const strSign = strMod >= 0 ? `+${strMod}` : strMod;
    const dexSign = dexMod >= 0 ? `+${dexMod}` : dexMod;
    const conSign = conMod >= 0 ? `+${conMod}` : conMod;

    return `
      <article class="card momf-active-card transformed-form">
        <div class="momf-active-header">
          <div class="momf-active-badge">🐺 METAMORFOSE ATIVA</div>
          <button class="btn danger" data-momf-action="revert">↩️ Reverter à Forma Normal</button>
        </div>

        <div class="momf-creature-title-row">
          <h2>${esc(ws.creatureName)}</h2>
          <span class="badge">${esc(ws.type)} · ${esc(ws.size)} · ${ws.hd || '?'} HD</span>
        </div>

        <div class="momf-stats-grid">
          <div class="stat highlight">
            <strong>${ws.str} <small>(${strSign})</small></strong>
            <small>FORÇA</small>
          </div>
          <div class="stat highlight">
            <strong>${ws.dex} <small>(${dexSign})</small></strong>
            <small>DESTREZA</small>
          </div>
          <div class="stat highlight">
            <strong>${ws.con} <small>(${conSign})</small></strong>
            <small>CONSTITUIÇÃO</small>
          </div>
          <div class="stat">
            <strong>+${ws.natural_armor || 0}</strong>
            <small>CA NATURAL</small>
          </div>
        </div>

        <div class="momf-details-list">
          <div class="momf-detail-item">
            <strong>Deslocamento:</strong> <span>${esc(ws.speed || '9 m')}</span>
          </div>
          <div class="momf-detail-item">
            <strong>Espaço / Alcance:</strong> <span>${esc(ws.space_reach || '1,5 m / 1,5 m')}</span>
          </div>
          ${ws.attacks ? `
            <div class="momf-detail-item attacks-row">
              <strong>Ataques Naturais:</strong>
              <span>${esc(ws.attacks)}</span>
            </div>
          ` : ''}
          ${ws.special_attacks ? `
            <div class="momf-detail-item">
              <strong>Ataques Especiais (Ex):</strong>
              <span>${esc(ws.special_attacks)}</span>
            </div>
          ` : ''}
          ${ws.special_qualities ? `
            <div class="momf-detail-item">
              <strong>Qualidades Especiais:</strong>
              <span>${esc(ws.special_qualities)}</span>
            </div>
          ` : ''}
        </div>

        <p class="help">
          💡 Seus atributos físicos (FOR, DES, CON), tamanho e armadura natural substituíram os seus.
          Itens mágicos e armaduras com a propriedade mágica <em>Selvagem</em> continuam ativos.
        </p>
      </article>
    `;
  }

  function renderTrackerCard(c, stats) {
    const uses = c.wildShapeUses || { max: stats.maxUses, used: 0, featExtra: true };
    const remaining = Math.max(0, uses.max - uses.used);

    // Gerar pips visuais táteis para iPhone
    let pipsHtml = '';
    for (let i = 0; i < uses.max; i++) {
      const active = i < remaining;
      pipsHtml += `<span class="momf-pip ${active ? 'available' : 'spent'}" title="Uso ${i+1}"></span>`;
    }

    return `
      <article class="card momf-tracker-card">
        <div class="momf-tracker-head">
          <div>
            <h3><span>🐺</span> Usos de Forma Selvagem</h3>
            <small class="muted">Druida: Nív ${stats.druidLevel} · MoMF: Nív ${stats.momfLevel} · Máx: ${stats.maxHD} HD</small>
          </div>
          <div class="momf-tracker-count">
            <strong>${remaining}</strong> <span>/ ${uses.max}</span>
          </div>
        </div>

        <div class="momf-pips-bar">
          ${pipsHtml}
        </div>

        <div class="momf-tracker-actions">
          <button class="btn" data-momf-action="spend-use" ${remaining <= 0 ? 'disabled' : ''}>−1 Uso</button>
          <button class="btn" data-momf-action="gain-use" ${uses.used <= 0 ? 'disabled' : ''}>+1 Uso</button>
          <button class="btn primary" data-momf-action="rest-uses">🔄 Descanso Longo</button>
        </div>

        <div class="momf-tracker-subinfo">
          <span>⏱️ <strong>${stats.durationHours}h</strong> de duração por uso</span>
          <label class="momf-check-label">
            <input type="checkbox" id="momf-feat-check" ${uses.featExtra ? 'checked' : ''}>
            <span>Talento Forma Selvagem Adicional (+2)</span>
          </label>
        </div>
      </article>
    `;
  }

  function renderCreatureCard(c, cr, stats) {
    const can = stats.canAssume(cr);
    const isTransformed = c.wildShape?.active && c.wildShape.creatureId === cr.id;
    const isFav = isFavoriteShape(c, cr.id);

    return `
      <div class="momf-card ${isTransformed ? 'current-active' : ''} ${!can ? 'locked' : ''}">
        <div class="momf-card-header">
          <div>
            <h4 class="momf-card-name">${esc(cr.name)}</h4>
            <span class="momf-card-type">${esc(cr.type)} · ${esc(cr.size)} · ${cr.hd_val || '?'} HD</span>
          </div>
          <button class="icon-btn momf-fav-btn ${isFav ? 'active' : ''}" data-momf-fav="${cr.id}" aria-label="Favoritar ${esc(cr.name)}">
            ${isFav ? '★' : '☆'}
          </button>
        </div>

        <div class="momf-mini-stats">
          <span><strong>FOR</strong> ${cr.str || '—'}</span>
          <span><strong>DES</strong> ${cr.dex || '—'}</span>
          <span><strong>CON</strong> ${cr.con || '—'}</span>
          <span><strong>CA Nat</strong> +${cr.natural_armor || 0}</span>
        </div>

        <div class="momf-card-speed">
          <small>⚡ Deslocamento: ${esc(cr.speed || '9 m')}</small>
        </div>

        ${cr.full_attack || cr.attack ? `
          <div class="momf-card-attacks">
            <small>⚔️ ${esc(cr.full_attack || cr.attack)}</small>
          </div>
        ` : ''}

        <div class="momf-card-actions">
          <button class="btn" data-momf-detail="${cr.id}">Ficha Detalhada</button>
          ${isTransformed ? `
            <button class="btn danger" data-momf-action="revert">Desfazer Forma</button>
          ` : `
            <button class="btn ${can ? 'primary' : 'disabled'}" data-momf-transform="${cr.id}" ${!can ? 'disabled' : ''}>
              ${can ? '🐺 Assumir Forma' : '🔒 Nível Insuficiente'}
            </button>
          `}
        </div>
      </div>
    `;
  }

  function renderBibleTab(c, stats) {
    const levelData = MOMF_PROGRESSION.find(p => p.level === bibleLevel) || MOMF_PROGRESSION[0];

    return `
      <div class="momf-bible-section">
        <div class="momf-bible-selector">
          <label>Nível de Mestre das Muitas Formas:</label>
          <div class="momf-level-pills">
            ${MOMF_PROGRESSION.map(p => `
              <button class="momf-pill ${p.level === bibleLevel ? 'active' : ''}" data-momf-bible-level="${p.level}">
                Nív ${p.level}
              </button>
            `).join('')}
          </div>
        </div>

        <article class="card momf-bible-card">
          <div class="card-head">
            <h3>⭐ MoMF Nível ${levelData.level}: ${esc(levelData.title)}</h3>
          </div>

          <div class="momf-bible-highlights">
            <div class="bible-badge"><strong>Tipos:</strong> ${levelData.typesUnlocked.map(esc).join(', ')}</div>
            <div class="bible-badge"><strong>Tamanhos:</strong> ${levelData.sizesUnlocked.map(esc).join(', ')}</div>
            <div class="bible-badge"><strong>Limite de HD:</strong> Nível Total de Personagem</div>
          </div>

          <h4 style="margin: 16px 0 8px; font-size: 13px; color: var(--accent);">Habilidades Desbloqueadas:</h4>
          <ul class="momf-feature-list">
            ${(levelData.features || []).map(f => `<li>${esc(f)}</li>`).join('')}
          </ul>

          <div class="momf-tactics-box">
            <h4>💡 Dicas Táticas & Melhores Formas:</h4>
            <p>${esc(levelData.tacticsTip || '')}</p>
          </div>

          <h4 style="margin: 20px 0 10px; font-size: 13px; color: var(--accent);">Formas Recomendadas da Bíblia:</h4>
          <div class="momf-creatures-grid">
            ${(levelData.recommendedForms || []).map(f => {
              const fullCr = MOMF_CREATURES.find(cr => cr.name.toLowerCase() === f.name.toLowerCase());
              const cr = fullCr || {
                id: 'custom_' + f.name,
                name: f.name,
                type: f.type || 'Monstro',
                size: f.size || 'Médio',
                hd_val: f.hd || 0,
                str: f.str || '—',
                dex: f.dex || '—',
                con: f.con || '—',
                natural_armor: f.natural_armor || 0,
                speed: f.speed || '9 m',
                full_attack: f.attack || ''
              };
              return renderCreatureCard(c, cr, stats);
            }).join('')}
          </div>
        </article>
      </div>
    `;
  }

  function renderSavedTab(c, stats) {
    const saved = c.savedShapes || [];
    if (!saved.length) {
      return `
        <div class="empty">
          <strong>Nenhuma forma favoritada ainda</strong>
          Toque no botão de estrela (☆) em qualquer criatura do catálogo para salvar suas formas preferidas para combate ou exploração!
        </div>
      `;
    }

    const savedCreatures = saved.map(s => {
      const id = typeof s === 'string' ? s : s.id;
      return MOMF_CREATURES.find(cr => cr.id === id);
    }).filter(Boolean);

    return `
      <div class="momf-creatures-grid">
        ${savedCreatures.map(cr => renderCreatureCard(c, cr, stats)).join('')}
      </div>
    `;
  }

  function renderRulesTab() {
    return `
      <article class="card">
        <div class="card-head">
          <h3>📜 ${esc(MOMF_RULES.title || 'Regras Oficiais')}</h3>
        </div>
        <p class="help">${esc(MOMF_RULES.summary || '')}</p>

        <div class="momf-rules-list">
          ${(MOMF_RULES.topics || []).map(t => `
            <div class="momf-rule-item">
              <h4>${esc(t.title)}</h4>
              <p>${esc(t.text)}</p>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }

  function showCreatureDetailModal(creatureId) {
    const cr = MOMF_CREATURES.find(x => x.id === creatureId);
    if (!cr) return;

    const c = current();
    const stats = getMoMFCharacterStats(c);
    const can = stats.canAssume(cr);
    const isTransformed = c.wildShape?.active && c.wildShape.creatureId === cr.id;

    const body = `
      <div class="momf-modal-detail">
        <div class="momf-modal-header-info">
          <span class="badge">${esc(cr.type)} (${esc(cr.size)}) · ${cr.hd || cr.hd_val + ' HD'}</span>
          <span class="badge muted">${esc(cr.source || 'Manual dos Monstros')}</span>
        </div>

        <div class="momf-stats-grid" style="margin: 16px 0;">
          <div class="stat"><strong>${cr.str || '—'}</strong><small>FORÇA</small></div>
          <div class="stat"><strong>${cr.dex || '—'}</strong><small>DESTREZA</small></div>
          <div class="stat"><strong>${cr.con || '—'}</strong><small>CONSTITUIÇÃO</small></div>
          <div class="stat"><strong>+${cr.natural_armor || 0}</strong><small>CA NATURAL</small></div>
        </div>

        <div class="momf-detail-field"><strong>Iniciativa:</strong> ${esc(cr.initiative || '+0')}</div>
        <div class="momf-detail-field"><strong>Deslocamento:</strong> ${esc(cr.speed || '9 m')}</div>
        <div class="momf-detail-field"><strong>Classe de Armadura:</strong> ${esc(cr.ac || '10')}</div>
        <div class="momf-detail-field"><strong>Ataque Base / Agarrar:</strong> ${esc(cr.base_attack_grapple || '+0/+0')}</div>
        <div class="momf-detail-field"><strong>Ataque:</strong> ${esc(cr.attack || 'Nenhum')}</div>
        <div class="momf-detail-field"><strong>Ataque Total:</strong> ${esc(cr.full_attack || cr.attack || 'Nenhum')}</div>
        <div class="momf-detail-field"><strong>Espaço / Alcance:</strong> ${esc(cr.space_reach || '1,5 m / 1,5 m')}</div>
        <div class="momf-detail-field"><strong>Ataques Especiais:</strong> ${esc(cr.special_attacks || 'Nenhum')}</div>
        <div class="momf-detail-field"><strong>Qualidades Especiais:</strong> ${esc(cr.special_qualities || 'Nenhuma')}</div>
        <div class="momf-detail-field"><strong>Testes de Resistência:</strong> ${esc(cr.saves || '—')}</div>
        <div class="momf-detail-field"><strong>Perícias:</strong> ${esc(cr.skills || '—')}</div>
        <div class="momf-detail-field"><strong>Talentos:</strong> ${esc(cr.feats || '—')}</div>
      </div>
    `;

    const foot = `
      <button class="btn" data-close>Fechar</button>
      ${isTransformed ? `
        <button class="btn danger" data-momf-action="revert-modal">Desfazer Metamorfose</button>
      ` : `
        <button class="btn ${can ? 'primary' : 'disabled'}" data-momf-modal-transform="${cr.id}" ${!can ? 'disabled' : ''}>
          ${can ? '🐺 Assumir Esta Forma' : '🔒 Nível Insuficiente'}
        </button>
      `}
    `;

    modal(cr.name, body, foot);
  }

  // Registra eventos do módulo MoMF
  document.addEventListener('click', e => {
    const b = e.target.closest('button, [data-momf-action]');
    if (!b) return;
    const c = current();
    const stats = getMoMFCharacterStats(c);

    // Troca de sub-abas do MoMF
    if (b.dataset.momfSubtab) {
      momfSubTab = b.dataset.momfSubtab;
      render();
      window.scrollTo(0, 0);
      return;
    }

    // Ações do Tracker
    if (b.dataset.momfAction === 'spend-use') {
      c.wildShapeUses = c.wildShapeUses || { max: stats.maxUses, used: 0, featExtra: true };
      if (c.wildShapeUses.used < c.wildShapeUses.max) {
        c.wildShapeUses.used++;
        save();
        render();
        toast('1 uso de Forma Selvagem consumido.');
      }
      return;
    }

    if (b.dataset.momfAction === 'gain-use') {
      c.wildShapeUses = c.wildShapeUses || { max: stats.maxUses, used: 0, featExtra: true };
      if (c.wildShapeUses.used > 0) {
        c.wildShapeUses.used--;
        save();
        render();
        toast('1 uso de Forma Selvagem recuperado.');
      }
      return;
    }

    if (b.dataset.momfAction === 'rest-uses') {
      c.wildShapeUses = c.wildShapeUses || { max: stats.maxUses, used: 0, featExtra: true };
      c.wildShapeUses.used = 0;
      save();
      render();
      toast('Descanso Longo concluído! Todos os usos de Forma Selvagem foram renovados.');
      return;
    }

    // Reverter forma
    if (b.dataset.momfAction === 'revert' || b.dataset.momfAction === 'revert-modal') {
      revertTransformation(c);
      save();
      if (b.dataset.momfAction === 'revert-modal') {
        const m = document.querySelector('#modal');
        if (m) m.close();
      }
      render();
      toast('Você retornou à sua forma natural.');
      return;
    }

    // Assumir forma a partir do card
    if (b.dataset.momfTransform) {
      const cr = MOMF_CREATURES.find(x => x.id === b.dataset.momfTransform);
      if (cr) {
        applyTransformation(c, cr, true);
        save();
        render();
        toast(`Transformado com sucesso em ${cr.name}!`);
      }
      return;
    }

    // Assumir forma a partir do modal
    if (b.dataset.momfModalTransform) {
      const cr = MOMF_CREATURES.find(x => x.id === b.dataset.momfModalTransform);
      if (cr) {
        applyTransformation(c, cr, true);
        save();
        const m = document.querySelector('#modal');
        if (m) m.close();
        render();
        toast(`Transformado com sucesso em ${cr.name}!`);
      }
      return;
    }

    // Detalhe da criatura
    if (b.dataset.momfDetail) {
      showCreatureDetailModal(b.dataset.momfDetail);
      return;
    }

    // Favoritar forma
    if (b.dataset.momfFav) {
      const added = toggleFavoriteShape(c, b.dataset.momfFav);
      save();
      render();
      toast(added ? 'Forma favoritada!' : 'Forma removida dos favoritos.');
      return;
    }

    // Nível na Bíblia
    if (b.dataset.momfBibleLevel) {
      bibleLevel = Number(b.dataset.momfBibleLevel);
      render();
      return;
    }
  });

  // Filtros dinâmicos e busca
  document.addEventListener('input', e => {
    if (e.target.id === 'momf-search') {
      searchQuery = e.target.value;
      const pos = e.target.selectionStart;
      render();
      const el = document.getElementById('momf-search');
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'momf-type-select') {
      selectedType = e.target.value;
      render();
    }
    if (e.target.id === 'momf-size-select') {
      selectedSize = e.target.value;
      render();
    }
    if (e.target.id === 'momf-move-select') {
      selectedMovement = e.target.value;
      render();
    }
    if (e.target.id === 'momf-sort-select') {
      sortBy = e.target.value;
      render();
    }
    if (e.target.id === 'momf-only-allowed-check') {
      onlyAllowed = e.target.checked;
      render();
    }
    if (e.target.id === 'momf-feat-check') {
      const c = current();
      c.wildShapeUses = c.wildShapeUses || {};
      c.wildShapeUses.featExtra = e.target.checked;
      const stats = getMoMFCharacterStats(c);
      c.wildShapeUses.max = stats.maxUses;
      save();
      render();
    }
  });

  return {
    panel() {
      const c = current();
      const stats = getMoMFCharacterStats(c);

      // Sincronizar limite de usos de Forma Selvagem
      c.wildShapeUses = c.wildShapeUses || { max: stats.maxUses, used: 0, featExtra: true };
      c.wildShapeUses.max = stats.maxUses;

      const filtered = filterCreatures(c);

      return `
        <div class="momf-container">
          <!-- Banner de Status / Forma Ativa -->
          ${renderActiveShapeCard(c)}

          <!-- Tracker de Usos Diários -->
          ${renderTrackerCard(c, stats)}

          <!-- Sub-Navegação MoMF -->
          <div class="momf-subnav">
            <button class="btn ${momfSubTab === 'catalog' ? 'primary' : ''}" data-momf-subtab="catalog">
              📖 Catálogo de Criaturas (${filtered.length})
            </button>
            <button class="btn ${momfSubTab === 'bible' ? 'primary' : ''}" data-momf-subtab="bible">
              ⭐ Bíblia MoMF (Nív 1–10)
            </button>
            <button class="btn ${momfSubTab === 'saved' ? 'primary' : ''}" data-momf-subtab="saved">
              📌 Salvas (${(c.savedShapes || []).length})
            </button>
            <button class="btn ${momfSubTab === 'rules' ? 'primary' : ''}" data-momf-subtab="rules">
              📜 Regras
            </button>
          </div>

          ${momfSubTab === 'bible' ? renderBibleTab(c, stats) :
            momfSubTab === 'saved' ? renderSavedTab(c, stats) :
            momfSubTab === 'rules' ? renderRulesTab() : `
            <!-- Filtros do Catálogo -->
            <article class="card momf-filter-box">
              <input class="toolbar" id="momf-search" type="search" value="${esc(searchQuery)}" placeholder="Buscar criatura por nome, habilidade, ataque…" aria-label="Buscar criatura">
              
              <div class="momf-filters-grid">
                <label class="field">Tipo
                  <select id="momf-type-select">
                    <option value="all" ${selectedType === 'all' ? 'selected' : ''}>Todos os Tipos</option>
                    ${Array.from(stats.allowedTypes).map(t => `<option value="${t}" ${selectedType === t ? 'selected' : ''}>${t}</option>`).join('')}
                    <option disabled>── Outros tipos ──</option>
                    ${['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta', 'Gosma', 'Aberração', 'Dragão', 'Elemental', 'Monstro da Tempestade', 'Morto-Vivo'].filter(t => !stats.allowedTypes.has(t)).map(t => `<option value="${t}" ${selectedType === t ? 'selected' : ''}>${t}</option>`).join('')}
                  </select>
                </label>

                <label class="field">Tamanho
                  <select id="momf-size-select">
                    <option value="all" ${selectedSize === 'all' ? 'selected' : ''}>Todos os Tamanhos</option>
                    ${['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso', 'Colossal'].map(s => `<option value="${s}" ${selectedSize === s ? 'selected' : ''}>${s}</option>`).join('')}
                  </select>
                </label>

                <label class="field">Deslocamento
                  <select id="momf-move-select">
                    <option value="all" ${selectedMovement === 'all' ? 'selected' : ''}>Qualquer</option>
                    <option value="Voo" ${selectedMovement === 'Voo' ? 'selected' : ''}>Voo (Alado)</option>
                    <option value="Natação" ${selectedMovement === 'Natação' ? 'selected' : ''}>Natação (Aquático)</option>
                    <option value="Escavação" ${selectedMovement === 'Escavação' ? 'selected' : ''}>Escavação (Subterrâneo)</option>
                  </select>
                </label>

                <label class="field">Ordenar por
                  <select id="momf-sort-select">
                    <option value="name-asc" ${sortBy === 'name-asc' ? 'selected' : ''}>Nome (A–Z)</option>
                    <option value="hd-desc" ${sortBy === 'hd-desc' ? 'selected' : ''}>Dados de Vida (Maior HD)</option>
                    <option value="str-desc" ${sortBy === 'str-desc' ? 'selected' : ''}>Força (Maior)</option>
                    <option value="dex-desc" ${sortBy === 'dex-desc' ? 'selected' : ''}>Destreza (Maior)</option>
                    <option value="nat-desc" ${sortBy === 'nat-desc' ? 'selected' : ''}>Armadura Natural (Maior)</option>
                  </select>
                </label>
              </div>

              <div class="momf-filter-toggle-row">
                <label class="check">
                  <input type="checkbox" id="momf-only-allowed-check" ${onlyAllowed ? 'checked' : ''}>
                  <span>🔒 Apenas criaturas que posso assumir (Máx: ${stats.maxHD} HD)</span>
                </label>
              </div>
            </article>

            <!-- Lista de Criaturas -->
            <div class="momf-creatures-grid">
              ${filtered.length ? filtered.slice(0, 80).map(cr => renderCreatureCard(c, cr, stats)).join('') : `
                <div class="empty">
                  <strong>Nenhuma criatura encontrada</strong>
                  Tente alterar seus termos de busca ou desmarque o filtro de nível.
                </div>
              `}
            </div>
            ${filtered.length > 80 ? `
              <p class="help" style="text-align: center; margin-top: 15px;">
                Exibindo as primeiras 80 de ${filtered.length} criaturas. Refine sua busca para ver mais.
              </p>
            ` : ''}
          `}
        </div>
      `;
    },

    banner(c) {
      if (!c.wildShape || !c.wildShape.active) return '';
      return `
        <div class="momf-top-banner">
          <div class="momf-top-banner-content">
            <span class="pulse-dot"></span>
            <span>🐺 Metamorfoseado em: <strong>${esc(c.wildShape.creatureName)}</strong> (${esc(c.wildShape.size)})</span>
          </div>
          <button class="btn-micro danger" data-momf-action="revert" title="Retornar à forma original">Reverter</button>
        </div>
      `;
    }
  };
}
