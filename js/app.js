/**
 * COMPÊNDIO DO MESTRE DAS MUITAS FORMAS - D&D 3.5
 * Lógica do Aplicativo em Vanilla JS
 */

// Estado Global da Aplicação
const State = {
  activeTab: 'compendium',
  viewMode: 'cards', // 'cards' | 'table'
  
  // Personagem
  druidLevel: 5,
  momfLevel: 4,
  filterByCharacter: false,
  
  // Ficha Base do Jogador (persistida)
  charSheet: {
    name: 'Metamorfo',
    baseStr: 10,
    baseDex: 14,
    baseCon: 14,
    baseInt: 12,
    baseWis: 16,
    baseCha: 8,
    bab: 4,
    baseHp: 38,
    wildArmorBonus: 4, // Ex: Couro batido +1 com propriedade Selvagem
    shieldBonus: 0
  },

  // Filtros de Catálogo
  searchQuery: '',
  selectedTypes: new Set(),
  selectedSizes: new Set(),
  minHD: 0,
  maxHD: 25,
  selectedCategory: 'all', // 'all', 'Combate', 'Exploração', 'Especial'
  selectedMovements: new Set(),
  selectedTags: new Set(),
  onlyRecommended: false,
  sortBy: 'name-asc',

  // Nível selecionado na Aba Bíblia MoMF
  bibleSelectedLevel: 1,

  // Forma Ativa Selecionada
  transformedCreature: null,

  // Favoritos
  favorites: new Set(),
  favoriteNotes: {},

  // Usos Diários de Forma Selvagem
  extraWildShapeFeat: true, // Talento Forma Selvagem Adicional (+2 usos)
  wildShapeUsesLeft: 7
};

