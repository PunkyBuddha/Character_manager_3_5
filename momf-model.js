/**
 * MOMF-MODEL.JS
 * Lógica de Regras Oficiais do Mestre das Muitas Formas (D&D 3.5)
 * Livro Completo do Aventureiro (Complete Adventurer), Livro do Jogador & Bíblia de Formas MoMF
 */

import { MOMF_CREATURES, MOMF_PROGRESSION, MOMF_RULES } from './data/creatures_data.js';

// Mapeamento oficial de tipos desbloqueados por nível de MoMF
export const MOMF_TYPES_BY_LEVEL = {
  0: ['Animal'], // Druida base
  1: ['Animal', 'Humanóide'],
  2: ['Animal', 'Humanóide', 'Gigante'],
  3: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso'],
  4: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada'],
  5: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta'],
  6: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta', 'Gosma'],
  7: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta', 'Gosma', 'Aberração'],
  8: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta', 'Gosma', 'Aberração', 'Dragão'],
  9: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta', 'Gosma', 'Aberração', 'Dragão'],
  10: ['Animal', 'Humanóide', 'Gigante', 'Humanóide Monstruoso', 'Fada', 'Planta', 'Gosma', 'Aberração', 'Dragão', 'Elemental']
};

// Mapeamento oficial de tamanhos desbloqueados por nível de MoMF
export const MOMF_SIZES_BY_LEVEL = {
  0: ['Pequeno', 'Médio'], // Druida 5º nível
  1: ['Pequeno', 'Médio'],
  2: ['Pequeno', 'Médio', 'Grande'],
  3: ['Diminuto', 'Pequeno', 'Médio', 'Grande'],
  4: ['Diminuto', 'Pequeno', 'Médio', 'Grande', 'Enorme'],
  5: ['Diminuto', 'Pequeno', 'Médio', 'Grande', 'Enorme'],
  6: ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme'],
  7: ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme'],
  8: ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso'],
  9: ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso'],
  10: ['Diminuto', 'Miúdo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso', 'Colossal']
};

/**
 * Analisa as classes e níveis do personagem para extrair os limites de MoMF
 */
export function getMoMFCharacterStats(c) {
  let druidLevel = 0;
  let momfLevel = 0;
  let totalLevel = 0;

  for (const cl of (c.classes || [])) {
    const lvl = Number(cl.level) || 0;
    totalLevel += lvl;
    const name = (cl.name || '').trim().toLowerCase();
    if (name.includes('druid')) {
      druidLevel += lvl;
    }
    if (name.includes('mestre') || name.includes('momf') || name.includes('muitas')) {
      momfLevel += lvl;
    }
  }

  // Se o usuário não tiver selecionado Druida/MoMF explicitamente mas estiver na classe
  if (momfLevel === 0 && druidLevel === 0 && totalLevel > 0) {
    // Estimativa padrão conveniente se for ficha mista
    druidLevel = Math.min(5, totalLevel);
    momfLevel = Math.max(0, totalLevel - druidLevel);
  }

  // Limite máximo de HD = Nível Total do Personagem (MoMF acumula com tudo)
  const maxHD = Math.max(1, totalLevel);

  // Nível efetivo para tabelas de MoMF (limitado a 10)
  const effectiveMoMF = Math.min(10, Math.max(0, momfLevel));

  const allowedTypes = new Set(MOMF_TYPES_BY_LEVEL[effectiveMoMF] || MOMF_TYPES_BY_LEVEL[0]);
  const allowedSizes = new Set(MOMF_SIZES_BY_LEVEL[effectiveMoMF] || MOMF_SIZES_BY_LEVEL[0]);

  // Usos diários de Forma Selvagem:
  // Druida 5 = 1, Druida 6 = 2, Druida 7 = 3, Druida 10 = 4, Druida 14 = 5, Druida 18 = 6
  let druidUses = 0;
  if (druidLevel >= 18) druidUses = 6;
  else if (druidLevel >= 14) druidUses = 5;
  else if (druidLevel >= 10) druidUses = 4;
  else if (druidLevel >= 7) druidUses = 3;
  else if (druidLevel >= 6) druidUses = 2;
  else if (druidLevel >= 5) druidUses = 1;

  // Cada nível de MoMF adiciona +1 uso diário
  const featBonus = c.wildShapeUses?.featExtra ? 2 : 0;
  const maxUses = Math.max(1, druidUses + momfLevel + featBonus);

  // Duração em horas por uso = Druida + MoMF
  const durationHours = Math.max(1, druidLevel + momfLevel);

  // Checagem se pode assumir uma criatura específica
  const canAssume = (cr) => {
    if (!cr) return false;
    const hd = Number(cr.hd_val) || 0;
    if (hd > maxHD) return false;
    if (!allowedTypes.has(cr.type)) return false;
    if (!allowedSizes.has(cr.size)) return false;
    return true;
  };

  return {
    druidLevel,
    momfLevel,
    totalLevel,
    maxHD,
    effectiveMoMF,
    allowedTypes,
    allowedSizes,
    maxUses,
    durationHours,
    canAssume,
    hasFastShape: momfLevel >= 9,
    hasExQualities: momfLevel >= 7
  };
}

/**
 * Aplica a metamorfose no personagem
 */
export function applyTransformation(c, creature, spendUse = true) {
  if (!creature) return;

  // Se solicitado gastar uso e houver usos
  if (spendUse && c.wildShapeUses) {
    if (c.wildShapeUses.used < c.wildShapeUses.max) {
      c.wildShapeUses.used++;
    }
  }

  // Salva estado da metamorfose ativa
  c.wildShape = {
    active: true,
    creatureId: creature.id,
    creatureName: creature.name,
    type: creature.type,
    size: creature.size,
    hd: creature.hd_val || 0,
    str: Number(creature.str) || 10,
    dex: Number(creature.dex) || 10,
    con: Number(creature.con) || 10,
    natural_armor: Number(creature.natural_armor) || 0,
    speed: creature.speed || '',
    movement_modes: creature.movement_modes || [],
    attacks: creature.full_attack || creature.attack || '',
    special_attacks: creature.special_attacks || '',
    special_qualities: creature.special_qualities || '',
    space_reach: creature.space_reach || '1,5 m / 1,5 m',
    source: creature.source || '',
    transformedAt: Date.now()
  };
}

/**
 * Reverte à forma original do personagem
 */
export function revertTransformation(c) {
  c.wildShape = { active: false };
}

/**
 * Adiciona ou remove forma dos favoritos
 */
export function toggleFavoriteShape(c, creatureId, note = '') {
  c.savedShapes = c.savedShapes || [];
  const index = c.savedShapes.findIndex(s => (typeof s === 'string' ? s === creatureId : s.id === creatureId));
  if (index >= 0) {
    c.savedShapes.splice(index, 1);
    return false; // removido
  } else {
    c.savedShapes.push({ id: creatureId, note: note || '', addedAt: Date.now() });
    return true; // adicionado
  }
}

export function isFavoriteShape(c, creatureId) {
  if (!c.savedShapes) return false;
  return c.savedShapes.some(s => (typeof s === 'string' ? s === creatureId : s.id === creatureId));
}

export { MOMF_CREATURES, MOMF_PROGRESSION, MOMF_RULES };