// Carregar preferências salvas do localStorage
function loadSavedState() {
  try {
    const savedFavs = localStorage.getItem('momf_favorites');
    if (savedFavs) {
      State.favorites = new Set(JSON.parse(savedFavs));
    }
    const savedNotes = localStorage.getItem('momf_favorite_notes');
    if (savedNotes) {
      State.favoriteNotes = JSON.parse(savedNotes);
    }
    const savedChar = localStorage.getItem('momf_charsheet');
    if (savedChar) {
      State.charSheet = Object.assign(State.charSheet, JSON.parse(savedChar));
    }
    const savedDruid = localStorage.getItem('momf_druid_level');
    if (savedDruid) State.druidLevel = parseInt(savedDruid, 10);
    const savedMoMF = localStorage.getItem('momf_momf_level');
    if (savedMoMF) State.momfLevel = parseInt(savedMoMF, 10);
    const savedFilterChar = localStorage.getItem('momf_filter_char');
    if (savedFilterChar !== null) State.filterByCharacter = savedFilterChar === 'true';
    const savedWSFeat = localStorage.getItem('momf_extra_ws_feat');
    if (savedWSFeat !== null) State.extraWildShapeFeat = savedWSFeat === 'true';
    const savedWSUses = localStorage.getItem('momf_ws_uses_left');
    if (savedWSUses !== null) State.wildShapeUsesLeft = parseInt(savedWSUses, 10);
  } catch (e) {
    console.warn('Erro ao carregar do localStorage:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('momf_favorites', JSON.stringify(Array.from(State.favorites)));
    localStorage.setItem('momf_favorite_notes', JSON.stringify(State.favoriteNotes));
    localStorage.setItem('momf_charsheet', JSON.stringify(State.charSheet));
    localStorage.setItem('momf_druid_level', State.druidLevel.toString());
    localStorage.setItem('momf_momf_level', State.momfLevel.toString());
    localStorage.setItem('momf_filter_char', State.filterByCharacter.toString());
    localStorage.setItem('momf_extra_ws_feat', State.extraWildShapeFeat.toString());
    localStorage.setItem('momf_ws_uses_left', State.wildShapeUsesLeft.toString());
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

// Helpers de Regras D&D 3.5
function calculateMaxHD() {
  // Limite de HD = Total de Níveis de Personagem (Druida + MoMF + outros)
  return State.druidLevel + State.momfLevel;
}

function getModifier(stat) {
  if (stat === null || stat === undefined || isNaN(stat)) return 0;
  return Math.floor((stat - 10) / 2);
}

function formatMod(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getSizeModifier(size) {
  switch (size) {
    case 'Diminuto': return 4;
    case 'Miúdo': return 2;
    case 'Pequeno': return 1;
    case 'Médio': return 0;
    case 'Grande': return -1;
    case 'Enorme': return -2;
    case 'Imenso': return -4;
    case 'Colossal': return -8;
    default: return 0;
  }
}

function formatCardAC(c) {
  if (c.ac) {
    const match = c.ac.match(/^\s*(\d+)/);
    if (match) {
      const total = match[1];
      const nat = c.natural_armor;
      if (nat !== undefined && nat !== null && nat > 0) {
        return `CA ${total} (+${nat} nat)`;
      }
      return `CA ${total}`;
    }
    return c.ac;
  }
  const sizeMod = getSizeModifier(c.size);
  const dexMod = getModifier(c.dex);
  const nat = c.natural_armor || 0;
  const total = 10 + sizeMod + dexMod + nat;
  return `CA ${total} (+${nat} nat)`;
}

function extractTotalAC(c) {
  if (c.ac) {
    const match = c.ac.match(/^\s*(\d+)/);
    if (match) return match[1];
  }
  const sizeMod = getSizeModifier(c.size);
  const dexMod = getModifier(c.dex);
  const nat = c.natural_armor || 0;
  return 10 + sizeMod + dexMod + nat;
}

// Regras de Usos Diários de Forma Selvagem (D&D 3.5)
function getDruidBaseWildShapeUses(druidLvl) {
  if (druidLvl >= 18) return 6;
  if (druidLvl >= 14) return 5;
  if (druidLvl >= 10) return 4;
  if (druidLvl >= 7) return 3;
  if (druidLvl >= 6) return 2;
  if (druidLvl >= 5) return 1;
  return 0; // Antes do nível 5 druida não possui Forma Selvagem
}

function calculateMaxWildShapeUses() {
  const druidUses = getDruidBaseWildShapeUses(State.druidLevel);
  const momfUses = State.momfLevel; // Cada nível de MoMF adiciona +1 uso/dia
  const extraFeat = State.extraWildShapeFeat ? 2 : 0; // Talento Forma Selvagem Adicional (C.Divino)
  return Math.max(1, druidUses + momfUses + extraFeat);
}

function calculateWildShapeDurationHours() {
  // Duração = soma dos níveis de Druida + MoMF (horas por uso)
  return Math.max(1, State.druidLevel + State.momfLevel);
}

function updateWildShapeTrackerUI() {
  const maxUses = calculateMaxWildShapeUses();
  if (State.wildShapeUsesLeft === undefined || State.wildShapeUsesLeft === null) {
    State.wildShapeUsesLeft = maxUses;
  }
  // Limitar entre 0 e maxUses
  State.wildShapeUsesLeft = Math.max(0, Math.min(State.wildShapeUsesLeft, maxUses));

  const duration = calculateWildShapeDurationHours();
  const countText = `${State.wildShapeUsesLeft} / ${maxUses}`;
  const durationText = `⏱️ ${duration}h / uso`;

  // Elementos do Cabeçalho
  const headerCount = document.getElementById('headerWildShapeCount');
  const headerDuration = document.getElementById('headerWildShapeDuration');
  const headerPips = document.getElementById('headerTrackerPips');
  const headerCheck = document.getElementById('headerExtraWildShapeCheck');

  if (headerCount) {
    headerCount.textContent = countText;
    headerCount.style.color = State.wildShapeUsesLeft === 0 ? 'var(--accent-rose)' : 'var(--emerald-light)';
  }
  if (headerDuration) headerDuration.textContent = durationText;
  if (headerCheck) headerCheck.checked = !!State.extraWildShapeFeat;

  if (headerPips) {
    let pipsHtml = '';
    for (let i = 0; i < maxUses; i++) {
      const isAvailable = i < State.wildShapeUsesLeft;
      pipsHtml += `<div class="tracker-pip ${isAvailable ? '' : 'spent'}" title="Uso ${i + 1} de ${maxUses} ${isAvailable ? '(Disponível)' : '(Gasto)'}"></div>`;
    }
    headerPips.innerHTML = pipsHtml;
  }

  // Elementos da Barra Lateral (Metamorfose Ativa)
  const sideCount = document.getElementById('sideWildShapeCount');
  const sideDuration = document.getElementById('sideTrackerDuration');
  const sidePips = document.getElementById('sideTrackerPips');
  const sideBreakdown = document.getElementById('sideWildShapeBreakdown');

  const druidUses = getDruidBaseWildShapeUses(State.druidLevel);
  if (sideCount) {
    sideCount.textContent = `${State.wildShapeUsesLeft} / ${maxUses} Usos`;
    sideCount.style.color = State.wildShapeUsesLeft === 0 ? 'var(--accent-rose)' : 'var(--emerald-light)';
  }
  if (sideDuration) sideDuration.textContent = `${duration}h / forma`;
  if (sideBreakdown) {
    sideBreakdown.textContent = `Druida ${State.druidLevel} (${druidUses}) + MoMF ${State.momfLevel} (+${State.momfLevel}) ${State.extraWildShapeFeat ? '+ Talento Adicional (+2)' : ''} = ${maxUses} Usos/dia`;
  }
  if (sidePips) {
    let pipsHtml = '';
    for (let i = 0; i < maxUses; i++) {
      const isAvailable = i < State.wildShapeUsesLeft;
      pipsHtml += `<div class="tracker-pip ${isAvailable ? '' : 'spent'}" style="width: 14px; height: 14px;" title="Uso ${i + 1} de ${maxUses}"></div>`;
    }
    sidePips.innerHTML = pipsHtml;
  }
}

function spendWildShapeUse() {
  if (State.wildShapeUsesLeft > 0) {
    State.wildShapeUsesLeft--;
    saveState();
    updateWildShapeTrackerUI();
    showToast(`Forma Selvagem gasta! Restam ${State.wildShapeUsesLeft} uso(s) hoje.`, '🐺');
  } else {
    showToast('Atenção: Nenhum uso de Forma Selvagem restante hoje!', '⚠️');
  }
}

function gainWildShapeUse() {
  const maxUses = calculateMaxWildShapeUses();
  if (State.wildShapeUsesLeft < maxUses) {
    State.wildShapeUsesLeft++;
    saveState();
    updateWildShapeTrackerUI();
    showToast(`1 uso de Forma Selvagem recuperado (${State.wildShapeUsesLeft}/${maxUses}).`, '🌿');
  }
}

function resetWildShapeUses() {
  const maxUses = calculateMaxWildShapeUses();
  State.wildShapeUsesLeft = maxUses;
  saveState();
  updateWildShapeTrackerUI();
  showToast(`Descanso realizado! Todos os ${maxUses} usos diários de Forma Selvagem foram restaurados.`, '🔄');
}

function toggleExtraWildShapeFeat(enabled) {
  State.extraWildShapeFeat = enabled;
  const maxUses = calculateMaxWildShapeUses();
  if (State.wildShapeUsesLeft > maxUses) {
    State.wildShapeUsesLeft = maxUses;
  }
  saveState();
  updateWildShapeTrackerUI();
  showToast(enabled ? 'Talento Forma Selvagem Adicional ativado (+2 usos/dia)!' : 'Talento Forma Selvagem Adicional desativado.', '⭐');
}

// Toast Notification
function showToast(message, icon = '🌿') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  initHeader();
  initTabs();
  initFilterControls();
  initCompendiumView();
  initProgressionView();
  initActiveShapeCalculator();
  initFavoritesView();
  initRulesView();
  initModal();

  renderAll();
});

// Renderização Geral
function renderAll() {
  updateHeaderStats();
  if (State.activeTab === 'compendium') {
    renderCompendium();
  } else if (State.activeTab === 'progression') {
    renderProgression();
  } else if (State.activeTab === 'active-shape') {
    renderActiveShape();
  } else if (State.activeTab === 'favorites') {
    renderFavorites();
  }
}

// Header & Quick Profile
function initHeader() {
  const druidSelect = document.getElementById('headerDruidLevel');
  const momfSelect = document.getElementById('headerMoMFLevel');
  const charFilterToggle = document.getElementById('headerCharFilterToggle');

  if (druidSelect) {
    druidSelect.value = State.druidLevel;
    druidSelect.addEventListener('change', (e) => {
      State.druidLevel = parseInt(e.target.value, 10);
      saveState();
      renderAll();
    });
  }

  if (momfSelect) {
    momfSelect.value = State.momfLevel;
    momfSelect.addEventListener('change', (e) => {
      State.momfLevel = parseInt(e.target.value, 10);
      State.bibleSelectedLevel = State.momfLevel;
      saveState();
      renderAll();
    });
  }

  if (charFilterToggle) {
    if (State.filterByCharacter) charFilterToggle.classList.add('active');
    charFilterToggle.addEventListener('click', () => {
      State.filterByCharacter = !State.filterByCharacter;
      charFilterToggle.classList.toggle('active', State.filterByCharacter);
      saveState();
      showToast(State.filterByCharacter ? 'Filtro ativado: exibindo apenas formas válidas para o seu nível!' : 'Filtro desativado: exibindo todas as formas do compêndio.');
      renderAll();
    });
  }

  // Controles do Rastreador de Formas Diárias
  const btnSpendWS = document.getElementById('btnSpendWildShape');
  const btnGainWS = document.getElementById('btnGainWildShape');
  const btnRestWS = document.getElementById('btnRestWildShape');
  const checkExtraWS = document.getElementById('headerExtraWildShapeCheck');

  if (btnSpendWS) btnSpendWS.addEventListener('click', () => spendWildShapeUse());
  if (btnGainWS) btnGainWS.addEventListener('click', () => gainWildShapeUse());
  if (btnRestWS) btnRestWS.addEventListener('click', () => resetWildShapeUses());
  if (checkExtraWS) {
    checkExtraWS.checked = !!State.extraWildShapeFeat;
    checkExtraWS.addEventListener('change', (e) => toggleExtraWildShapeFeat(e.target.checked));
  }

  const btnSideSpend = document.getElementById('btnSideSpendWS');
  const btnSideRest = document.getElementById('btnSideRestWS');
  if (btnSideSpend) btnSideSpend.addEventListener('click', () => spendWildShapeUse());
  if (btnSideRest) btnSideRest.addEventListener('click', () => resetWildShapeUses());
}

function updateHeaderStats() {
  const maxHdElem = document.getElementById('headerMaxHD');
  if (maxHdElem) {
    maxHdElem.textContent = `${calculateMaxHD()} HD`;
  }
  const favCountBadge = document.getElementById('favTabBadge');
  if (favCountBadge) {
    favCountBadge.textContent = State.favorites.size;
  }
  updateWildShapeTrackerUI();
}

// Navegação entre Abas
function initTabs() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  State.activeTab = tabId;
  document.querySelectorAll('.nav-tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${tabId}`);
  });
  renderAll();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Controles de Filtro do Compêndio
function initFilterControls() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.searchQuery = e.target.value.toLowerCase().trim();
      renderCompendium();
    });
  }

  // Quick Filter Pills (Combate, Exploração, Especial, Apenas MoMF Bible)
  const quickPills = document.querySelectorAll('.quick-filter-pills .pill-btn');
  quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const filter = pill.getAttribute('data-filter');
      if (filter === 'recommended') {
        State.onlyRecommended = !State.onlyRecommended;
        pill.classList.toggle('active', State.onlyRecommended);
      } else {
        if (State.selectedCategory === filter) {
          State.selectedCategory = 'all';
          pill.classList.remove('active');
        } else {
          State.selectedCategory = filter;
          quickPills.forEach(p => {
            if (p.getAttribute('data-filter') !== 'recommended') p.classList.remove('active');
          });
          pill.classList.add('active');
        }
      }
      renderCompendium();
    });
  });

  // Filtros de Tipo
  const typeContainer = document.getElementById('typeFiltersContainer');
  const typesList = [
    'Animal', 'Humanoide', 'Gigante', 'Humanoide Monstruoso', 
    'Fada', 'Inseto', 'Aberração', 'Planta', 'Gosma', 'Elemental', 'Dragão'
  ];
  if (typeContainer) {
    typeContainer.innerHTML = typesList.map(type => `
      <span class="filter-tag" data-type="${type}">${getTypeIcon(type)} ${type}</span>
    `).join('');
    typeContainer.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const type = tag.getAttribute('data-type');
        if (State.selectedTypes.has(type)) {
          State.selectedTypes.delete(type);
          tag.classList.remove('active');
        } else {
          State.selectedTypes.add(type);
          tag.classList.add('active');
        }
        renderCompendium();
      });
    });
  }

  // Filtros de Tamanho
  const sizeContainer = document.getElementById('sizeFiltersContainer');
  const sizesList = ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso'];
  if (sizeContainer) {
    sizeContainer.innerHTML = sizesList.map(size => `
      <span class="filter-tag" data-size="${size}">${size}</span>
    `).join('');
    sizeContainer.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const size = tag.getAttribute('data-size');
        if (State.selectedSizes.has(size)) {
          State.selectedSizes.delete(size);
          tag.classList.remove('active');
        } else {
          State.selectedSizes.add(size);
          tag.classList.add('active');
        }
        renderCompendium();
      });
    });
  }

  // Filtros de Deslocamento
  const movementContainer = document.getElementById('movementFiltersContainer');
  const movementsList = [
    { id: 'Voo', label: '🦅 Voo' },
    { id: 'Natação', label: '🏊 Natação' },
    { id: 'Escavação', label: '⛏️ Escavação' },
    { id: 'Escalar', label: '🧗 Escalar' },
    { id: 'Terrestre', label: '🐾 Terrestre' }
  ];
  if (movementContainer) {
    movementContainer.innerHTML = movementsList.map(m => `
      <span class="filter-tag" data-mov="${m.id}">${m.label}</span>
    `).join('');
    movementContainer.querySelectorAll('.filter-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const mov = tag.getAttribute('data-mov');
        if (State.selectedMovements.has(mov)) {
          State.selectedMovements.delete(mov);
          tag.classList.remove('active');
        } else {
          State.selectedMovements.add(mov);
          tag.classList.add('active');
        }
        renderCompendium();
      });
    });
  }

  // Filtro de HD (Min / Max)
  const minHdInput = document.getElementById('filterMinHD');
  const maxHdInput = document.getElementById('filterMaxHD');
  if (minHdInput && maxHdInput) {
    minHdInput.addEventListener('change', (e) => {
      State.minHD = parseFloat(e.target.value) || 0;
      renderCompendium();
    });
    maxHdInput.addEventListener('change', (e) => {
      State.maxHD = parseFloat(e.target.value) || 25;
      renderCompendium();
    });
  }

  // Ordenação
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      State.sortBy = e.target.value;
      renderCompendium();
    });
  }

  // Alternador de Visualização (Cards vs Tabela)
  const btnCardsView = document.getElementById('btnCardsView');
  const btnTableView = document.getElementById('btnTableView');
  if (btnCardsView && btnTableView) {
    btnCardsView.addEventListener('click', () => {
      State.viewMode = 'cards';
      btnCardsView.classList.add('active');
      btnTableView.classList.remove('active');
      renderCompendium();
    });
    btnTableView.addEventListener('click', () => {
      State.viewMode = 'table';
      btnTableView.classList.add('active');
      btnCardsView.classList.remove('active');
      renderCompendium();
    });
  }

  // Botão Limpar Filtros
  const clearFiltersBtn = document.getElementById('btnClearFilters');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      State.searchQuery = '';
      if (searchInput) searchInput.value = '';
      State.selectedTypes.clear();
      State.selectedSizes.clear();
      State.selectedMovements.clear();
      State.selectedTags.clear();
      State.selectedCategory = 'all';
      State.onlyRecommended = false;
      State.minHD = 0;
      State.maxHD = 25;
      if (minHdInput) minHdInput.value = '0';
      if (maxHdInput) maxHdInput.value = '25';

      document.querySelectorAll('.filter-tag.active').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.pill-btn.active').forEach(p => p.classList.remove('active'));

      renderCompendium();
      showToast('Filtros redefinidos!');
    });
  }
}

function getTypeIcon(type) {
  switch (type) {
    case 'Animal': return '🐾';
    case 'Humanoide': return '👤';
    case 'Gigante': return '🗿';
    case 'Humanoide Monstruoso': return '👺';
    case 'Fada': return '🧚';
    case 'Inseto': return '🦗';
    case 'Aberração': return '👁️';
    case 'Planta': return '🌲';
    case 'Gosma': return '🧪';
    case 'Elemental': return '🔥';
    case 'Dragão': return '🐉';
    default: return '✨';
  }
}

// Filtro e Ordenação de Criaturas
function getFilteredCreatures() {
  const allCreatures = window.MOMF_CREATURES || [];
  const maxCharHD = calculateMaxHD();

  // Obter tipos e tamanhos permitidos pelo nível de MoMF atual
  const momfInfo = (window.MOMF_LEVELS_INFO || []).find(l => l.level === State.momfLevel) || {
    unlockedTypes: ['Animal', 'Humanoide'],
    unlockedSizes: ['Pequeno', 'Médio']
  };

  return allCreatures.filter(c => {
    // 1. Filtro estrito de Personagem
    if (State.filterByCharacter) {
      if (c.hd_val > maxCharHD) return false;
      const typeAllowed = momfInfo.unlockedTypes.some(t => (c.type || '').includes(t));
      if (!typeAllowed) return false;
      const sizeAllowed = momfInfo.unlockedSizes.some(s => (c.size || '').includes(s));
      if (!sizeAllowed) return false;
    }

    // 2. Busca por Texto (nome, subtipo, ataques, fonte, tags)
    if (State.searchQuery) {
      const q = State.searchQuery;
      const matchName = c.name.toLowerCase().includes(q) || (c.name_en && c.name_en.toLowerCase().includes(q));
      const matchSource = c.source.toLowerCase().includes(q);
      const matchAttacks = c.attack.toLowerCase().includes(q) || c.special_attacks.toLowerCase().includes(q);
      const matchQualities = c.special_qualities.toLowerCase().includes(q);
      const matchNotes = c.combat_notes.toLowerCase().includes(q);
      if (!matchName && !matchSource && !matchAttacks && !matchQualities && !matchNotes) {
        return false;
      }
    }

    // 3. Filtro de Tipo
    if (State.selectedTypes.size > 0) {
      if (!State.selectedTypes.has(c.type)) return false;
    }

    // 4. Filtro de Tamanho
    if (State.selectedSizes.size > 0) {
      if (!State.selectedSizes.has(c.size)) return false;
    }

    // 5. Filtro de HD
    if (c.hd_val < State.minHD || c.hd_val > State.maxHD) {
      return false;
    }

    // 6. Categoria MoMF (Combate, Exploração, Especial)
    if (State.selectedCategory !== 'all') {
      if (!c.momf_category || !c.momf_category.includes(State.selectedCategory)) {
        return false;
      }
    }

    // 7. Apenas Recomendadas MoMF
    if (State.onlyRecommended && !c.momf_recommended) {
      return false;
    }

    // 8. Modos de Movimento
    if (State.selectedMovements.size > 0) {
      let hasMov = false;
      for (const mov of State.selectedMovements) {
        if (c.movement_modes.includes(mov)) {
          hasMov = true;
          break;
        }
      }
      if (!hasMov) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (State.sortBy) {
      case 'name-asc': return a.name.localeCompare(b.name, 'pt-BR');
      case 'name-desc': return b.name.localeCompare(a.name, 'pt-BR');
      case 'hd-asc': return a.hd_val - b.hd_val;
      case 'hd-desc': return b.hd_val - a.hd_val;
      case 'str-desc': return (b.str || 0) - (a.str || 0);
      case 'dex-desc': return (b.dex || 0) - (a.dex || 0);
      case 'con-desc': return (b.con || 0) - (a.con || 0);
      case 'na-desc': return (b.natural_armor || 0) - (a.natural_armor || 0);
      default: return 0;
    }
  });
}

// Renderização do Catálogo / Compêndio
function initCompendiumView() {
  // Configurações iniciais de eventos da aba se necessário
}

function renderCompendium() {
  const container = document.getElementById('compendiumContainer');
  const countDisplay = document.getElementById('compendiumCount');
  if (!container) return;

  const filtered = getFilteredCreatures();
  if (countDisplay) {
    countDisplay.innerHTML = `Exibindo <strong>${filtered.length}</strong> de ${window.MOMF_CREATURES.length} formas`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-dim);">
        <p style="font-size: 3rem; margin-bottom: 12px;">🔍</p>
        <h3 style="font-family: var(--font-title); color: var(--text-muted); margin-bottom: 8px;">Nenhuma transformação encontrada</h3>
        <p style="font-size: 0.9rem;">Tente ajustar os filtros de tipo, tamanho, HD ou termo de busca.</p>
      </div>
    `;
    return;
  }

  if (State.viewMode === 'cards') {
    container.className = 'creatures-grid';
    container.innerHTML = filtered.map(c => renderCreatureCard(c)).join('');
  } else {
    container.className = 'table-container';
    container.innerHTML = `
      <table class="creatures-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Tipo / Tamanho</th>
            <th>HD</th>
            <th>For</th>
            <th>Des</th>
            <th>Con</th>
            <th>CA (Nat)</th>
            <th>Deslocamento</th>
            <th>Ataque</th>
            <th>MoMF</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(c => renderCreatureTableRow(c)).join('')}
        </tbody>
      </table>
    `;
  }

  attachCardEvents(container);
}

function renderCreatureCard(c) {
  const isFav = State.favorites.has(c.id);
  const strMod = getModifier(c.str);
  const dexMod = getModifier(c.dex);
  const conMod = getModifier(c.con);

  const tagsHtml = (c.tactical_tags || []).slice(0, 4).map(t => `<span class="tactical-tag">${t}</span>`).join('');
  
  const categoriesHtml = (c.momf_category || []).map(cat => {
    const isCombat = cat === 'Combate';
    return `<span class="tactical-tag ${isCombat ? 'gold' : ''}">${cat}</span>`;
  }).join('');

  const bibleHighlight = c.momf_comments ? `
    <div class="bible-highlight-box">
      <strong>💡 Dica MoMF:</strong> ${c.momf_comments.length > 140 ? c.momf_comments.substring(0, 140) + '...' : c.momf_comments}
    </div>
  ` : '';

  return `
    <div class="creature-card ${c.momf_recommended ? 'recommended' : ''}" data-id="${c.id}">
      <div>
        <div class="card-header">
          <div class="creature-name-group">
            <h3 class="creature-name">${c.name}</h3>
            <div class="creature-sub">${getTypeIcon(c.type)} ${c.type} • ${c.size}</div>
          </div>
          <div class="card-badges">
            <span class="badge-hd">${c.hd_val} HD</span>
            <span class="badge-level">MoMF ${c.momf_min_level}</span>
            <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${c.id}" title="${isFav ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}">
              ${isFav ? '★' : '☆'}
            </button>
          </div>
        </div>

        <div class="stat-pill-row">
          <div class="stat-pill">
            <div class="stat-pill-label">Força</div>
            <div class="stat-pill-val">${c.str !== null ? c.str : '—'}</div>
            <div class="stat-pill-mod">${c.str !== null ? formatMod(strMod) : ''}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-pill-label">Destreza</div>
            <div class="stat-pill-val">${c.dex !== null ? c.dex : '—'}</div>
            <div class="stat-pill-mod">${c.dex !== null ? formatMod(dexMod) : ''}</div>
          </div>
          <div class="stat-pill">
            <div class="stat-pill-label">Constituição</div>
            <div class="stat-pill-val">${c.con !== null ? c.con : '—'}</div>
            <div class="stat-pill-mod">${c.con !== null ? formatMod(conMod) : ''}</div>
          </div>
        </div>

        <div class="card-combat-snippets">
          <div class="snippet-item">
            <span class="snippet-label">Desloc.:</span>
            <span class="snippet-val">${c.speed || '9 m'}</span>
          </div>
          <div class="snippet-item">
            <span class="snippet-label">Armadura:</span>
            <span class="snippet-val" title="${c.ac || ''}" style="color: var(--gold-light); font-weight: 700;">${formatCardAC(c)}</span>
          </div>
          <div class="snippet-item highlight-attack" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px;">
              <span class="snippet-label" style="font-weight: 700; color: var(--gold-light);">⚔️ Ataque:</span>
              <span class="snippet-val" style="color: #ffffff; font-weight: 600; font-family: var(--font-mono); font-size: 0.84rem;">${c.attack || '—'}</span>
            </div>
            ${c.full_attack && c.full_attack !== c.attack ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 4px; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px; margin-top: 2px;">
                <span class="snippet-label" style="font-weight: 700; color: var(--emerald-light);">⚔️ Ataque Total:</span>
                <span class="snippet-val" style="color: var(--text-main); font-family: var(--font-mono); font-size: 0.82rem;">${c.full_attack}</span>
              </div>
            ` : ''}
            ${c.special_attacks && c.special_attacks !== '—' ? `
              <div class="snippet-special-attacks" style="font-size: 0.76rem; color: var(--gold-light); margin-top: 2px; background: rgba(245, 158, 11, 0.08); padding: 3px 8px; border-radius: 4px; border-left: 2px solid var(--accent-gold);">
                <strong>⚡ Especiais:</strong> ${c.special_attacks.length > 95 ? c.special_attacks.substring(0, 95) + '...' : c.special_attacks}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="card-tags">
          ${categoriesHtml}
          ${tagsHtml}
        </div>

        ${bibleHighlight}
      </div>

      <div class="card-footer">
        <span class="card-source" title="${c.source}">📖 ${c.source || 'Manual dos Monstros'}</span>
        <div class="card-actions">
          <button class="btn-sm btn-secondary view-details-btn" data-id="${c.id}">Ficha</button>
          <button class="btn-sm btn-primary transform-btn" data-id="${c.id}">🐺 Assumir</button>
        </div>
      </div>
    </div>
  `;
}

function renderCreatureTableRow(c) {
  const isFav = State.favorites.has(c.id);
  return `
    <tr data-id="${c.id}">
      <td class="cell-name">
        <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${c.id}">
          ${isFav ? '★' : '☆'}
        </button>
        <span class="view-details-btn" data-id="${c.id}" style="cursor: pointer; text-decoration: underline dotted;">${c.name}</span>
      </td>
      <td>${getTypeIcon(c.type)} ${c.type} (${c.size})</td>
      <td><span class="badge-hd">${c.hd_val}</span></td>
      <td><strong>${c.str !== null ? c.str : '—'}</strong> (${formatMod(getModifier(c.str))})</td>
      <td><strong>${c.dex !== null ? c.dex : '—'}</strong> (${formatMod(getModifier(c.dex))})</td>
      <td><strong>${c.con !== null ? c.con : '—'}</strong> (${formatMod(getModifier(c.con))})</td>
      <td><strong style="color: var(--gold-light);">${extractTotalAC(c)}</strong> <span style="font-size: 0.75rem; color: var(--text-dim);">(+${c.natural_armor || 0})</span></td>
      <td style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.speed}</td>
      <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${c.attack || c.full_attack || '—'}</td>
      <td><span class="badge-level">Nível ${c.momf_min_level}</span></td>
      <td>
        <button class="btn-sm btn-primary transform-btn" data-id="${c.id}">🐺</button>
      </td>
    </tr>
  `;
}

function attachCardEvents(parent) {
  parent.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      toggleFavorite(id);
    });
  });

  parent.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openCreatureModal(id);
    });
  });

  parent.querySelectorAll('.transform-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      assumeForm(id);
    });
  });
}

function toggleFavorite(id) {
  if (State.favorites.has(id)) {
    State.favorites.delete(id);
    showToast('Removido dos favoritos', '☆');
  } else {
    State.favorites.add(id);
    showToast('Adicionado aos favoritos!', '⭐');
  }
  saveState();
  renderAll();
}

// ==========================================================================
// ABA: BÍBLIA DO MESTRE DAS MUITAS FORMAS (MoMF Progression)
// ==========================================================================
function initProgressionView() {
  const levelBtnsContainer = document.getElementById('momfProgressionLevelBtns');
  if (!levelBtnsContainer) return;

  const levels = window.MOMF_LEVELS_INFO || [];
  levelBtnsContainer.innerHTML = levels.map(l => `
    <button class="level-pill-btn ${l.level === State.bibleSelectedLevel ? 'active' : ''}" data-level="${l.level}">
      Nível ${l.level}
      <span>${l.unlockedTypes.slice(-1)[0]}</span>
    </button>
  `).join('');

  levelBtnsContainer.querySelectorAll('.level-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      State.bibleSelectedLevel = parseInt(btn.getAttribute('data-level'), 10);
      levelBtnsContainer.querySelectorAll('.level-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProgression();
    });
  });
}

function renderProgression() {
  const lvlInfo = (window.MOMF_LEVELS_INFO || []).find(l => l.level === State.bibleSelectedLevel);
  if (!lvlInfo) return;

  // Hero Banner
  const heroContainer = document.getElementById('momfLevelHero');
  if (heroContainer) {
    heroContainer.innerHTML = `
      <h2 class="level-hero-title">📜 ${lvlInfo.name}</h2>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">
        <strong>Tipos Permitidos:</strong> ${lvlInfo.unlockedTypes.join(', ')} • 
        <strong>Tamanhos Permitidos:</strong> ${lvlInfo.unlockedSizes.join(', ')}
      </div>
      <ul class="level-features-list">
        ${lvlInfo.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <div class="level-tactics-banner">
        <strong>💡 Guia Tático da Bíblia:</strong> ${lvlInfo.tacticsTip}
      </div>
    `;
  }

  // Filtrar criaturas recomendadas para este nível
  const allCreatures = window.MOMF_CREATURES || [];
  const levelForms = allCreatures.filter(c => c.momf_recommended && c.momf_min_level === State.bibleSelectedLevel);

  const combatForms = levelForms.filter(c => c.momf_category && c.momf_category.includes('Combate'));
  const exploreForms = levelForms.filter(c => c.momf_category && c.momf_category.includes('Exploração'));
  const specialForms = levelForms.filter(c => c.momf_category && c.momf_category.includes('Especial'));

  const combatContainer = document.getElementById('bibleCombatForms');
  const exploreContainer = document.getElementById('bibleExploreForms');
  const specialContainer = document.getElementById('bibleSpecialForms');

  if (combatContainer) {
    combatContainer.innerHTML = combatForms.length > 0 ? 
      combatForms.map(c => renderBibleCard(c)).join('') : 
      '<p style="color: var(--text-dim); font-size: 0.82rem;">Nenhuma forma específica de combate destacada neste nível.</p>';
    attachCardEvents(combatContainer);
  }

  if (exploreContainer) {
    exploreContainer.innerHTML = exploreForms.length > 0 ? 
      exploreForms.map(c => renderBibleCard(c)).join('') : 
      '<p style="color: var(--text-dim); font-size: 0.82rem;">Nenhuma forma específica de exploração destacada neste nível.</p>';
    attachCardEvents(exploreContainer);
  }

  if (specialContainer) {
    specialContainer.innerHTML = specialForms.length > 0 ? 
      specialForms.map(c => renderBibleCard(c)).join('') : 
      '<p style="color: var(--text-dim); font-size: 0.82rem;">Nenhuma forma utilitária destacada neste nível.</p>';
    attachCardEvents(specialContainer);
  }
}

function renderBibleCard(c) {
  const isFav = State.favorites.has(c.id);
  return `
    <div class="creature-card recommended" data-id="${c.id}" style="margin-bottom: 12px;">
      <div class="card-header">
        <div class="creature-name-group">
          <h4 class="creature-name" style="font-size: 1.02rem;">${c.name}</h4>
          <div class="creature-sub">${getTypeIcon(c.type)} ${c.type} • ${c.size} • ${c.hd_val} HD</div>
        </div>
        <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${c.id}">
          ${isFav ? '★' : '☆'}
        </button>
      </div>

      <div class="stat-pill-row">
        <div class="stat-pill">
          <div class="stat-pill-label">For</div>
          <div class="stat-pill-val">${c.str || '—'}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill-label">Des</div>
          <div class="stat-pill-val">${c.dex || '—'}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill-label">Con</div>
          <div class="stat-pill-val">${c.con || '—'}</div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 6px;">
        <div style="flex: 1; font-size: 0.78rem; color: #ffffff; background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-family: var(--font-mono);" title="${c.ac || ''}">
          <span style="color: var(--gold-light); font-weight: 700;">🛡️</span> ${formatCardAC(c)}
        </div>
        <div style="flex: 2; font-size: 0.78rem; color: #ffffff; background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.attack || c.full_attack || ''}">
          <span style="color: var(--emerald-light); font-weight: 700;">⚔️</span> ${c.attack || c.full_attack || 'Ataques naturais'}
        </div>
      </div>

      <div class="bible-highlight-box" style="margin-top: 6px;">
        ${c.momf_comments || c.special_attacks || 'Excelente forma tática.'}
      </div>

      <div class="card-footer" style="margin-top: 8px;">
        <span class="card-source">${c.source}</span>
        <div class="card-actions">
          <button class="btn-sm btn-secondary view-details-btn" data-id="${c.id}">Ficha</button>
          <button class="btn-sm btn-primary transform-btn" data-id="${c.id}">🐺 Assumir</button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// ABA: METAMORFOSE ATIVA (Calculadora de Transformação)
// ==========================================================================
function initActiveShapeCalculator() {
  const inputs = [
    'charBaseStr', 'charBaseDex', 'charBaseCon', 'charBaseInt', 'charBaseWis', 'charBaseCha',
    'charBaseBAB', 'charBaseHP', 'charWildArmor'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      saveCharSheetFromInputs();
      renderActiveShape();
    });
  });
}

function saveCharSheetFromInputs() {
  const getVal = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? (parseInt(el.value, 10) || fallback) : fallback;
  };

  State.charSheet.baseStr = getVal('charBaseStr', 10);
  State.charSheet.baseDex = getVal('charBaseDex', 14);
  State.charSheet.baseCon = getVal('charBaseCon', 14);
  State.charSheet.baseInt = getVal('charBaseInt', 12);
  State.charSheet.baseWis = getVal('charBaseWis', 16);
  State.charSheet.baseCha = getVal('charBaseCha', 8);
  State.charSheet.bab = getVal('charBaseBAB', 4);
  State.charSheet.baseHp = getVal('charBaseHP', 38);
  State.charSheet.wildArmorBonus = getVal('charWildArmor', 4);

  saveState();
}

function assumeForm(creatureId) {
  const creature = (window.MOMF_CREATURES || []).find(c => c.id === creatureId);
  if (!creature) return;

  State.transformedCreature = creature;
  const maxUses = calculateMaxWildShapeUses();

  if (State.wildShapeUsesLeft > 0) {
    State.wildShapeUsesLeft--;
    saveState();
    updateWildShapeTrackerUI();
    showToast(`Metamorfose assumida: ${creature.name}! Restam ${State.wildShapeUsesLeft}/${maxUses} usos diários.`, '🐺');
  } else {
    showToast(`Forma selecionada: ${creature.name}! (Atenção: seus usos diários de Forma Selvagem estão esgotados!)`, '⚠️');
  }

  switchTab('active-shape');
}

function renderActiveShape() {
  // Preencher inputs da ficha base com valores atuais
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('charBaseStr', State.charSheet.baseStr);
  setVal('charBaseDex', State.charSheet.baseDex);
  setVal('charBaseCon', State.charSheet.baseCon);
  setVal('charBaseInt', State.charSheet.baseInt);
  setVal('charBaseWis', State.charSheet.baseWis);
  setVal('charBaseCha', State.charSheet.baseCha);
  setVal('charBaseBAB', State.charSheet.bab);
  setVal('charBaseHP', State.charSheet.baseHp);
  setVal('charWildArmor', State.charSheet.wildArmorBonus);

  const resultContainer = document.getElementById('activeTransformedResult');
  if (!resultContainer) return;

  const c = State.transformedCreature;
  if (!c) {
    resultContainer.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-dim);">
        <p style="font-size: 3.5rem; margin-bottom: 14px;">🐺</p>
        <h3 style="font-family: var(--font-title); color: var(--gold-light); margin-bottom: 8px;">Nenhuma Forma Assumida no Momento</h3>
        <p style="font-size: 0.9rem; max-width: 480px; margin: 0 auto 18px;">
          Navegue pelo compêndio ou pela Bíblia MoMF e clique no botão <strong>"🐺 Assumir"</strong> para calcular instantaneamente seus novos atributos, CA, bônus de ataque e ataques especiais!
        </p>
        <button class="btn-sm btn-primary" onclick="switchTab('compendium')" style="padding: 10px 20px; font-size: 0.9rem;">
          Explorar Compêndio
        </button>
      </div>
    `;
    return;
  }

  // Cálculos D&D 3.5 para Forma Selvagem
  const finalStr = c.str !== null ? c.str : State.charSheet.baseStr;
  const finalDex = c.dex !== null ? c.dex : State.charSheet.baseDex;
  const finalCon = c.con !== null ? c.con : State.charSheet.baseCon;
  const finalInt = State.charSheet.baseInt; // Mantém atributos mentais
  const finalWis = State.charSheet.baseWis;
  const finalCha = State.charSheet.baseCha;

  const strMod = getModifier(finalStr);
  const dexMod = getModifier(finalDex);
  const conMod = getModifier(finalCon);
  const sizeMod = getSizeModifier(c.size);

  // Ajuste de PV por Constituição (Diferença de mod Con x Dados de Vida totais do PJ)
  const totalCharHD = calculateMaxHD();
  const conDiff = conMod - getModifier(State.charSheet.baseCon);
  const adjustedHp = Math.max(1, State.charSheet.baseHp + (conDiff * totalCharHD));

  // CA Total = 10 + Des Mod + Armadura Natural + Mod Tamanho + Bônus Armadura Selvagem
  const natArmor = c.natural_armor || 0;
  const wildArmor = State.charSheet.wildArmorBonus || 0;
  const totalAC = 10 + dexMod + natArmor + sizeMod + wildArmor;
  const touchAC = 10 + dexMod + sizeMod;
  const flatFootedAC = 10 + natArmor + sizeMod + wildArmor;

  // Bônus de Ataque
  const meleeAttackBonus = State.charSheet.bab + strMod + sizeMod;
  const rangedAttackBonus = State.charSheet.bab + dexMod + sizeMod;
  const grappleBonus = State.charSheet.bab + strMod + (sizeMod === 0 ? 0 : (sizeMod < 0 ? Math.abs(sizeMod) * 4 : -sizeMod * 4));

  resultContainer.innerHTML = `
    <div class="transformed-header">
      <div>
        <span class="badge-level" style="margin-bottom: 4px; display: inline-block;">Metamorfose Ativa</span>
        <h2 class="transformed-title">${c.name}</h2>
        <div style="font-size: 0.84rem; color: var(--text-muted);">
          ${getTypeIcon(c.type)} ${c.type} • Tamanho: ${c.size} (${formatMod(sizeMod)} CA/Ataque) • ${c.hd}
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn-sm btn-secondary view-details-btn" data-id="${c.id}">Ficha Completa</button>
        <button class="btn-sm btn-secondary" onclick="State.transformedCreature=null; renderActiveShape(); showToast('Forma revertida.');">Reverter</button>
      </div>
    </div>

    <!-- Estatísticas de Combate Calculadas -->
    <div class="transformed-stats-grid">
      <div class="stat-box-big">
        <div class="stat-box-label">Classe de Armadura</div>
        <div class="stat-box-val gold">${totalAC}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">Toque: ${touchAC} • Surpresa: ${flatFootedAC}</div>
      </div>
      <div class="stat-box-big">
        <div class="stat-box-label">Pontos de Vida (PV)</div>
        <div class="stat-box-val emerald">${adjustedHp}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">${conDiff >= 0 ? `+${conDiff * totalCharHD}` : `${conDiff * totalCharHD}`} por Con</div>
      </div>
      <div class="stat-box-big">
        <div class="stat-box-label">Ataque Corpo a Corpo</div>
        <div class="stat-box-val cyan">${formatMod(meleeAttackBonus)}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">BBA ${State.charSheet.bab} + For ${formatMod(strMod)}</div>
      </div>
      <div class="stat-box-big">
        <div class="stat-box-label">Ataque à Distância</div>
        <div class="stat-box-val">${formatMod(rangedAttackBonus)}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">BBA ${State.charSheet.bab} + Des ${formatMod(dexMod)}</div>
      </div>
      <div class="stat-box-big">
        <div class="stat-box-label">Manobra Agarrar</div>
        <div class="stat-box-val gold">${formatMod(grappleBonus)}</div>
        <div style="font-size: 0.72rem; color: var(--text-dim);">Com modificador de tamanho</div>
      </div>
    </div>

    <!-- Tabela de Atributos Final -->
    <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
      <h4 style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; font-weight: 700;">
        Atributos do Personagem na Forma (Físicos da Criatura / Mentais do Jogador)
      </h4>
      <table class="sheet-attribute-table">
        <thead>
          <tr>
            <th>FOR</th>
            <th>DES</th>
            <th>CON</th>
            <th>INT</th>
            <th>SAB</th>
            <th>CAR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${finalStr} (${formatMod(strMod)})</td>
            <td>${finalDex} (${formatMod(dexMod)})</td>
            <td>${finalCon} (${formatMod(conMod)})</td>
            <td style="color: var(--text-dim);">${finalInt} (${formatMod(getModifier(finalInt))})</td>
            <td style="color: var(--text-dim);">${finalWis} (${formatMod(getModifier(finalWis))})</td>
            <td style="color: var(--text-dim);">${finalCha} (${formatMod(getModifier(finalCha))})</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Rotina de Ataque Calculada do Jogador -->
    <div class="statblock-section player-attack-routine-box" style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.35); padding: 14px; border-radius: var(--radius-md);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <h4 style="color: var(--emerald-light); font-size: 0.98rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
          <span>⚔️</span> Rotina de Ataque Calculada do Jogador
        </h4>
        <span class="badge-level" style="font-size: 0.74rem; border-color: var(--border-gold); color: var(--gold-light);">
          BBA (${State.charSheet.bab}) + For (${formatMod(strMod)}) + Tam (${formatMod(sizeMod)}) = <strong>${formatMod(meleeAttackBonus)}</strong>
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-bottom: 10px;">
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); padding: 10px; border-radius: var(--radius-sm);">
          <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--gold-light); font-weight: 700;">Ataque Primário (Ação Padrão)</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: #ffffff; font-family: var(--font-mono); margin: 3px 0;">
            ${formatMod(meleeAttackBonus)} corpo a corpo
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim);">
            ${c.attack || 'Ataque natural primário'}
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); padding: 10px; border-radius: var(--radius-sm);">
          <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--emerald-light); font-weight: 700;">Ataque Total (Rodada Completa)</div>
          <div style="font-size: 0.95rem; font-weight: 700; color: #ffffff; font-family: var(--font-mono); margin: 3px 0;">
            ${c.full_attack || c.attack || 'Ataques da criatura'}
          </div>
          <div style="font-size: 0.74rem; color: var(--text-dim);">
            Ataques secundários sofrem penalidade padrão de -5 (${formatMod(meleeAttackBonus - 5)})
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); padding: 10px; border-radius: var(--radius-sm);">
          <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--gold-light); font-weight: 700;">Manobra Agarrar (Grapple)</div>
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--gold-light); font-family: var(--font-mono); margin: 3px 0;">
            ${formatMod(grappleBonus)}
          </div>
          <div style="font-size: 0.74rem; color: var(--text-dim);">
            BBA + Mod Força + Mod Tamanho D&D 3.5
          </div>
        </div>
      </div>

      ${c.special_attacks && c.special_attacks !== '—' ? `
        <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--accent-gold); padding: 8px 12px; border-radius: 4px; font-size: 0.84rem;">
          <strong style="color: var(--gold-light);">⚡ Táticas & Manobras em Combate:</strong> ${c.special_attacks}
        </div>
      ` : ''}
    </div>

    <!-- Modos de Deslocamento & Ataques Originais -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <div class="statblock-section">
        <h4 style="color: var(--gold-light); font-size: 0.88rem; margin-bottom: 6px;">💨 Deslocamento Ativo</h4>
        <p style="font-size: 0.85rem; color: var(--text-main); font-family: var(--font-mono);">${c.speed}</p>
        <div style="margin-top: 6px; display: flex; gap: 4px;">
          ${c.movement_modes.map(m => `<span class="tactical-tag">${m}</span>`).join('')}
        </div>
      </div>
      <div class="statblock-section">
        <h4 style="color: var(--gold-light); font-size: 0.88rem; margin-bottom: 6px;">⚔️ Ataques Oficiais da Forma</h4>
        <p style="font-size: 0.82rem; color: var(--text-main); font-family: var(--font-mono);">${c.attack || c.full_attack || 'Ataques naturais da criatura.'}</p>
        <p style="font-size: 0.78rem; color: var(--text-dim); margin-top: 4px; font-family: var(--font-mono);">Ataque Total: ${c.full_attack || '—'}</p>
      </div>
    </div>

    <!-- Habilidades Extraordinárias Ativas -->
    <div class="statblock-section">
      <h4 style="color: var(--emerald-light); font-size: 0.92rem; margin-bottom: 6px;">⚡ Ataques Especiais Extraordinários (Ex) Ganhos</h4>
      <p style="font-size: 0.85rem; color: var(--text-main); line-height: 1.5;">${c.special_attacks || 'Nenhum ataque especial adicional.'}</p>
    </div>

    <div class="statblock-section">
      <h4 style="color: var(--emerald-light); font-size: 0.92rem; margin-bottom: 6px;">
        🛡️ Qualidades Especiais (Ex) 
        ${State.momfLevel >= 7 ? '<span class="badge-level" style="font-size: 0.7rem;">ATIVAS (MoMF 7+)</span>' : '<span style="color: var(--accent-rose); font-size: 0.72rem;">(Desbloqueadas apenas no 7º Nível de MoMF!)</span>'}
      </h4>
      <p style="font-size: 0.85rem; color: ${State.momfLevel >= 7 ? 'var(--text-main)' : 'var(--text-dim)'}; line-height: 1.5;">
        ${c.special_qualities || 'Nenhuma qualidade especial extraordinária.'}
      </p>
    </div>
  `;

  attachCardEvents(resultContainer);
}

// ==========================================================================
// ABA: FORMAS RÁPIDAS / FAVORITOS
// ==========================================================================
function initFavoritesView() {
  // Configurações da aba de favoritos
}

function renderFavorites() {
  const container = document.getElementById('favoritesContainer');
  const countBadge = document.getElementById('favTabBadge');
  if (countBadge) countBadge.textContent = State.favorites.size;
  if (!container) return;

  const allCreatures = window.MOMF_CREATURES || [];
  const favCreatures = allCreatures.filter(c => State.favorites.has(c.id));

  if (favCreatures.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-dim);">
        <p style="font-size: 3rem; margin-bottom: 12px;">⭐</p>
        <h3 style="font-family: var(--font-title); color: var(--text-muted); margin-bottom: 8px;">Nenhuma Forma Favoritada</h3>
        <p style="font-size: 0.9rem; max-width: 460px; margin: 0 auto 16px;">
          Clique na estrela (☆) nos cards do compêndio para salvar suas transformações favoritas e ter acesso rápido durante a sessão de RPG!
        </p>
        <button class="btn-sm btn-primary" onclick="switchTab('compendium')" style="padding: 10px 18px;">
          Adicionar Favoritos
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="creatures-grid">
      ${favCreatures.map(c => {
        const note = State.favoriteNotes[c.id] || '';
        return `
          <div class="creature-card recommended" data-id="${c.id}">
            <div>
              <div class="card-header">
                <div class="creature-name-group">
                  <h3 class="creature-name">${c.name}</h3>
                  <div class="creature-sub">${getTypeIcon(c.type)} ${c.type} • ${c.size} • ${c.hd_val} HD</div>
                </div>
                <button class="fav-btn active" data-id="${c.id}" title="Remover dos Favoritos">★</button>
              </div>

              <div class="stat-pill-row">
                <div class="stat-pill">
                  <div class="stat-pill-label">For</div>
                  <div class="stat-pill-val">${c.str || '—'}</div>
                </div>
                <div class="stat-pill">
                  <div class="stat-pill-label">Des</div>
                  <div class="stat-pill-val">${c.dex || '—'}</div>
                </div>
                <div class="stat-pill">
                  <div class="stat-pill-label">Con</div>
                  <div class="stat-pill-val">${c.con || '—'}</div>
                </div>
              </div>

              <div style="font-size: 0.78rem; color: var(--text-muted); margin: 6px 0;">
                <strong>Ataque:</strong> ${c.attack || c.full_attack || '—'}<br>
                <strong>Desloc.:</strong> ${c.speed}
              </div>

              <!-- Campo de Nota Tática Pessoal -->
              <div style="margin-top: 10px;">
                <label style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Nota da Sessão:</label>
                <input type="text" class="fav-note-input" data-id="${c.id}" value="${note}" placeholder="Ex: Minha forma para combate aéreo..." 
                  style="width: 100%; background: var(--bg-input); border: 1px solid var(--border-subtle); color: var(--text-main); font-size: 0.78rem; padding: 5px 8px; border-radius: var(--radius-sm); margin-top: 3px;" />
              </div>
            </div>

            <div class="card-footer" style="margin-top: 12px;">
              <span class="card-source">${c.source}</span>
              <div class="card-actions">
                <button class="btn-sm btn-secondary view-details-btn" data-id="${c.id}">Ficha</button>
                <button class="btn-sm btn-primary transform-btn" data-id="${c.id}">🐺 Assumir</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  attachCardEvents(container);

  // Eventos de Notas
  container.querySelectorAll('.fav-note-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = input.getAttribute('data-id');
      State.favoriteNotes[id] = e.target.value.trim();
      saveState();
      showToast('Nota salva!', '📝');
    });
  });
}

// ==========================================================================
// ABA: REGRAS E FONTES
// ==========================================================================
function initRulesView() {
  const container = document.getElementById('rulesContainer');
  if (!container) return;

  const rules = window.MOMF_RULES || { topics: [] };

  const booksList = [
    { name: 'Livro do Jogador 3.5 (Player\'s Handbook)', type: 'Básico', desc: 'Regras base de Forma Selvagem para Druidas e conjuração.' },
    { name: 'Livro Completo do Aventureiro (Complete Adventurer)', type: 'Classe de Prestígio', desc: 'Classe de prestígio Mestre das Muitas Formas (Master of Many Forms, pág. 47).' },
    { name: 'Livro dos Monstros 3.5 (Monster Manual I)', type: 'Criaturas', desc: 'Criaturas básicas de D&D 3.5 com estatísticas e combates completos.' },
    { name: 'Monster Manual II, III, IV', type: 'Criaturas', desc: 'Formas icônicas como Rasga-carne (MM3), Troll de Guerra (MM3), Desmodu (MM2).' },
    { name: 'Sandstorm (Areias Escaldantes)', type: 'Ambiente', desc: 'Formas desérticas: Abutres atrozes, Crucian, Protocerátops, Asherati.' },
    { name: 'Frostburn (Terras Geladas)', type: 'Ambiente', desc: 'Formas árticas, Gigantes do gelo e adaptações ao frio extremo.' },
    { name: 'Stormwrack (Mares Selvagens)', type: 'Ambiente', desc: 'Formas aquáticas: Aventi, Barracudas atrozes, Caranguejos e Tubarões.' },
    { name: 'Fiend Folio', type: 'Criaturas', desc: 'Rastreador das Sombras (Dark Stalker), Rukanyr, Slasrath, Bocarra de Ferro.' },
    { name: 'Races of the Wild / Races of Faerun / Races of Stone', type: 'Raças', desc: 'Falcão Atroz, Aarakocra e criaturas regionais.' },
    { name: 'Miniatures Handbook / Serpent Kingdoms', type: 'Suplementos', desc: 'Dinossauros das cavernas, Tren, Severm.' },
    { name: 'Dragon Magazine', type: 'Periódico Oficial', desc: 'Cavalo-marinho gigante e arquétipos raros.' }
  ];

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 24px; max-width: 1000px; margin: 0 auto;">
      <!-- Banner de Resumo de Regras -->
      <div class="level-info-hero">
        <h2 class="level-hero-title">📜 ${rules.title}</h2>
        <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6; margin-top: 6px;">
          ${rules.summary}
        </p>
      </div>

      <!-- Tópicos de Regras -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 16px;">
        ${rules.topics.map(t => `
          <div class="statblock-section">
            <h3 style="font-family: var(--font-title); font-size: 1.05rem; color: var(--gold-light); margin-bottom: 8px;">
              ⚡ ${t.title}
            </h3>
            <p style="font-size: 0.88rem; color: var(--text-main); line-height: 1.6;">
              ${t.text}
            </p>
          </div>
        `).join('')}
      </div>

      <!-- Biblioteca de Fontes -->
      <div class="statblock-section" style="margin-top: 10px;">
        <h3 style="font-family: var(--font-title); font-size: 1.15rem; color: var(--emerald-light); margin-bottom: 12px;">
          📚 Livros e Fontes Catalogadas no Compêndio
        </h3>
        <p style="font-size: 0.86rem; color: var(--text-muted); margin-bottom: 16px;">
          Todas as fontes abaixo foram integradas ao compêndio. Os PDFs originais estão organizados na sua pasta <code>sources/</code>:
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
          ${booksList.map(b => `
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: var(--radius-sm);">
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.86rem;">${b.name}</div>
              <div style="font-size: 0.72rem; color: var(--emerald-light); text-transform: uppercase; margin: 2px 0;">${b.type}</div>
              <div style="font-size: 0.78rem; color: var(--text-dim);">${b.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// MODAL DE DETALHES DA CRIATURA (Ficha Oficial Completa)
// ==========================================================================
function initModal() {
  const modalOverlay = document.getElementById('creatureModal');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (closeBtn && modalOverlay) {
    closeBtn.addEventListener('click', () => {
      modalOverlay.classList.remove('open');
    });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('open');
      }
    });
  }

  // Tecla Escape fecha modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('open')) {
      modalOverlay.classList.remove('open');
    }
  });
}

function openCreatureModal(creatureId) {
  const c = (window.MOMF_CREATURES || []).find(item => item.id === creatureId);
  if (!c) return;

  const modalOverlay = document.getElementById('creatureModal');
  const modalBody = document.getElementById('modalCreatureBody');
  const modalTitle = document.getElementById('modalCreatureTitle');
  const modalActions = document.getElementById('modalCreatureActions');

  if (modalTitle) {
    modalTitle.innerHTML = `
      <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
        <span style="font-family: var(--font-title); font-size: 1.35rem; color: #ffffff;">${c.name}</span>
        ${c.name_en ? `<span style="font-size: 0.85rem; color: var(--text-dim); font-style: italic;">(${c.name_en})</span>` : ''}
      </div>
      <div style="font-size: 0.8rem; color: var(--emerald-light); margin-top: 3px;">
        ${getTypeIcon(c.type)} ${c.subtypes || `${c.type} (${c.size})`} • ${c.hd}
      </div>
    `;
  }

  if (modalBody) {
    const strMod = getModifier(c.str);
    const dexMod = getModifier(c.dex);
    const conMod = getModifier(c.con);
    const intMod = getModifier(c.int);
    const wisMod = getModifier(c.wis);
    const chaMod = getModifier(c.cha);

    modalBody.innerHTML = `
      <!-- Tabela de Habilidades / Atributos -->
      <table class="sheet-attribute-table">
        <thead>
          <tr>
            <th>FOR</th>
            <th>DES</th>
            <th>CON</th>
            <th>INT</th>
            <th>SAB</th>
            <th>CAR</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${c.str !== null ? c.str : '—'} <span style="font-size: 0.75rem; color: var(--text-muted);">${c.str !== null ? `(${formatMod(strMod)})` : ''}</span></td>
            <td>${c.dex !== null ? c.dex : '—'} <span style="font-size: 0.75rem; color: var(--text-muted);">${c.dex !== null ? `(${formatMod(dexMod)})` : ''}</span></td>
            <td>${c.con !== null ? c.con : '—'} <span style="font-size: 0.75rem; color: var(--text-muted);">${c.con !== null ? `(${formatMod(conMod)})` : ''}</span></td>
            <td>${c.int !== null ? c.int : '—'} <span style="font-size: 0.75rem; color: var(--text-muted);">${c.int !== null ? `(${formatMod(intMod)})` : ''}</span></td>
            <td>${c.wis !== null ? c.wis : '—'} <span style="font-size: 0.75rem; color: var(--text-muted);">${c.wis !== null ? `(${formatMod(wisMod)})` : ''}</span></td>
            <td>${c.cha !== null ? c.cha : '—'} <span style="font-size: 0.75rem; color: var(--text-muted);">${c.cha !== null ? `(${formatMod(chaMod)})` : ''}</span></td>
          </tr>
        </tbody>
      </table>

      <!-- Estatísticas Oficiais do Bloco D&D 3.5 -->
      <div class="statblock-section">
        <div class="statblock-grid">
          <div class="statblock-row">
            <span class="statblock-label">Dados de Vida:</span>
            <span class="statblock-val">${c.hd}</span>
          </div>
          <div class="statblock-row">
            <span class="statblock-label">Iniciativa:</span>
            <span class="statblock-val">${c.initiative}</span>
          </div>
          <div class="statblock-row">
            <span class="statblock-label">Deslocamento:</span>
            <span class="statblock-val">${c.speed}</span>
          </div>
          <div class="statblock-row">
            <span class="statblock-label">Classe de Armadura:</span>
            <span class="statblock-val">${c.ac}</span>
          </div>
          <div class="statblock-row">
            <span class="statblock-label">Ataque Base/Agarrar:</span>
            <span class="statblock-val">${c.base_attack_grapple || '—'}</span>
          </div>
          <div class="statblock-row">
            <span class="statblock-label">Espaço/Alcance:</span>
            <span class="statblock-val">${c.space_reach || '1,5 m / 1,5 m'}</span>
          </div>
          <div class="statblock-row highlight-modal-attack" style="grid-column: 1/-1; background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--accent-gold); padding: 8px 12px; border-radius: var(--radius-sm);">
            <div style="font-weight: 700; color: var(--gold-light); font-size: 0.82rem; margin-bottom: 2px;">⚔️ Ataque Padrão:</div>
            <div style="color: #ffffff; font-size: 0.95rem; font-family: var(--font-mono); font-weight: 700;">${c.attack || '—'}</div>
          </div>
          <div class="statblock-row highlight-modal-attack" style="grid-column: 1/-1; background: rgba(16, 185, 129, 0.08); border-left: 3px solid var(--accent-emerald); padding: 8px 12px; border-radius: var(--radius-sm);">
            <div style="font-weight: 700; color: var(--emerald-light); font-size: 0.82rem; margin-bottom: 2px;">⚔️ Ataque Total (Rodada Completa):</div>
            <div style="color: #ffffff; font-size: 0.95rem; font-family: var(--font-mono); font-weight: 700;">${c.full_attack || c.attack || '—'}</div>
          </div>
          <div class="statblock-row" style="grid-column: 1/-1;">
            <span class="statblock-label">Resistências:</span>
            <span class="statblock-val">${c.saves || '—'}</span>
          </div>
          ${c.skills ? `
            <div class="statblock-row" style="grid-column: 1/-1;">
              <span class="statblock-label">Perícias:</span>
              <span class="statblock-val">${c.skills}</span>
            </div>
          ` : ''}
          ${c.feats ? `
            <div class="statblock-row" style="grid-column: 1/-1;">
              <span class="statblock-label">Talentos:</span>
              <span class="statblock-val">${c.feats}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Destaque MoMF se aplicável -->
      ${c.momf_recommended ? `
        <div class="level-tactics-banner">
          <strong style="color: var(--gold-light);">⭐ Avaliação da Bíblia do Mestre das Muitas Formas (Nível ${c.momf_min_level}):</strong><br>
          ${c.momf_comments || 'Forma essencial recomendada para metamorfos.'}
        </div>
      ` : ''}

      <!-- Ataques e Qualidades Especiais -->
      ${c.special_attacks && c.special_attacks !== '—' ? `
        <div class="sheet-text-block" style="border-left: 3px solid var(--accent-gold); background: rgba(245, 158, 11, 0.05); padding: 12px 14px; border-radius: var(--radius-sm); margin-top: 10px;">
          <h4 style="color: var(--gold-light); font-size: 0.95rem; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span>⚡</span> Ataques Especiais Extraordinários (Ex / Sob / SM)
          </h4>
          <p style="font-size: 0.9rem; line-height: 1.6; color: var(--text-main); font-weight: 500;">${c.special_attacks}</p>
        </div>
      ` : ''}

      ${c.special_qualities && c.special_qualities !== '—' ? `
        <div class="sheet-text-block">
          <h4>🛡️ Qualidades Especiais</h4>
          <p>${c.special_qualities}</p>
        </div>
      ` : ''}

      <!-- Descrição & Lore -->
      ${c.description ? `
        <div class="sheet-text-block">
          <h4>📖 Descrição</h4>
          <p>${c.description}</p>
        </div>
      ` : ''}

      <!-- Notas de Combate -->
      ${c.combat_notes ? `
        <div class="sheet-text-block">
          <h4>⚔️ Táticas de Combate</h4>
          <p>${c.combat_notes}</p>
        </div>
      ` : ''}

      <div style="font-size: 0.76rem; color: var(--text-dim); text-align: right; margin-top: 10px;">
        Fonte Oficial: <strong>${c.source}</strong>
      </div>
    `;
  }

  if (modalActions) {
    const isFav = State.favorites.has(c.id);
    modalActions.innerHTML = `
      <button class="btn-sm btn-secondary" onclick="toggleFavorite('${c.id}'); openCreatureModal('${c.id}');">
        ${isFav ? '★ Remover dos Favoritos' : '☆ Favoritar'}
      </button>
      <button class="btn-sm btn-primary" onclick="assumeForm('${c.id}'); document.getElementById('creatureModal').classList.remove('open');">
        🐺 Assumir Esta Forma
      </button>
    `;
  }

  modalOverlay.classList.add('open');
}
