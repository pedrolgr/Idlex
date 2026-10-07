// ---------------------------------------------------------------------------
// Idlex Web Client — Multi-Box Huntera
// ---------------------------------------------------------------------------

const state = {
  viewMode: 'grid', // 'grid' | 'tabs'
  activeTab: 1,
  slots: [null, null, null, null],
  catalogs: [null, null, null, null],
  selectedHunts: [null, null, null, null],
  selectedTiers: [0, 0, 0, 0],
  slotSubTabs: ['monsters', 'monsters', 'monsters', 'monsters'],
  citySubTabs: ['hunts', 'hunts', 'hunts', 'hunts'],
  selectedTrainingSkills: ['sword', 'sword', 'sword', 'sword'],
};

const HUNTERA_TRAINING_SKILLS = [
  {
    id: "sword",
    name: "Sword Fighting",
    icon: "🗡️",
    itemId: 35285,
    equipmentName: "Lasting Exercise Sword",
    desc: "Treino de combate com espadas.",
  },
  {
    id: "axe",
    name: "Axe Fighting",
    icon: "🪓",
    itemId: 35286,
    equipmentName: "Lasting Exercise Axe",
    desc: "Treino de combate com machados.",
  },
  {
    id: "club",
    name: "Club Fighting",
    icon: "🔨",
    itemId: 35287,
    equipmentName: "Lasting Exercise Club",
    desc: "Treino de combate com clavas e martelos.",
  },
  {
    id: "distance",
    name: "Distance Fighting",
    icon: "🏹",
    itemId: 35288,
    equipmentName: "Lasting Exercise Bow",
    desc: "Treino de combate à distância.",
  },
  {
    id: "magic",
    name: "Magic Level",
    icon: "🔮",
    itemId: 35290,
    equipmentName: "Lasting Exercise Wand",
    desc: "Treino de poder arcano e nível mágico.",
  },
  {
    id: "shielding",
    name: "Shielding",
    icon: "🛡️",
    itemId: 44067,
    equipmentName: "Lasting Exercise Shield",
    desc: "Treino de defesa e bloqueio com escudo.",
  },
];

const HUNTERA_BLESSINGS = [
  {
    id: "wisdom-of-solitude",
    name: "Wisdom of Solitude",
    alias: "Eremita",
    icon: "🧘‍♂️",
    desc: "O conhecimento do eremita resguarda todo o seu aprendizado e habilidades.",
  },
  {
    id: "spark-of-the-phoenix",
    name: "Spark of the Phoenix",
    alias: "Fênix",
    icon: "🔥",
    desc: "Renasça das cinzas com sua força e vitalidade intactas.",
  },
  {
    id: "fire-of-the-suns",
    name: "Fire of the Suns",
    alias: "Sóis Gêmeos",
    icon: "☀️",
    desc: "O fogo dos dois sóis consome a reivindicação da própria morte.",
  },
  {
    id: "spiritual-shielding",
    name: "Spiritual Shielding",
    alias: "Escudo Espiritual",
    icon: "🛡️",
    desc: "Uma barreira sagrada entre a sua alma e o vazio da morte.",
  },
  {
    id: "embrace-of-tibia",
    name: "Embrace of Tibia",
    alias: "Abraço de Tibia",
    icon: "🌍",
    desc: "A própria terra viva se recusa a deixar o seu espírito partir.",
  },
];

const VOCATION_ICONS = {
  knight: '🛡️',
  paladin: '🏹',
  sorcerer: '🔮',
  druid: '🌿',
  none: '⚔️',
};

const ACTION_OPTIONS = {
  potion: [
    { id: "health-potion", name: "Health Potion", itemId: 266 },
    { id: "mana-potion", name: "Mana Potion", itemId: 268 },
    { id: "strong-health-potion", name: "Strong Health Potion", itemId: 236 },
    { id: "strong-mana-potion", name: "Strong Mana Potion", itemId: 237 },
    { id: "great-health-potion", name: "Great Health Potion", itemId: 239 },
    { id: "great-mana-potion", name: "Great Mana Potion", itemId: 238 },
    { id: "ultimate-health-potion", name: "Ultimate Health Potion", itemId: 7643 },
    { id: "ultimate-mana-potion", name: "Ultimate Mana Potion", itemId: 23373 },
    { id: "supreme-health-potion", name: "Supreme Health Potion", itemId: 23375 },
    { id: "great-spirit-potion", name: "Great Spirit Potion", itemId: 7642 },
    { id: "ultimate-spirit-potion", name: "Ultimate Spirit Potion", itemId: 23374 },
    { id: "lesser-health-potion", name: "Lesser Health Potion", itemId: 7876 },
  ],
  rune: [
    { id: "great-fireball-rune", name: "Great Fireball Rune", itemId: 3191 },
    { id: "avalanche-rune", name: "Avalanche Rune", itemId: 3161 },
    { id: "thunderstorm-rune", name: "Thunderstorm Rune", itemId: 3202 },
    { id: "stone-shower-rune", name: "Stone Shower Rune", itemId: 3175 },
    { id: "sudden-death-rune", name: "Sudden Death Rune", itemId: 3155 },
    { id: "ultimate-healing-rune", name: "Ultimate Healing Rune", itemId: 3160 },
    { id: "explosion-rune", name: "Explosion Rune", itemId: 3200 },
    { id: "fireball-rune", name: "Fireball Rune", itemId: 3189 },
    { id: "heavy-magic-missile-rune", name: "Heavy Magic Missile Rune", itemId: 3198 },
    { id: "icicle-rune", name: "Icicle Rune", itemId: 3158 },
    { id: "holy-missile-rune", name: "Holy Missile Rune", itemId: 3182 },
  ],
  spell: [
    { id: "wound-cleansing", name: "Wound Cleansing (exura ico)" },
    { id: "light-healing", name: "Light Healing (exura)" },
    { id: "intense-healing", name: "Intense Healing (exura gran)" },
    { id: "ultimate-healing", name: "Ultimate Healing (exura vita)" },
    { id: "divine-healing", name: "Divine Healing (exura san)" },
    { id: "challenge", name: "Challenge (exeta res)" },
    { id: "whirlwind-throw", name: "Whirlwind Throw (exori hur)" },
    { id: "brutal-strike", name: "Brutal Strike (exori ico)" },
    { id: "lesser-front-sweep", name: "Lesser Front Sweep (exori infir min)" },
    { id: "front-sweep", name: "Front Sweep (exori min)" },
    { id: "berserk", name: "Berserk (exori)" },
    { id: "fierce-berserk", name: "Fierce Berserk (exori gran)" },
    { id: "groundshaker", name: "Groundshaker (exori mas)" },
  ]
};

function formatActionName(type, id) {
  const list = ACTION_OPTIONS[type] || [];
  const found = list.find((it) => it.id === id);
  if (found) return found.name;
  return id ? id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Ação';
}

function getActionIconHtml(type, id) {
  const list = ACTION_OPTIONS[type] || [];
  const found = list.find((it) => it.id === id);
  if (found && found.itemId) {
    return `<img class="action-icon-img" src="/api/item-icon?name=${encodeURIComponent(found.name)}&id=${found.itemId}" alt="${found.name}" onerror="handleItemImageError(this)" />`;
  }
  if (type === 'potion') return `<span class="action-icon-emoji">🧪</span>`;
  if (type === 'rune') return `<span class="action-icon-emoji">✨</span>`;
  return `<span class="action-icon-emoji">⚔️</span>`;
}

function formatConditionTag(cond) {
  if (!cond) return '';
  let attr = cond.attribute || 'health';
  let icon = '❤️';
  if (attr === 'health') { attr = 'Vida'; icon = '❤️'; }
  else if (attr === 'mana') { attr = 'Mana'; icon = '🧪'; }
  else if (attr === 'targets') { attr = 'Alvos'; icon = '👾'; }

  const op = cond.operator || '<=';
  const val = cond.value ?? 0;
  const unit = cond.percent ? '%' : '';

  return `${icon} ${attr} ${op} ${val}${unit}`;
}

function renderVitalsHtml(sess, char) {
  const pState = sess?.playerState || {};
  const hp = typeof pState.hp === 'number' ? pState.hp : (typeof char?.hp === 'number' ? char.hp : 0);
  const maxHp = typeof pState.maxHp === 'number' ? pState.maxHp : (typeof char?.maxHp === 'number' ? char.maxHp : (hp > 0 ? hp : 100));
  const mana = typeof pState.mana === 'number' ? pState.mana : (typeof char?.mana === 'number' ? char.mana : 0);
  const maxMana = typeof pState.maxMana === 'number' ? pState.maxMana : (typeof char?.maxMana === 'number' ? char.maxMana : (mana > 0 ? mana : 100));

  const hpPct = Math.min(100, Math.max(0, Math.round((hp / (maxHp || 1)) * 100)));
  const manaPct = Math.min(100, Math.max(0, Math.round((mana / (maxMana || 1)) * 100)));

  return `
    <div class="char-vitals-container">
      <div class="vital-bar-block hp-block" title="Pontos de Vida: ${hp.toLocaleString('pt-BR')} / ${maxHp.toLocaleString('pt-BR')} (${hpPct}%)">
        <div class="vital-bar-labels">
          <span class="vital-name">❤️ Vida (HP)</span>
          <span class="vital-values char-hp-num">${hp.toLocaleString('pt-BR')} / ${maxHp.toLocaleString('pt-BR')}</span>
        </div>
        <div class="vital-bar-track">
          <div class="vital-bar-fill hp-fill char-hp-fill" style="width: ${hpPct}%;"></div>
        </div>
      </div>
      <div class="vital-bar-block mana-block" title="Mana: ${mana.toLocaleString('pt-BR')} / ${maxMana.toLocaleString('pt-BR')} (${manaPct}%)">
        <div class="vital-bar-labels">
          <span class="vital-name">🧪 Mana</span>
          <span class="vital-values char-mana-num">${mana.toLocaleString('pt-BR')} / ${maxMana.toLocaleString('pt-BR')}</span>
        </div>
        <div class="vital-bar-track">
          <div class="vital-bar-fill mana-fill char-mana-fill" style="width: ${manaPct}%;"></div>
        </div>
      </div>
    </div>
  `;
}

function getSubTabHash(subtab, sess) {
  if (!sess) return '';
  switch (subtab) {
    case 'monsters':
      return `${sess.monsterDeaths || 0}:${(sess.killsDetailed || []).map(k => `${k.name}:${k.count}:${k.bestiaryKills}`).join('|')}`;
    case 'actionbar':
      return JSON.stringify(sess.actionBar?.slots || []);
    case 'supplies':
      return (sess.suppliesUsed || []).map(s => `${s.itemId || s.name}:${s.count}:${s.totalCost}`).join('|');
    case 'loot':
      return `${sess.priceMode || 'npc'}:${(sess.loot || []).map(l => `${l.itemId || l.name}:${l.count}:${l.value}:${l.unitValue}:${l.inBag}`).join('|')}`;
    case 'inventory':
      return `${sess.inventory?.gold || 0}:${(sess.inventory?.backpack || []).map(i => `${i.itemId || i.name}:${i.count}`).join('|')}`;
    case 'skills':
      return (sess.skills || []).map(s => `${s.name}:${s.level}:${s.percent}:${s.remaining}`).join('|');
    default:
      return '';
  }
}

function getCharacterAvatarUrl(char) {
  if (!char) return '';
  const outfitId = char.outfitId || 128;
  const colors = char.outfitColors || {};
  const head = colors.head ?? 0;
  const body = colors.body ?? 0;
  const legs = colors.legs ?? 0;
  const feet = colors.feet ?? 0;
  const voc = char.vocation || 'none';
  return `/api/avatar?outfitId=${outfitId}&head=${head}&body=${body}&legs=${legs}&feet=${feet}&vocation=${encodeURIComponent(voc)}`;
}

function handleAvatarError(img, vocation) {
  img.onerror = null;
  if (!img.src.includes('animate=0')) {
    const delim = img.src.includes('?') ? '&' : '?';
    img.src = `${img.src}${delim}animate=0`;
    return;
  }
  const parent = img.parentElement;
  if (parent) {
    const icon = VOCATION_ICONS[(vocation || '').toLowerCase()] || '⚔️';
    parent.innerHTML = `<span class="char-avatar-fallback">${icon}</span>`;
  }
}
window.handleAvatarError = handleAvatarError;

function handleItemImageError(img) {
  img.onerror = null;
  img.src = '/favicon.svg';
}
window.handleItemImageError = handleItemImageError;

function formatEstimatedTimeClient(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
    return '--';
  }
  if (seconds === 0) return '0s';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  if (m < 60) {
    return remSec > 0 ? `${m}m ${remSec}s` : `${m}m`;
  }
  const h = Math.floor(m / 60);
  const remMin = m % 60;
  if (h < 24) {
    return remMin > 0 ? `${h}h ${String(remMin).padStart(2, '0')}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  const remHours = h % 24;
  return `${d}d ${remHours}h`;
}

function formatTrainingEta(ms) {
  if (ms === null || ms === undefined || isNaN(ms) || ms <= 0) {
    return '--';
  }
  const totalSec = Math.max(0, Math.round(ms / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const remMin = totalMin % 60;
  if (hours < 24) {
    return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function formatDuration(ms) {
  return formatTrainingEta(ms);
}

function getSessionRates(sess) {
  if (sess && sess.rates && typeof sess.rates.goldPerHour === 'number') {
    return sess.rates;
  }
  const elapsedMs = sess?.elapsedMs || 0;
  const elapsedSeconds = elapsedMs / 1000;
  if (elapsedSeconds <= 0) {
    return {
      goldPerHour: 0,
      wastePerHour: 0,
      balancePerHour: 0,
      xpPerHour: 0,
      secondsToNextLevel: null,
      timeToNextLevelFormatted: '--',
    };
  }
  const factor = 3600 / elapsedSeconds;
  const lootVal = sess?.lootValue || 0;
  const wasteVal = sess?.waste || 0;
  const balVal = sess?.balance || 0;
  const xpVal = sess?.experienceGained || 0;
  const remXp = sess?.remainingXp || 0;

  const goldPerHour = Math.round(lootVal * factor);
  const wastePerHour = Math.round(wasteVal * factor);
  const balancePerHour = Math.round(balVal * factor);
  const xpPerHour = Math.round(xpVal * factor);

  let secondsToNextLevel = null;
  let timeToNextLevelFormatted = '--';
  if (remXp <= 0 && (sess?.experienceNeeded || 0) > 0) {
    secondsToNextLevel = 0;
    timeToNextLevelFormatted = '0s';
  } else if (xpPerHour > 0 && remXp > 0) {
    secondsToNextLevel = Math.round((remXp / xpPerHour) * 3600);
    timeToNextLevelFormatted = formatEstimatedTimeClient(secondsToNextLevel);
  } else if (xpVal === 0) {
    timeToNextLevelFormatted = 'Calculando...';
  }

  return {
    goldPerHour,
    wastePerHour,
    balancePerHour,
    xpPerHour,
    secondsToNextLevel,
    timeToNextLevelFormatted,
  };
}

// ---------------------------------------------------------------------------
// Inicialização e Conexão SSE
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  setupLayoutControls();
  connectSSE();
});

function setupLayoutControls() {
  const btnGrid = document.getElementById('btn-view-grid');
  const btnTabs = document.getElementById('btn-view-tabs');
  const tabsBar = document.getElementById('tabs-bar');
  const container = document.getElementById('slots-container');

  btnGrid.addEventListener('click', () => {
    state.viewMode = 'grid';
    btnGrid.classList.add('active');
    btnTabs.classList.remove('active');
    tabsBar.style.display = 'none';
    container.classList.remove('tabs-mode');
  });

  btnTabs.addEventListener('click', () => {
    state.viewMode = 'tabs';
    btnTabs.classList.add('active');
    btnGrid.classList.remove('active');
    tabsBar.style.display = 'flex';
    container.classList.add('tabs-mode');
    switchTab(state.activeTab);
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slotId = parseInt(btn.dataset.slot, 10);
      switchTab(slotId);
    });
  });
}

function switchTab(slotId) {
  state.activeTab = slotId;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', parseInt(b.dataset.slot, 10) === slotId);
  });

  document.querySelectorAll('.slot-card').forEach((card) => {
    card.classList.toggle('tab-active', parseInt(card.dataset.slotId, 10) === slotId);
  });
}

function connectSSE() {
  const indicator = document.getElementById('live-indicator');
  const es = new EventSource('/api/events');

  es.onopen = () => {
    indicator.style.opacity = '1';
  };

  es.onmessage = (event) => {
    try {
      const slotsData = JSON.parse(event.data);
      updateAllSlots(slotsData);
    } catch (err) {
      console.error('Erro ao processar dados SSE:', err);
    }
  };

  es.onerror = () => {
    indicator.style.opacity = '0.4';
  };
}

// ---------------------------------------------------------------------------
// Atualização e Renderização dos Slots
// ---------------------------------------------------------------------------

function updateAllSlots(slotsData) {
  slotsData.forEach((slot, index) => {
    const prev = state.slots[index];
    state.slots[index] = slot;

    // Se o slot foi desconectado, limpa cache local do slot
    if (slot.status === 'idle') {
      state.catalogs[index] = null;
      state.selectedHunts[index] = null;
    }

    // Se o slot trouxe o catálogo do backend, salva no state
    if (Array.isArray(slot.catalog) && slot.catalog.length > 0) {
      state.catalogs[index] = slot.catalog;
      if (!state.selectedHunts[index]) {
        state.selectedHunts[index] = slot.catalog[0].id ?? slot.catalog[0].huntId;
      }
    }

    // Atualiza badge da aba
    const badge = document.getElementById(`tab-badge-${slot.id}`);
    if (badge) {
      if (slot.status === 'dead' || slot.session?.deathInfo?.isDead) {
        badge.textContent = '☠️ Morto';
        badge.className = 'tab-badge dead';
      } else if (slot.status === 'hunting') {
        badge.textContent = 'Caçando';
        badge.className = 'tab-badge hunting';
      } else if (slot.status === 'connected' && slot.session?.training?.active) {
        badge.textContent = '🥋 Treinando';
        badge.className = 'tab-badge training';
      } else if (slot.status === 'connected') {
        badge.textContent = slot.character?.name || 'Pronto';
        badge.className = 'tab-badge';
      } else {
        badge.textContent = 'Livre';
        badge.className = 'tab-badge';
      }
    }

    // Se acabou de conectar e ainda não tem catálogo, busca via endpoint
    if (slot.status === 'connected' && (!state.catalogs[index] || state.catalogs[index].length === 0)) {
      loadCatalog(slot.id);
    }

    renderSlot(slot);
  });

  updateGlobalPartyBanner();
  updateOpenPartyModal();
}

async function loadCatalog(slotId) {
  const idx = slotId - 1;
  try {
    const resp = await fetch(`/api/slots/${slotId}/catalog`);
    const data = await resp.json();
    if (Array.isArray(data.hunts) && data.hunts.length > 0) {
      state.catalogs[idx] = data.hunts;
      if (!state.selectedHunts[idx]) {
        state.selectedHunts[idx] = data.hunts[0].id ?? data.hunts[0].huntId;
      }
      if (state.slots[idx]) {
        renderSlot(state.slots[idx]);
      }
    }
  } catch (err) {
    console.error(`Erro ao carregar catálogo para slot ${slotId}:`, err);
  }
}

function renderSlot(slot) {
  const card = document.getElementById(`slot-card-${slot.id}`);
  const body = document.getElementById(`slot-body-${slot.id}`);
  const statusPill = card.querySelector('.slot-status-pill');

  const isDead = slot.status === 'dead' || Boolean(slot.session?.deathInfo?.isDead);
  const currentStatus = card.dataset.currentStatus || '';
  const currentError = card.dataset.currentError || '';
  const nextStatus = isDead ? 'dead' : slot.status;
  const nextError = slot.errorMessage || '';

  card.className = `slot-card ${nextStatus === 'hunting' ? 'hunting' : ''} ${nextStatus === 'dead' ? 'dead' : ''} ${state.activeTab === slot.id ? 'tab-active' : ''}`;
  statusPill.className = `slot-status-pill ${nextStatus}`;

  // Se o estado e erro não mudaram e a view já está renderizada, preserva o DOM
  if (currentStatus === nextStatus && currentError === nextError) {
    if (nextStatus === 'idle' && body.querySelector('.login-form')) {
      return;
    }
    if (nextStatus === 'dead' && body.querySelector('.death-screen-view')) {
      return;
    }
    if (nextStatus === 'connected' && (body.querySelector('.hunt-picker-card') || body.querySelector('.blessings-panel-card') || body.querySelector('.training-panel-card'))) {
      const char = slot.character || {};
      const sess = slot.session || {};
      const levelBadge = body.querySelector('.char-level-badge');
      if (levelBadge && char.level) {
        levelBadge.textContent = `Nv. ${char.level}`;
      }
      const goldBadge = body.querySelector('.char-gold-badge');
      if (goldBadge && sess.totalGold !== undefined) {
        goldBadge.textContent = `💰 ${(sess.totalGold || 0).toLocaleString('pt-BR')} gp`;
      }
      const staminaBadge = body.querySelector('.char-stamina-badge');
      if (staminaBadge && sess.playerState?.staminaFormatted) {
        staminaBadge.textContent = `⚡ ${sess.playerState.staminaFormatted}`;
        staminaBadge.className = `char-stamina-badge stamina-${sess.playerState.staminaTier || 'orange'}`;
      }
      const xpFill = body.querySelector('.char-xp-bar-fill');
      if (xpFill && sess.xpPercent !== undefined) {
        xpFill.style.width = `${sess.xpPercent || 0}%`;
      }
      const xpPct = body.querySelector('.char-xp-pct');
      if (xpPct && sess.xpPercent !== undefined) {
        xpPct.textContent = `${sess.xpPercent || 0}%`;
      }
      const xpNeeded = body.querySelector('.char-xp-needed');
      if (xpNeeded && sess.remainingXp !== undefined) {
        xpNeeded.textContent = `Faltam ${(sess.remainingXp || 0).toLocaleString('pt-BR')} XP para Nv. ${(char.level || 1) + 1}`;
      }

      // Atualiza vitais de HP e Mana
      const pState = sess.playerState || {};
      const hp = typeof pState.hp === 'number' ? pState.hp : (typeof char.hp === 'number' ? char.hp : 0);
      const maxHp = typeof pState.maxHp === 'number' ? pState.maxHp : (typeof char.maxHp === 'number' ? char.maxHp : (hp > 0 ? hp : 100));
      const mana = typeof pState.mana === 'number' ? pState.mana : (typeof char.mana === 'number' ? char.mana : 0);
      const maxMana = typeof pState.maxMana === 'number' ? pState.maxMana : (typeof char.maxMana === 'number' ? char.maxMana : (mana > 0 ? mana : 100));

      const hpNum = body.querySelector('.char-hp-num');
      const hpFill = body.querySelector('.char-hp-fill');
      if (hpNum) hpNum.textContent = `${hp.toLocaleString('pt-BR')} / ${maxHp.toLocaleString('pt-BR')}`;
      if (hpFill) hpFill.style.width = `${Math.min(100, Math.max(0, Math.round((hp / (maxHp || 1)) * 100)))}%`;

      const manaNum = body.querySelector('.char-mana-num');
      const manaFill = body.querySelector('.char-mana-fill');
      if (manaNum) manaNum.textContent = `${mana.toLocaleString('pt-BR')} / ${maxMana.toLocaleString('pt-BR')}`;
      if (manaFill) manaFill.style.width = `${Math.min(100, Math.max(0, Math.round((mana / (maxMana || 1)) * 100)))}%`;

      const isHuntTab = (state.slotActiveTabs?.[slot.id - 1] || 'hunt') === 'hunt';
      const select = body.querySelector('.hunt-select');
      const catalog = state.catalogs[slot.id - 1] || [];
      // Se o catálogo chegou agora e o select estava vazio, atualiza o seletor na aba de caçada!
      if (isHuntTab && (!select || (catalog.length > 0 && select.options.length !== catalog.length))) {
        body.innerHTML = renderConnectedView(slot);
        attachConnectedHandlers(slot.id);
      }

      // Atualiza botão de Amigos
      const friendsBtn = body.querySelector('.btn-header-party');
      if (friendsBtn) {
        friendsBtn.innerHTML = `👥 Amigos ${sess.party?.members?.length ? `<span class="party-badge-indicator in-party" title="${sess.party.members.length} membros na party">Party (${sess.party.members.length})</span>` : (sess.friends?.length ? `<span class="party-badge-indicator" title="${sess.friends.length} amigos">${sess.friends.length}</span>` : '')}`;
      }

      // Atualiza card de convite diretamente dentro da div do slot
      const bannerContainer = body.querySelector(`#slot-invite-banner-container-${slot.id}`);
      if (bannerContainer) {
        const newBannerHtml = renderSlotInviteBanner(slot.id, sess);
        if (bannerContainer.innerHTML.trim() !== newBannerHtml.trim()) {
          bannerContainer.innerHTML = newBannerHtml;
        }
      }

      // Atualiza subaba da cidade se estiver em Treino
      const subtabContainer = body.querySelector(`#city-subtab-container-${slot.id}`);
      const currentSubTab = state.citySubTabs[slot.id - 1] || 'hunts';
      if (subtabContainer && currentSubTab === 'training') {
        subtabContainer.innerHTML = renderTrainingTab(slot);
      }
      return;
    }
    if (nextStatus === 'hunting' && body.querySelector('.active-hunt-view')) {
      updateHuntingMetrics(body, slot);
      return;
    }
  }

  card.dataset.currentStatus = nextStatus;
  card.dataset.currentError = nextError;

  if (slot.status === 'idle') {
    statusPill.textContent = 'Desconectado';
    body.innerHTML = renderLoginForm(slot.id, slot.errorMessage);
    attachLoginHandler(slot.id);
  } else if (slot.status === 'logging_in') {
    statusPill.textContent = 'Conectando...';
    body.innerHTML = `
      <div style="text-align: center; padding: 40px 0; color: var(--gold);">
        <p style="font-size: 28px; margin-bottom: 12px; animation: spin 1s infinite linear;">⚔️</p>
        <p style="font-weight: 600;">Autenticando e conectando...</p>
      </div>
    `;
  } else if (nextStatus === 'dead') {
    statusPill.textContent = '☠️ Morto';
    body.innerHTML = renderDeathView(slot);
    attachDeathHandlers(slot.id);
  } else if (nextStatus === 'connected') {
    if (slot.session?.training?.active) {
      statusPill.textContent = '🥋 Treinando Online';
    } else {
      statusPill.textContent = 'Pronto na Cidade';
    }
    body.innerHTML = renderConnectedView(slot);
    attachConnectedHandlers(slot.id);
  } else if (nextStatus === 'hunting') {
    statusPill.textContent = 'Caçando';
    body.innerHTML = renderHuntingView(slot);
    attachHuntingHandlers(slot.id);
  }
}

// ---------------------------------------------------------------------------
// Views dos Slots
// ---------------------------------------------------------------------------

function renderLoginForm(slotId, error) {
  return `
    <form class="login-form" id="form-login-${slotId}" method="post" action="#" autocomplete="on">
      <h3>Entrar na Conta</h3>
      ${error ? `<div class="error-banner">${error}</div>` : ''}
      <div class="input-group">
        <label for="slot-login-email-${slotId}">E-mail ou Usuário</label>
        <input type="text" id="slot-login-email-${slotId}" name="username" required placeholder="seu@email.com" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">
      </div>
      <div class="input-group">
        <label for="slot-login-pass-${slotId}">Senha</label>
        <input type="password" id="slot-login-pass-${slotId}" name="password" required placeholder="••••••••" autocomplete="current-password">
      </div>
      <button type="submit" class="btn-primary" style="margin-top: 8px;">Conectar Personagem</button>
    </form>
  `;
}

function renderConnectedView(slot) {
  const char = slot.character || { name: 'Gatonet', level: 1, vocation: 'none' };
  const icon = VOCATION_ICONS[char.vocation?.toLowerCase()] || '⚔️';
  const sess = slot.session || {};
  const catalog = state.catalogs[slot.id - 1] || [];
  const selectedHuntId = state.selectedHunts[slot.id - 1] || (catalog[0]?.id ?? '');
  const selectedHunt = catalog.find((h) => (h.id ?? h.huntId) === selectedHuntId) || catalog[0];

  const currentTier = state.selectedTiers[slot.id - 1] || 0;
  const tiers = selectedHunt?.tiers || [
    { name: 'Cautious', monsterCount: 2 },
    { name: 'Bold', monsterCount: 5 },
    { name: 'Reckless', monsterCount: 8 },
  ];

  const avatarUrl = getCharacterAvatarUrl(char);
  const colors = char.outfitColors || {};

  const hasHunts = catalog.length > 0;
  const hasInvite = Boolean(sess.partyInvite || sess.transferOffer);

  return `
    <!-- Banner do Personagem -->
    <div class="char-banner">
      <div class="char-avatar-box">
        <img class="char-avatar-img"
             src="${avatarUrl}"
             alt="${char.name}"
             data-outfit-id="${char.outfitId || 128}"
             data-head="${colors.head ?? 0}"
             data-body="${colors.body ?? 0}"
             data-legs="${colors.legs ?? 0}"
             data-feet="${colors.feet ?? 0}"
             onerror="handleAvatarError(this, '${char.vocation || 'none'}')" />
      </div>
      <div class="char-details">
        <div class="char-title-row">
          <span class="char-name">${char.name}</span>
          <span class="char-level-badge">Nv. ${char.level}</span>
          <span class="char-gold-badge" title="Saldo total de moedas de ouro">💰 ${(sess.totalGold || 0).toLocaleString('pt-BR')} gp</span>
          ${sess.playerState?.staminaFormatted ? `
            <span class="char-stamina-badge stamina-${sess.playerState.staminaTier || 'orange'}" title="Stamina restante">⚡ ${sess.playerState.staminaFormatted}</span>
          ` : ''}
        </div>
        <div class="char-vocation-row">
          <span class="vocation-icon">${icon}</span>
          <span class="vocation-name">${formatVocation(char.vocation)}</span>
        </div>
        ${(sess.experienceNeeded || sess.experience) ? `
          <div class="char-xp-wrap" title="XP: ${(sess.experience || 0).toLocaleString('pt-BR')} / ${(sess.experienceNeeded || 0).toLocaleString('pt-BR')}">
            <div class="char-xp-bar-bg">
              <div class="char-xp-bar-fill" style="width: ${sess.xpPercent || 0}%"></div>
            </div>
            <div class="char-xp-labels">
              <span class="char-xp-pct">${sess.xpPercent || 0}%</span>
              <span class="char-xp-needed">Faltam ${(sess.remainingXp || 0).toLocaleString('pt-BR')} XP</span>
            </div>
          </div>
        ` : ''}
        ${renderVitalsHtml(sess, char)}
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
        <button type="button" class="btn-header-party" onclick="openPartyFriendsModal(${slot.id})" title="Ver Lista de Amigos e Party">
          👥 Amigos ${sess.party?.members?.length ? `<span class="party-badge-indicator in-party" title="${sess.party.members.length} membros na party">Party (${sess.party.members.length})</span>` : (sess.friends?.length ? `<span class="party-badge-indicator" title="${sess.friends.length} amigos">${sess.friends.length}</span>` : '')}
        </button>
        <button class="btn-secondary btn-logout" data-slot="${slot.id}" title="Desconectar">Sair</button>
      </div>
    </div>

    <!-- Banner de Convite Recebido no Próprio Slot -->
    <div id="slot-invite-banner-container-${slot.id}">
      ${renderSlotInviteBanner(slot.id, sess)}
    </div>

    <!-- Abas da Cidade: Caçadas vs Treinamento vs Bênçãos -->
    <div class="city-nav-tabs">
      <button type="button" class="city-nav-btn ${(state.citySubTabs[slot.id - 1] || 'hunts') === 'hunts' ? 'active' : ''}" onclick="switchCitySubTab(${slot.id}, 'hunts')">
        🗡️ Caçadas
      </button>
      <button type="button" class="city-nav-btn ${(state.citySubTabs[slot.id - 1] || 'hunts') === 'training' ? 'active' : ''}" onclick="switchCitySubTab(${slot.id}, 'training')">
        🎯 Treino ${sess.training?.active ? `<span class="city-training-badge active">Em Treino</span>` : ''}
      </button>
      <button type="button" class="city-nav-btn ${(state.citySubTabs[slot.id - 1] || 'hunts') === 'blessings' ? 'active' : ''}" onclick="switchCitySubTab(${slot.id}, 'blessings')">
        ✨ Bênçãos <span class="city-blessings-badge ${(sess.blessings?.owned?.length || 0) === 5 ? 'protected' : 'unprotected'}">${sess.blessings?.owned?.length || 0}/5</span>
      </button>
    </div>

    <div id="city-subtab-container-${slot.id}">
      ${(state.citySubTabs[slot.id - 1] || 'hunts') === 'blessings' ? `
        ${renderBlessingsTab(slot)}
      ` : (state.citySubTabs[slot.id - 1] || 'hunts') === 'training' ? `
        ${renderTrainingTab(slot)}
      ` : `
        <!-- Seletor de Caçada e Tiers -->
        <div class="hunt-picker-card">
          ${!hasHunts ? `
            <div style="text-align: center; padding: 30px 0; color: var(--gold);">
              <p style="font-size: 26px; margin-bottom: 8px; animation: spin 1s infinite linear;">⚔️</p>
              <p style="font-size: 13px; font-weight: 600;">Carregando caçadas disponíveis...</p>
            </div>
          ` : `
            <div class="picker-label">Selecione a Caçada (${catalog.length} disponíveis)</div>
            <select class="hunt-select" id="select-hunt-${slot.id}">
              ${catalog.map((h) => {
                const id = h.id ?? h.huntId;
                const name = h.name ?? h.displayName ?? id;
                const req = h.requiredLevel ? ` [Nv. ${h.requiredLevel}+]` : '';
                return `<option value="${id}" ${id === selectedHuntId ? 'selected' : ''}>${name}${req}</option>`;
              }).join('')}
            </select>

            <div class="picker-label" style="margin-top: 4px;">Dificuldade / Tier</div>
            <div class="tier-selector" id="tier-selector-${slot.id}">
              ${tiers.map((t, idx) => `
                <div class="tier-pill ${idx === currentTier ? 'selected' : ''}" data-tier="${idx}" data-slot="${slot.id}">
                  <div class="tier-name">${t.name || `Tier ${idx}`}</div>
                  <div class="tier-monsters">${t.monsterCount || (idx * 3 + 2)} monstros</div>
                </div>
              `).join('')}
            </div>

            <button class="btn-primary btn-start-hunt" data-slot="${slot.id}" style="margin-top: 10px; padding: 12px; font-size: 15px;">
              ⚔️ Começar Caçada
            </button>
          `}
        </div>

        <!-- Painel de Sequência & Condições na Cidade -->
        <div class="connected-actionbar-card">
          <button type="button" class="btn-secondary btn-actionbar-toggle" id="btn-actionbar-toggle-${slot.id}" onclick="toggleConnectedActionBar(${slot.id})">
            ⚡ Sequência & Condições de Poções (${(sess.actionBar?.slots || []).filter(Boolean).length}/20 ativas)
          </button>
          <div class="connected-actionbar-panel" id="connected-actionbar-${slot.id}" style="display: none; margin-top: 10px;" data-actionbar-hash="${JSON.stringify(sess.actionBar?.slots || [])}">
            ${renderActionBarList(slot.id, sess)}
          </div>
        </div>
      `}
    </div>
  `;
}

function renderActionBarList(slotId, sess) {
  const bar = sess.actionBar || {};
  const rawSlots = bar.slots || [];
  const slots = Array.from({ length: 20 }, (_, i) => rawSlots[i] || null);
  const activeCount = slots.filter(Boolean).length;

  return `
    <div class="action-slots-wrapper">
      <div class="action-slots-topbar">
        <div class="action-slots-title-wrap">
          <span class="action-slots-title">Prioridade de Ações & Poções</span>
          <span class="action-slots-sub">Ordem de execução prioritária no jogo (Slot 1 → Slot 20)</span>
        </div>
        <span class="action-slots-count-pill">${activeCount}/20 slots ativos</span>
      </div>
      <div class="action-slots-grid">
        ${slots.map((rule, idx) => {
          const slotNum = idx + 1;
          if (!rule) {
            return `
              <div class="action-slot-item empty" onclick="openActionSlotModal(${slotId}, ${idx})">
                <span class="slot-num-badge">#${slotNum}</span>
                <div class="slot-empty-content">
                  <span class="slot-empty-icon">➕</span>
                  <span class="slot-empty-text">Slot vazio</span>
                </div>
                <button type="button" class="btn-sm btn-slot-add" onclick="event.stopPropagation(); openActionSlotModal(${slotId}, ${idx})">+ Configurar</button>
              </div>
            `;
          }

          const type = rule.potionId ? 'potion' : rule.runeId ? 'rune' : rule.spellId ? 'spell' : 'potion';
          const actionId = rule.potionId || rule.runeId || rule.spellId;
          const actionName = formatActionName(type, actionId);
          const iconHtml = getActionIconHtml(type, actionId);
          const conds = rule.conditions || [];
          const isEnabled = rule.enabled !== false;
          const typeBadge = type === 'potion' ? 'POÇÃO' : type === 'rune' ? 'RUNA' : 'SPELL';

          return `
            <div class="action-slot-item ${isEnabled ? 'enabled' : 'disabled'}">
              <span class="slot-num-badge">#${slotNum}</span>
              <div class="slot-icon-area">${iconHtml}</div>
              <div class="slot-info-area">
                <div class="slot-header-row">
                  <span class="slot-name-text" title="${actionName}">${actionName}</span>
                  <span class="slot-kind-pill ${type}">${typeBadge}</span>
                  ${!isEnabled ? '<span class="slot-off-pill">Pausado</span>' : ''}
                </div>
                <div class="slot-conds-row">
                  ${conds.length === 0 ? `
                    <span class="cond-tag always">Sempre ativo</span>
                  ` : conds.map((c) => `<span class="cond-tag">${formatConditionTag(c)}</span>`).join('')}
                </div>
              </div>
              <div class="slot-actions-area">
                <button type="button" class="btn-slot-icon edit" onclick="openActionSlotModal(${slotId}, ${idx})" title="Editar slot #${slotNum}">✏️</button>
                <button type="button" class="btn-slot-icon delete" onclick="clearActionSlot(${slotId}, ${idx})" title="Limpar slot #${slotNum}">🗑️</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderBlessingsTab(slot) {
  const sess = slot.session || {};
  const char = slot.character || {};
  const blState = sess.blessings || {};
  const owned = Array.isArray(blState.owned) ? blState.owned : [];
  const ownedCount = owned.length;
  const isAllOwned = ownedCount === 5;
  const freeUntilLevel = blState.freeUntilLevel || 80;
  const isFree = (char.level || 0) < freeUntilLevel || blState.cost === 0;
  const cost = blState.cost || 0;
  const missingCount = Math.max(0, 5 - ownedCount);
  const totalCost = isFree ? 0 : missingCount * cost;

  return `
    <div class="blessings-panel-card">
      <div class="blessings-header-box">
        <div class="blessings-status-info">
          <div class="blessings-status-title">
            <span>✨ Bênçãos do Templo</span>
            <span class="blessings-count-badge ${isAllOwned ? 'full' : 'warning'}">
              ${ownedCount}/5 Adquiridas
            </span>
          </div>
          <p class="blessings-desc">
            As bênçãos protegem sua experiência, habilidades e equipamentos em caso de morte.
            Toda morte consome todas as bênçãos ativas.
          </p>
        </div>

        <div class="blessings-protection-summary">
          <div class="prot-kpi">
            <span class="prot-val">-${blState.lossReductionPercent || 40}%</span>
            <span class="prot-label">Perda de XP/Skills</span>
          </div>
          <div class="prot-kpi">
            <span class="prot-val">${100 - (blState.equipmentLossPercent || 0)}%</span>
            <span class="prot-label">Proteção de Itens</span>
          </div>
          <div class="prot-kpi">
            <span class="prot-val">${isFree ? 'Grátis' : `${cost.toLocaleString('pt-BR')} gp`}</span>
            <span class="prot-label">${isFree ? `< Nv. ${freeUntilLevel}` : 'Custo/Bênção'}</span>
          </div>
        </div>
      </div>

      <!-- Lista das 5 Bênçãos -->
      <div class="blessings-grid">
        ${HUNTERA_BLESSINGS.map((b) => {
          const isOwned = owned.includes(b.id);
          return `
            <div class="blessing-item-card ${isOwned ? 'owned' : 'missing'}">
              <div class="blessing-item-icon">${b.icon}</div>
              <div class="blessing-item-info">
                <div class="blessing-name-row">
                  <span class="blessing-name">${b.name}</span>
                  <span class="blessing-alias">(${b.alias})</span>
                </div>
                <p class="blessing-lore">${b.desc}</p>
                <div class="blessing-status-row">
                  ${isOwned ? `
                    <span class="blessing-chip active">✅ Ativa & Protegida</span>
                  ` : `
                    <span class="blessing-chip missing">❌ Não Adquirida</span>
                  `}
                </div>
              </div>
              <div class="blessing-item-action">
                ${isOwned ? `
                  <button type="button" class="btn-sm btn-bless-bought" disabled>Protegido</button>
                ` : `
                  <button type="button" class="btn-sm btn-primary" onclick="buySingleBlessing(${slot.id}, '${b.id}')">
                    ${isFree ? 'Adquirir (Grátis)' : `Comprar (${cost.toLocaleString('pt-BR')} gp)`}
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Barra de Ação Principal -->
      <div class="blessings-footer-bar">
        <div class="blessings-footer-hint">
          ${isFree ? `
            ✨ <strong>Bênção Gratuita:</strong> Personagens abaixo do nível ${freeUntilLevel} recebem todas as bênçãos gratuitamente no Templo!
          ` : `
            💰 <strong>Custo Total:</strong> ${totalCost.toLocaleString('pt-BR')} gp para adquirir as ${missingCount} bênção(s) restante(s).
          `}
        </div>
        ${isAllOwned ? `
          <button type="button" class="btn-primary btn-bless-all" disabled>
            ✅ Você já possui todas as 5 Bênçãos
          </button>
        ` : `
          <button type="button" class="btn-primary btn-bless-all" onclick="buyAllBlessings(${slot.id})">
            ✨ Adquirir Todas as Bênçãos ${isFree ? '(Grátis)' : `(${totalCost.toLocaleString('pt-BR')} gp)`}
          </button>
        `}
      </div>
    </div>
  `;
}

function renderTrainingTab(slot) {
  const sess = slot.session || {};
  const char = slot.character || {};
  const training = sess.training || { active: false, skill: null, etaMs: null, exercise: false };
  const skills = sess.skills || [];

  // Se o slot estiver ativamente treinando, dá preferência à skill em treino caso o usuário
  // ainda não tenha selecionado uma especificamente
  const activeTrainingSkillId = (training.active && training.skill) ? training.skill : null;
  let selectedSkillId = state.selectedTrainingSkills[slot.id - 1];
  if (!selectedSkillId) {
    selectedSkillId = activeTrainingSkillId || 'sword';
    state.selectedTrainingSkills[slot.id - 1] = selectedSkillId;
  }

  // Skill atualmente em foco no painel
  const focusedSkillId = selectedSkillId;
  const focusedSkillObj = HUNTERA_TRAINING_SKILLS.find(s => s.id === focusedSkillId) || HUNTERA_TRAINING_SKILLS[0];
  const activeSkillObj = activeTrainingSkillId ? (HUNTERA_TRAINING_SKILLS.find(s => s.id === activeTrainingSkillId) || { name: activeTrainingSkillId, icon: '⚔️' }) : null;

  // Encontra dados da skill atual do personagem
  const charSkill = skills.find(s => s.id === focusedSkillId);
  const currentSkillLvl = charSkill ? charSkill.level : (focusedSkillId === 'magic' ? (char.magicLevel || sess.magicLevel || 0) : 10);
  const progress = charSkill ? (charSkill.progress || 0) : 0;
  const needed = charSkill ? (charSkill.needed || 0) : 0;
  const remaining = charSkill ? (charSkill.remaining || 0) : (needed > 0 ? Math.max(0, needed - progress) : 0);
  const percent = charSkill ? charSkill.percent : (needed > 0 ? Math.min(100, Math.floor((progress / needed) * 100)) : 0);

  const isTrainingThisSkill = training.active && training.skill === focusedSkillId;
  const isTrainingOtherSkill = training.active && training.skill !== focusedSkillId;

  // 1) ETA Treino Online (Dummy Regular Público)
  // Ritmo base: 1 avanço a cada ~2s (2000 ms). Custo: 0 gp, sem gastar itens.
  let onlineEtaMs = 0;
  if (isTrainingThisSkill && !training.exercise && typeof training.etaMs === 'number' && training.etaMs > 0) {
    onlineEtaMs = training.etaMs;
  } else if (remaining > 0) {
    onlineEtaMs = remaining * 2000;
  }

  // 2) ETA Arma de Exercício (Exercise Weapon / Item Específico)
  // Ritmo acelerado: ~6.5x mais rápido por golpe (consome 1 carga a cada 2s).
  let exerciseEtaMs = 0;
  let exerciseCharges = 0;
  if (isTrainingThisSkill && training.exercise && typeof training.etaMs === 'number' && training.etaMs > 0) {
    exerciseEtaMs = training.etaMs;
    exerciseCharges = Math.max(1, Math.ceil(training.etaMs / 2000));
  } else if (remaining > 0) {
    exerciseCharges = Math.max(1, Math.ceil(remaining / 6.5));
    exerciseEtaMs = exerciseCharges * 2000;
  }
  const weaponsCount500 = exerciseCharges > 0 ? (exerciseCharges / 500).toFixed(1) : 0;

  // Economia de tempo estimada
  const timeSavedMs = Math.max(0, onlineEtaMs - exerciseEtaMs);

  const formattedOnlineEta = formatTrainingEta(onlineEtaMs);
  const formattedExerciseEta = formatTrainingEta(exerciseEtaMs);
  const formattedTimeSaved = formatTrainingEta(timeSavedMs);

  return `
    <div class="training-panel-card">
      <div class="training-header-box">
        <div class="training-status-info">
          <div class="training-status-title">
            <span>🎯 Treinamento de Habilidades (Cidade)</span>
            <span class="training-active-badge ${training.active ? 'active' : 'idle'}">
              ${training.active ? `🥋 Treinando ${training.skill ? (HUNTERA_TRAINING_SKILLS.find(s => s.id === training.skill)?.name || training.skill) : ''}` : '💤 Ocioso (Sem Treino)'}
            </span>
          </div>
          <p class="training-desc">
            Evolua suas habilidades no pátio de treino da cidade em tempo real.
            Veja abaixo a barra de XP focada e compare a velocidade entre o <strong>Treino Online (Grátis)</strong> e a <strong>Arma de Treino</strong>.
          </p>
        </div>

        ${training.active ? `
          <div class="training-running-banner">
            <div class="running-info">
              <span class="running-icon">⚔️</span>
              <div class="running-text">
                <strong>Treino em andamento:</strong>
                <span>${HUNTERA_TRAINING_SKILLS.find(s => s.id === training.skill)?.name || training.skill} (${training.exercise ? 'Arma de Exercício' : 'Dummy Online'})</span>
                ${training.etaMs ? `<small class="training-eta"> • Tempo até o Nv. ${(skills.find(s => s.id === training.skill)?.level || 0) + 1}: ${formatTrainingEta(training.etaMs)}</small>` : ''}
              </div>
            </div>
            <button type="button" class="btn-danger btn-sm" onclick="stopTraining(${slot.id})">
              ⏹️ Parar Treino
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Card Focado na Habilidade Sendo Treinada / Selecionada -->
      <div class="training-focused-skill-card ${isTrainingThisSkill ? 'is-active-training' : ''}">
        <div class="focused-skill-header">
          <div class="focused-skill-id-badge">
            <div class="focused-skill-img-box">
              <img class="focused-skill-equip-img"
                   src="/api/item-icon?name=${encodeURIComponent(focusedSkillObj.equipmentName)}&id=${focusedSkillObj.itemId}"
                   alt="${focusedSkillObj.equipmentName}"
                   onerror="handleItemImageError(this)" />
            </div>
            <div class="focused-skill-names">
              <div class="focused-skill-title-row">
                <span class="focused-skill-title">${focusedSkillObj.icon} ${focusedSkillObj.name}</span>
                <span class="focused-level-badge">Nv. ${currentSkillLvl}</span>
              </div>
              <span class="focused-skill-weapon">${focusedSkillObj.equipmentName}</span>
            </div>
          </div>
          <div class="focused-skill-status-area">
            ${isTrainingThisSkill ? `
              <span class="training-live-badge active">
                <span class="pulse-beacon"></span> Treinando Online Agora
              </span>
            ` : isTrainingOtherSkill ? `
              <span class="training-live-badge other">
                ⚠️ Treinando Outra Skill (${activeSkillObj?.name})
              </span>
            ` : `
              <span class="training-live-badge idle">
                🎯 Habilidade Focada
              </span>
            `}
            <div class="focused-level-target">
              <span class="lvl-current">Nv. ${currentSkillLvl}</span>
              <span class="lvl-arrow">➔</span>
              <span class="lvl-next">Nv. ${currentSkillLvl + 1}</span>
            </div>
          </div>
        </div>

        <!-- Barra de Progresso Focada de XP -->
        <div class="focused-xp-section">
          <div class="focused-xp-topline">
            <div class="focused-xp-nums">
              <span class="focused-xp-label">Pontos de Treino (XP da Habilidade):</span>
              <strong class="focused-xp-count">${needed > 0 ? `${progress.toLocaleString('pt-BR')} / ${needed.toLocaleString('pt-BR')} XP` : `${progress.toLocaleString('pt-BR')} XP`}</strong>
            </div>
            <div class="focused-xp-pct-pill">${percent}%</div>
          </div>

          <div class="focused-xp-bar-bg" title="Progresso atual: ${percent}% (${progress.toLocaleString('pt-BR')} / ${needed.toLocaleString('pt-BR')} XP)">
            <div class="focused-xp-bar-fill" style="width: ${percent}%">
              <div class="focused-xp-bar-glow"></div>
            </div>
          </div>

          <div class="focused-xp-bottomline">
            <span class="focused-xp-remaining">
              ${needed > 0 ? `🎯 Faltam <strong>${remaining.toLocaleString('pt-BR')} XP</strong> para alcançar o nível <strong>${currentSkillLvl + 1}</strong>` : `Aguardando atualização de dados do jogo...`}
            </span>
            <span class="focused-xp-target-tag">Meta: Nv. ${currentSkillLvl + 1}</span>
          </div>
        </div>

        <!-- Comparativo de Tempo até o Próximo Nível (Online vs Arma de Exercício) -->
        <div class="training-eta-comparison-grid">
          <!-- Card 1: Treino Online (Boneco Regular) -->
          <div class="eta-mode-card online ${isTrainingThisSkill && !training.exercise ? 'current-active' : ''}">
            <div class="eta-mode-header">
              <div class="eta-mode-icon">🥋</div>
              <div class="eta-mode-title-wrap">
                <span class="eta-mode-title">Treino Online (Dummy)</span>
                <span class="eta-mode-sub">Boneco público na cidade</span>
              </div>
              ${isTrainingThisSkill && !training.exercise ? `<span class="eta-badge-active">Ativo Agora</span>` : `<span class="eta-badge-free">Grátis</span>`}
            </div>

            <div class="eta-time-display">
              <span class="eta-time-val">${formattedOnlineEta}</span>
              <span class="eta-time-sub">estimado até o nível ${currentSkillLvl + 1}</span>
            </div>

            <div class="eta-details-list">
              <div class="eta-detail-item">
                <span class="eta-detail-label">Tempo Necessário:</span>
                <span class="eta-detail-val"><strong>${formattedOnlineEta}</strong></span>
              </div>
              <div class="eta-detail-item">
                <span class="eta-detail-label">Ritmo de Ataque:</span>
                <span class="eta-detail-val">1 golpe a cada 2s (1x)</span>
              </div>
              <div class="eta-detail-item">
                <span class="eta-detail-label">Custo:</span>
                <span class="eta-detail-val text-green">100% Gratuito (0 gp)</span>
              </div>
              <div class="eta-detail-item">
                <span class="eta-detail-label">Consumo de Arma:</span>
                <span class="eta-detail-val">Nenhum (Ilimitado)</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Arma de Exercício (Item Específico) -->
          <div class="eta-mode-card exercise ${isTrainingThisSkill && training.exercise ? 'current-active' : ''}">
            <div class="eta-mode-header">
              <div class="eta-mode-icon">⚡</div>
              <div class="eta-mode-title-wrap">
                <span class="eta-mode-title">Arma de Treino (Item)</span>
                <span class="eta-mode-sub">${focusedSkillObj.equipmentName}</span>
              </div>
              <span class="eta-badge-fast">~6.5x Mais Rápido</span>
            </div>

            <div class="eta-time-display">
              <span class="eta-time-val fast">${formattedExerciseEta}</span>
              <span class="eta-time-sub">estimado até o nível ${currentSkillLvl + 1}</span>
            </div>

            <div class="eta-details-list">
              <div class="eta-detail-item">
                <span class="eta-detail-label">Tempo Necessário:</span>
                <span class="eta-detail-val text-gold"><strong>${formattedExerciseEta}</strong> (~6.5x mais rápido)</span>
              </div>
              <div class="eta-detail-item">
                <span class="eta-detail-label">Cargas Necessárias:</span>
                <span class="eta-detail-val">~${exerciseCharges.toLocaleString('pt-BR')} cargas</span>
              </div>
              <div class="eta-detail-item">
                <span class="eta-detail-label">Equivalente em Armas:</span>
                <span class="eta-detail-val">~${weaponsCount500} armas (500 charges)</span>
              </div>
              <div class="eta-detail-item">
                <span class="eta-detail-label">Modo:</span>
                <span class="eta-detail-val">Avanço massivo por golpe</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Banner Comparativo de Economia de Tempo -->
        <div class="eta-comparison-banner">
          <span class="comparison-banner-icon">💡</span>
          <div class="comparison-banner-text">
            <strong>Diferença de ritmo:</strong> O treino com a arma de exercício (<strong>${focusedSkillObj.equipmentName}</strong>) leva apenas <strong>${formattedExerciseEta}</strong>, economizando cerca de <strong>${formattedTimeSaved}</strong> em comparação ao boneco público gratuito (<strong>${formattedOnlineEta}</strong>).
          </div>
        </div>

        <!-- Botões de Ação para Iniciar ou Parar o Treino -->
        <div class="focused-action-row">
          ${isTrainingThisSkill ? `
            <button type="button" class="btn-danger btn-training-action" onclick="stopTraining(${slot.id})">
              ⏹️ Parar Treino Online (${focusedSkillObj.name})
            </button>
          ` : isTrainingOtherSkill ? `
            <button type="button" class="btn-primary btn-training-action" onclick="startOnlineTraining(${slot.id}, '${focusedSkillObj.id}')">
              🔄 Alternar Treino Online para ${focusedSkillObj.name}
            </button>
            <button type="button" class="btn-secondary btn-training-stop-alt" onclick="stopTraining(${slot.id})">
              ⏹️ Parar Treino de ${activeSkillObj?.name}
            </button>
          ` : `
            <button type="button" class="btn-primary btn-training-action" onclick="startOnlineTraining(${slot.id}, '${focusedSkillObj.id}')">
              🥋 Iniciar Treino Online (${focusedSkillObj.name})
            </button>
          `}
        </div>
      </div>

      <div class="picker-label" style="margin-top: 8px; margin-bottom: 6px;">
        Clique em qualquer uma das 6 habilidades para inspecionar ou treinar:
      </div>

      <!-- Grid com os 6 equipamentos de treino -->
      <div class="training-equipment-grid">
        ${HUNTERA_TRAINING_SKILLS.map((sk) => {
          const isSelected = focusedSkillId === sk.id;
          const isTrainingThis = training.active && training.skill === sk.id;
          const skData = skills.find(s => s.id === sk.id);
          const lvl = skData ? skData.level : (sk.id === 'magic' ? (char.magicLevel || sess.magicLevel || 0) : 10);
          const pct = skData ? skData.percent : 0;

          return `
            <div class="training-equip-card ${isSelected ? 'selected' : ''} ${isTrainingThis ? 'training-now' : ''}"
                 onclick="selectTrainingSkill(${slot.id}, '${sk.id}')">
              <div class="equip-icon-wrap">
                <img class="equip-item-img"
                     src="/api/item-icon?name=${encodeURIComponent(sk.equipmentName)}&id=${sk.itemId}"
                     alt="${sk.equipmentName}"
                     onerror="handleItemImageError(this)" />
              </div>
              <div class="equip-info-wrap">
                <div class="equip-name-row">
                  <span class="equip-skill-name">${sk.icon} ${sk.name}</span>
                  <span class="equip-skill-lvl">Nv. ${lvl}</span>
                </div>
                <div class="equip-weapon-name">${sk.equipmentName}</div>
                <div class="equip-progress-bar-bg" title="Progresso atual: ${pct}%">
                  <div class="equip-progress-bar-fill" style="width: ${pct}%"></div>
                </div>
                <div class="equip-card-footer">
                  <span class="equip-pct-label">${pct}%</span>
                  ${isTrainingThis ? `
                    <span class="equip-training-tag">Ativo ⚔️</span>
                  ` : isSelected ? `
                    <span class="equip-selected-tag">Focado 🎯</span>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDeathView(slot) {
  const char = slot.character || { name: 'Personagem', level: 1, vocation: 'none' };
  const icon = VOCATION_ICONS[char.vocation?.toLowerCase()] || '⚔️';
  const sess = slot.session || {};
  const death = sess.deathInfo || {};
  const avatarUrl = getCharacterAvatarUrl(char);

  const killer = death.killer || 'Inimigo';
  const where = death.where || 'Calabouço';
  const lostXp = death.lostExperience ?? 0;
  const lostLevels = death.lostLevels ?? 0;
  const skillsLost = Array.isArray(death.skillsLost) ? death.skillsLost : [];
  const hits = Array.isArray(death.hits) ? death.hits : [];
  const blessingsSpent = death.blessingsSpent ?? (death.blessings ? death.blessings.length : 0);
  const freeBless = death.freeBless || (sess.blessings?.freeUntilLevel && char.level <= sess.blessings.freeUntilLevel);
  const lostItems = Array.isArray(death.lostItems) ? death.lostItems : [];

  const diedTimeStr = death.diedAt ? new Date(death.diedAt).toLocaleTimeString('pt-BR') : 'recente';

  return `
    <!-- Banner de Morte do Personagem (Sem vitals HP/Mana pois está morto) -->
    <div class="char-banner death-banner">
      <div class="char-avatar-box dead">
        <img class="char-avatar-img dead-avatar"
             src="${avatarUrl}"
             alt="${char.name}"
             onerror="handleAvatarError(this, '${char.vocation || 'none'}')" />
        <span class="skull-overlay-icon">☠️</span>
      </div>
      <div class="char-details">
        <div class="char-title-row">
          <span class="char-name">${char.name}</span>
          <span class="char-level-badge dead-badge">Nv. ${char.level}</span>
          <span class="death-status-chip">☠️ Derrotado em Combate</span>
        </div>
        <div class="char-vocation-row">
          <span class="vocation-icon">${icon}</span>
          <span class="vocation-name">${formatVocation(char.vocation)}</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
        <button class="btn-secondary btn-logout" data-slot="${slot.id}" title="Desconectar">Sair</button>
      </div>
    </div>

    <!-- Painel de Morte (Layout Original Ajustado) -->
    <div class="death-screen-view">
      <div class="death-screen-header">
        <div class="death-hero-icon">☠️</div>
        <h2 class="death-hero-title">VOCÊ MORREU</h2>
        <p class="death-hero-sub">Seu personagem caiu em combate nas mãos de <strong>${killer}</strong> em <strong>${where}</strong>.</p>
      </div>

      <!-- Resumo Principal da Morte: Perda de XP e Níveis -->
      <div class="death-kpi-grid">
        <div class="death-kpi-card xp-loss">
          <div class="death-kpi-label">Experiência Perdida</div>
          <div class="death-kpi-val">-${lostXp.toLocaleString('pt-BR')} XP</div>
          <div class="death-kpi-sub">
            ${death.experienceBefore && death.experienceAfter ? `
              XP: ${death.experienceBefore.toLocaleString('pt-BR')} ➔ ${death.experienceAfter.toLocaleString('pt-BR')}
            ` : 'Penalidade de morte calculada'}
          </div>
        </div>

        <div class="death-kpi-card level-loss">
          <div class="death-kpi-label">Regressão de Nível</div>
          <div class="death-kpi-val">${lostLevels > 0 ? `-${lostLevels} Nível` : '0 Níveis'}</div>
          <div class="death-kpi-sub">
            ${death.levelBefore && death.levelAfter ? `
              Nv. ${death.levelBefore} ➔ Nv. ${death.levelAfter}
            ` : `Nível Atual: ${char.level}`}
          </div>
        </div>
      </div>

      <!-- Detalhes da Morte -->
      <div class="death-details-card">
        <div class="death-detail-row">
          <span class="detail-label">🗡️ Causa da Morte:</span>
          <span class="detail-value highlight">Morto por <strong>${killer}</strong></span>
        </div>
        <div class="death-detail-row">
          <span class="detail-label">📍 Local da Morte:</span>
          <span class="detail-value">${where} (às ${diedTimeStr})</span>
        </div>

        <div class="death-detail-row">
          <span class="detail-label">🥋 Habilidades (Skills):</span>
          <span class="detail-value">
            ${skillsLost.length > 0
              ? skillsLost.map((s) => `<strong>${s.skill}</strong>: ${s.before} ➔ ${s.after}`).join(', ')
              : 'Nenhuma habilidade regredida'}
          </span>
        </div>

        <div class="death-detail-row">
          <span class="detail-label">🛡️ Bênçãos (Blessings):</span>
          <span class="detail-value">
            ${blessingsSpent > 0 ? `
              ${blessingsSpent} bênção(s) consumida(s) nesta morte.
            ` : 'Nenhuma bênção estava ativa no momento da morte.'}
            ${freeBless ? `<span class="temple-free-pill">✨ Bênção Gratuita do Templo (< Nv. 80)</span>` : ''}
          </span>
        </div>

        <div class="death-detail-row">
          <span class="detail-label">🎒 Equipamentos e Itens:</span>
          <span class="detail-value">
            ${lostItems.length > 0 ? `
              Perdidos: ${lostItems.map((i) => i.name).join(', ')}
            ` : '✅ Nenhum item perdido (equipamentos protegidos).'}
          </span>
        </div>
      </div>

      <!-- Combat Log: Últimos Golpes Recebidos -->
      ${hits.length > 0 ? `
        <div class="death-hits-card">
          <div class="death-hits-header">
            <span>⚔️ Últimos Golpes Sofridos (${hits.length} hits)</span>
          </div>
          <div class="death-hits-list">
            ${hits.slice(-6).reverse().map((h) => `
              <div class="death-hit-item">
                <span class="hit-source">${h.source || killer}</span>
                <span class="hit-damage">-${h.amount} dano</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Ações: Botão para Reviver -->
      <div class="death-actions-card">
        <button type="button" class="btn-primary btn-revive-main" onclick="reviveSlot(${slot.id})">
          ⚰️ Reviver Personagem
        </button>
        <p class="death-revive-hint">
          Renasça no templo da cidade. Lá você poderá comprar bênçãos para se proteger e retornar às caçadas.
        </p>
      </div>
    </div>
  `;
}

function attachDeathHandlers(slotId) {
  const btnLogout = document.querySelector(`.btn-logout[data-slot="${slotId}"]`);
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetch(`/api/slots/${slotId}/logout`, { method: 'POST' });
    });
  }
}

function renderHuntingView(slot) {
  const char = slot.character || { name: 'Gatonet', level: 1, vocation: 'none' };
  const icon = VOCATION_ICONS[char.vocation?.toLowerCase()] || '⚔️';
  const sess = slot.session || {};
  const huntTitle = sess.huntName || sess.huntId || 'Caçada Ativa';

  const balanceSign = (sess.balance || 0) >= 0 ? '+' : '';
  const balanceClass = (sess.balance || 0) >= 0 ? 'positive' : 'negative';

  const avatarUrl = getCharacterAvatarUrl(char);
  const colors = char.outfitColors || {};

  const currentSubTab = state.slotSubTabs[slot.id - 1] || 'monsters';
  const suppliesList = sess.suppliesUsed || [];
  const lootList = sess.loot || [];
  const invItems = sess.inventory?.backpack || [];
  const skillsList = sess.skills || [];
  const totalKills = sess.monsterDeaths || 0;
  const activeActionBarCount = (sess.actionBar?.slots || []).filter(Boolean).length;

  const rates = getSessionRates(sess);
  const balH = rates.balancePerHour || 0;
  const balHSign = balH >= 0 ? '+' : '-';
  const balHClass = balH >= 0 ? 'positive' : 'negative';
  const timeToNextStr = rates.timeToNextLevelFormatted || '--';
  const hasTimeEstimate = timeToNextStr !== '--' && timeToNextStr !== 'Calculando...';
  const timeToLevelBadge = hasTimeEstimate ? ` • ⏱ ~${timeToNextStr}` : '';
  const timeToLevelSub = hasTimeEstimate ? ` • ⏱ Próx: ${timeToNextStr}` : '';
  const hasInvite = Boolean(sess.partyInvite || sess.transferOffer);

  return `
    <!-- Mini Banner do Personagem -->
    <div class="char-banner hunting-banner">
      <div class="char-avatar-box sm">
        <img class="char-avatar-img"
             src="${avatarUrl}"
             alt="${char.name}"
             data-outfit-id="${char.outfitId || 128}"
             data-head="${colors.head ?? 0}"
             data-body="${colors.body ?? 0}"
             data-legs="${colors.legs ?? 0}"
             data-feet="${colors.feet ?? 0}"
             onerror="handleAvatarError(this, '${char.vocation || 'none'}')" />
      </div>
      <div class="char-details">
        <div class="char-title-row">
          <span class="char-name">${char.name}</span>
          <span class="char-level-badge">Nv. ${char.level}</span>
          <span class="char-gold-badge" title="Saldo total de moedas de ouro">💰 ${(sess.totalGold || 0).toLocaleString('pt-BR')} gp</span>
          ${sess.playerState?.staminaFormatted ? `
            <span class="char-stamina-badge stamina-${sess.playerState.staminaTier || 'orange'}" title="Stamina restante">⚡ ${sess.playerState.staminaFormatted}</span>
          ` : ''}
        </div>
        <div class="char-vocation-row">
          <span class="vocation-icon">${icon}</span>
          <span class="vocation-name">${formatVocation(char.vocation)}</span>
        </div>
        ${(sess.experienceNeeded || sess.experience) ? `
          <div class="char-xp-wrap" title="XP: ${(sess.experience || 0).toLocaleString('pt-BR')} / ${(sess.experienceNeeded || 0).toLocaleString('pt-BR')}">
            <div class="char-xp-bar-bg">
              <div class="char-xp-bar-fill" style="width: ${sess.xpPercent || 0}%"></div>
            </div>
            <div class="char-xp-labels">
              <span class="char-xp-pct">${sess.xpPercent || 0}%</span>
              <span class="char-xp-needed">Faltam ${(sess.remainingXp || 0).toLocaleString('pt-BR')} XP para Nv. ${(char.level || 1) + 1}${timeToLevelBadge}</span>
            </div>
          </div>
        ` : ''}
        ${renderVitalsHtml(sess, char)}
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
        <button type="button" class="btn-header-party" onclick="openPartyFriendsModal(${slot.id})" title="Ver Lista de Amigos e Party">
          👥 Amigos ${sess.party?.members?.length ? `<span class="party-badge-indicator in-party" title="${sess.party.members.length} membros na party">Party (${sess.party.members.length})</span>` : (sess.friends?.length ? `<span class="party-badge-indicator" title="${sess.friends.length} amigos">${sess.friends.length}</span>` : '')}
        </button>
        <button class="btn-danger btn-leave-hunt" data-slot="${slot.id}">🚪 Sair da Caçada</button>
      </div>
    </div>

    <!-- Banner de Convite Recebido no Próprio Slot -->
    <div id="slot-invite-banner-container-${slot.id}">
      ${renderSlotInviteBanner(slot.id, sess)}
    </div>

    <!-- Painel Ativo -->
    <div class="active-hunt-view">
      <div class="hunt-status-header">
        <div class="hunt-status-title">🗡️ ${huntTitle}</div>
        <div class="hunt-timer">⏱ ${sess.elapsedFormatted || '00s'}</div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-label">Lucro Líquido Total</span>
            <span class="kpi-rate-badge balance ${balHClass}" title="Taxa estimada por hora">${balHSign}${Math.abs(balH).toLocaleString('pt-BR')} gp/h</span>
          </div>
          <div class="kpi-val kpi-balance-val ${balanceClass}">${balanceSign}${(sess.balance || 0).toLocaleString('pt-BR')} gp</div>
          <div class="kpi-sub kpi-balance-sub">🪙 Gold: +${(sess.goldGainedInBag || 0).toLocaleString('pt-BR')} | 🎒 Itens: +${(sess.itemsValue || 0).toLocaleString('pt-BR')} | 🧪 Gastos: -${(sess.waste || 0).toLocaleString('pt-BR')}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-card-header">
            <span class="kpi-label">XP Acumulada</span>
            <span class="kpi-rate-badge xp" title="Taxa de experiência por hora">${(rates.xpPerHour || 0).toLocaleString('pt-BR')} XP/h</span>
          </div>
          <div class="kpi-val kpi-xp-val" style="color: var(--gold);">${(sess.experienceGained || 0).toLocaleString('pt-BR')}</div>
          <div class="kpi-sub kpi-xp-sub">Total de abates: ${totalKills}${timeToLevelSub}</div>
        </div>
      </div>

      <!-- Barra de Estimativas por Hora -->
      <div class="hourly-rates-bar">
        <div class="rate-card rate-balance" title="Saldo líquido total estimado por hora (Loot/h - Prejuízo/h)">
          <div class="rate-label">Total / Hora</div>
          <div class="rate-val ${balHClass}">${balHSign}${Math.abs(balH).toLocaleString('pt-BR')} gp/h</div>
        </div>
        <div class="rate-card rate-gold" title="Gold e drops brutos ganhos por hora">
          <div class="rate-label">Gold / Hora</div>
          <div class="rate-val positive">+${(rates.goldPerHour || 0).toLocaleString('pt-BR')} gp/h</div>
        </div>
        <div class="rate-card rate-waste" title="Prejuízo em suprimentos e poções por hora">
          <div class="rate-label">Prejuízo / Hora</div>
          <div class="rate-val negative">-${(rates.wastePerHour || 0).toLocaleString('pt-BR')} gp/h</div>
        </div>
        <div class="rate-card rate-time" title="Tempo estimado para atingir o próximo nível na taxa de XP atual">
          <div class="rate-label">Tempo Próx. Nível</div>
          <div class="rate-val time">⏱ ${timeToNextStr}</div>
        </div>
      </div>

      <!-- Sub-abas da Caçada -->
      <div class="hunt-subtabs" id="subtabs-${slot.id}">
        <button class="hunt-subtab-btn ${currentSubTab === 'monsters' ? 'active' : ''}" data-slot="${slot.id}" data-subtab="monsters">
          🗡️ Monstros <span class="subtab-badge" id="badge-monsters-${slot.id}">${totalKills}</span>
        </button>
        <button class="hunt-subtab-btn ${currentSubTab === 'actionbar' ? 'active' : ''}" data-slot="${slot.id}" data-subtab="actionbar">
          ⚡ Sequência <span class="subtab-badge" id="badge-actionbar-${slot.id}">${activeActionBarCount}</span>
        </button>
        <button class="hunt-subtab-btn ${currentSubTab === 'supplies' ? 'active' : ''}" data-slot="${slot.id}" data-subtab="supplies">
          🧪 Suprimentos <span class="subtab-badge" id="badge-supplies-${slot.id}">${suppliesList.length}</span>
        </button>
        <button class="hunt-subtab-btn ${currentSubTab === 'loot' ? 'active' : ''}" data-slot="${slot.id}" data-subtab="loot">
          🎁 Drops <span class="subtab-badge" id="badge-loot-${slot.id}">${lootList.length}</span>
        </button>
        <button class="hunt-subtab-btn ${currentSubTab === 'inventory' ? 'active' : ''}" data-slot="${slot.id}" data-subtab="inventory">
          🎒 Mochila <span class="subtab-badge" id="badge-inv-${slot.id}">${invItems.length}</span>
        </button>
        <button class="hunt-subtab-btn ${currentSubTab === 'skills' ? 'active' : ''}" data-slot="${slot.id}" data-subtab="skills">
          🥋 Habilidades <span class="subtab-badge" id="badge-skills-${slot.id}">${skillsList.length}</span>
        </button>
      </div>

      <!-- Conteúdo da Sub-aba Ativa -->
      <div class="subtab-content" id="subtab-content-${slot.id}" data-current-subtab="${currentSubTab}" data-subtab-hash="${getSubTabHash(currentSubTab, sess)}">
        ${renderSubTabContent(slot.id, currentSubTab, sess)}
      </div>
    </div>
  `;
}

function renderSubTabContent(slotId, subtab, sess) {
  if (subtab === 'monsters') {
    const killsList = sess.killsDetailed || Object.entries(sess.killsByName || {}).map(([name, count]) => ({
      name,
      count,
      bestiaryKills: null,
    }));

    if (killsList.length === 0) {
      return '<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 30px 0;">Aguardando primeiro abate...</div>';
    }

    return killsList.map((item) => `
      <div class="monster-item">
        <div class="monster-info-left">
          <span class="monster-name">• ${item.name}</span>
          ${item.bestiaryKills !== null && item.bestiaryKills !== undefined ? `
            <span class="monster-bestiary-tag" title="Total abatido no Bestiário (histórico da conta)">📖 ${item.bestiaryKills.toLocaleString('pt-BR')} no Bestiário</span>
          ` : ''}
        </div>
        <span class="monster-count">x${item.count}</span>
      </div>
    `).join('');
  }

  if (subtab === 'supplies') {
    const supplies = sess.suppliesUsed || [];
    if (supplies.length === 0) {
      return '<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 30px 0;">Nenhum suprimento gasto até o momento.</div>';
    }
    return supplies.map((sup) => {
      const cat = sup.category || 'potion';
      const catLabel = cat === 'potion' ? 'POT' : cat === 'rune' ? 'RUNE' : cat === 'arrow' ? 'ARROW' : 'SUP';
      return `
        <div class="item-row">
          <div class="item-left">
            <div class="item-icon-box">
              <img class="item-icon-img" src="/api/item-icon?name=${encodeURIComponent(sup.name || '')}&id=${sup.itemId || ''}" alt="${sup.name}" onerror="handleItemImageError(this)" />
            </div>
            <div>
              <span class="item-name">${sup.name}</span>
              <span class="item-category-tag ${cat}">${catLabel}</span>
            </div>
          </div>
          <div class="item-right">
            <span class="item-qty">x${sup.count}</span>
            <span class="item-price-sub">${sup.unitPrice} gp un. • ${(sup.totalCost || 0).toLocaleString('pt-BR')} gp</span>
          </div>
        </div>
      `;
    }).join('');
  }

  if (subtab === 'loot') {
    const loot = sess.loot || [];
    const mode = sess.priceMode || 'npc';
    const headerHtml = `
      <div class="loot-price-mode-bar">
        <span class="price-mode-label">Preço dos Drops:</span>
        <div class="price-mode-pills">
          <button type="button" class="price-pill ${mode === 'npc' ? 'active' : ''}" onclick="setSlotPriceMode(${slotId}, 'npc')" title="Preço oficial de venda a NPCs">🏛️ NPC</button>
          <button type="button" class="price-pill ${mode === 'auction' ? 'active' : ''}" onclick="setSlotPriceMode(${slotId}, 'auction')" title="Preço médio no Leilão/Mercado">🏷️ Leilão</button>
          <button type="button" class="price-pill ${mode === 'custom' ? 'active' : ''}" onclick="setSlotPriceMode(${slotId}, 'custom')" title="Definir seu próprio preço por item">✏️ Próprio</button>
        </div>
      </div>
    `;

    if (loot.length === 0) {
      return headerHtml + '<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 30px 0;">Nenhum drop registrado ainda.</div>';
    }

    return headerHtml + loot.map((item) => `
      <div class="item-row">
        <div class="item-left">
          <div class="item-icon-box">
            <img class="item-icon-img" src="/api/item-icon?name=${encodeURIComponent(item.name || '')}&id=${item.itemId || ''}" alt="${item.name}" onerror="handleItemImageError(this)" />
          </div>
          <div class="item-info-col">
            <span class="item-name">${item.name}</span>
            <span class="item-bag-badge ${item.inBag ? 'in-bag' : 'on-floor'}">${item.inBag ? '🎒 Na bag' : '📦 No chão'}</span>
          </div>
        </div>
        <div class="item-right">
          <span class="item-qty">x${item.count || 1}</span>
          ${mode === 'custom' ? `
            <div class="custom-price-wrap">
              <input type="number" class="custom-price-input" min="0" value="${item.unitValue || 0}"
                onchange="setSlotItemPrice(${slotId}, ${item.itemId}, this.value)"
                title="Definir preço unitário (gp)" />
              <span class="item-price-sub">gp un. • ${(item.value || 0).toLocaleString('pt-BR')} gp</span>
            </div>
          ` : `
            <span class="item-price-sub">${item.unitValue ? item.unitValue.toLocaleString('pt-BR') + ' gp un. • ' : ''}${(item.value || 0).toLocaleString('pt-BR')} gp</span>
          `}
        </div>
      </div>
    `).join('');
  }

  if (subtab === 'inventory') {
    const inv = sess.inventory || {};
    const items = inv.backpack || [];
    const gold = inv.gold || 0;
    return `
      <div class="inv-header">
        <span>Itens na Bolsa (${items.length})</span>
        <span class="inv-gold-badge">💰 ${gold.toLocaleString('pt-BR')} gp</span>
      </div>
      ${items.length === 0 ? '<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 20px 0;">Mochila vazia.</div>' : `
        <div class="inventory-grid">
          ${items.map((it) => `
            <div class="inv-slot" title="${it.name || 'Item'} (x${it.count || 1})">
              <img class="inv-slot-img" src="/api/item-icon?name=${encodeURIComponent(it.name || '')}&id=${it.itemId || ''}" alt="${it.name || ''}" onerror="handleItemImageError(this)" />
              ${(it.count || 1) > 1 ? `<span class="inv-count">${it.count}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    `;
  }

  if (subtab === 'skills') {
    const skills = sess.skills || [];
    if (skills.length === 0) {
      return '<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 30px 0;">Aguardando dados de habilidades...</div>';
    }
    return `
      <div class="skills-grid">
        ${skills.map((sk) => `
          <div class="skill-card">
            <div class="skill-header">
              <span class="skill-name">${sk.name}</span>
              <span class="skill-level">Nv. ${sk.level}</span>
            </div>
            <div class="skill-bar-wrap" title="${sk.progress.toLocaleString('pt-BR')} / ${sk.needed.toLocaleString('pt-BR')} (${sk.percent}%)">
              <div class="skill-bar-bg">
                <div class="skill-bar-fill" style="width: ${sk.percent}%"></div>
              </div>
            </div>
            <div class="skill-labels">
              <span class="skill-pct">${sk.percent}%</span>
              <span class="skill-remaining">Faltam ${sk.remaining.toLocaleString('pt-BR')} pts</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (subtab === 'actionbar') {
    return renderActionBarList(slotId, sess);
  }

  return '';
}

function updateHuntingMetrics(body, slot) {
  const sess = slot.session || {};
  const char = slot.character || {};

  const levelBadge = body.querySelector('.char-level-badge');
  if (levelBadge && char.level) {
    levelBadge.textContent = `Nv. ${char.level}`;
  }

  const goldBadge = body.querySelector('.char-gold-badge');
  if (goldBadge && sess.totalGold !== undefined) {
    goldBadge.textContent = `💰 ${(sess.totalGold || 0).toLocaleString('pt-BR')} gp`;
  }

  const staminaBadge = body.querySelector('.char-stamina-badge');
  if (staminaBadge && sess.playerState?.staminaFormatted) {
    staminaBadge.textContent = `⚡ ${sess.playerState.staminaFormatted}`;
    staminaBadge.className = `char-stamina-badge stamina-${sess.playerState.staminaTier || 'orange'}`;
  }

  const xpFill = body.querySelector('.char-xp-bar-fill');
  if (xpFill && sess.xpPercent !== undefined) {
    xpFill.style.width = `${sess.xpPercent || 0}%`;
  }
  const xpPct = body.querySelector('.char-xp-pct');
  if (xpPct && sess.xpPercent !== undefined) {
    xpPct.textContent = `${sess.xpPercent || 0}%`;
  }

  // Atualiza vitais de HP e Mana durante a caçada
  const pState = sess.playerState || {};
  const hp = typeof pState.hp === 'number' ? pState.hp : (typeof char.hp === 'number' ? char.hp : 0);
  const maxHp = typeof pState.maxHp === 'number' ? pState.maxHp : (typeof char.maxHp === 'number' ? char.maxHp : (hp > 0 ? hp : 100));
  const mana = typeof pState.mana === 'number' ? pState.mana : (typeof char.mana === 'number' ? char.mana : 0);
  const maxMana = typeof pState.maxMana === 'number' ? pState.maxMana : (typeof char.maxMana === 'number' ? char.maxMana : (mana > 0 ? mana : 100));
  const hpPct = Math.min(100, Math.max(0, Math.round((hp / (maxHp || 1)) * 100)));
  const manaPct = Math.min(100, Math.max(0, Math.round((mana / (maxMana || 1)) * 100)));

  const hpBlock = body.querySelector('.hp-block');
  if (hpBlock) hpBlock.title = `Pontos de Vida: ${hp.toLocaleString('pt-BR')} / ${maxHp.toLocaleString('pt-BR')} (${hpPct}%)`;
  const hpNum = body.querySelector('.char-hp-num');
  const hpFill = body.querySelector('.char-hp-fill');
  if (hpNum) hpNum.textContent = `${hp.toLocaleString('pt-BR')} / ${maxHp.toLocaleString('pt-BR')}`;
  if (hpFill) hpFill.style.width = `${hpPct}%`;

  const manaBlock = body.querySelector('.mana-block');
  if (manaBlock) manaBlock.title = `Mana: ${mana.toLocaleString('pt-BR')} / ${maxMana.toLocaleString('pt-BR')} (${manaPct}%)`;
  const manaNum = body.querySelector('.char-mana-num');
  const manaFill = body.querySelector('.char-mana-fill');
  if (manaNum) manaNum.textContent = `${mana.toLocaleString('pt-BR')} / ${maxMana.toLocaleString('pt-BR')}`;
  if (manaFill) manaFill.style.width = `${manaPct}%`;

  const friendsBtn = body.querySelector('.btn-header-party');
  if (friendsBtn) {
    friendsBtn.innerHTML = `👥 Amigos ${sess.party?.members?.length ? `<span class="party-badge-indicator in-party" title="${sess.party.members.length} membros na party">Party (${sess.party.members.length})</span>` : (sess.friends?.length ? `<span class="party-badge-indicator" title="${sess.friends.length} amigos">${sess.friends.length}</span>` : '')}`;
  }

  const bannerContainer = body.querySelector(`#slot-invite-banner-container-${slot.id}`);
  if (bannerContainer) {
    const newBannerHtml = renderSlotInviteBanner(slot.id, sess);
    if (bannerContainer.innerHTML.trim() !== newBannerHtml.trim()) {
      bannerContainer.innerHTML = newBannerHtml;
    }
  }
  const rates = getSessionRates(sess);
  const balH = rates.balancePerHour || 0;
  const balHSign = balH >= 0 ? '+' : '-';
  const balHClass = balH >= 0 ? 'positive' : 'negative';
  const timeToNextStr = rates.timeToNextLevelFormatted || '--';
  const hasTimeEstimate = timeToNextStr !== '--' && timeToNextStr !== 'Calculando...';

  const xpNeeded = body.querySelector('.char-xp-needed');
  if (xpNeeded && sess.remainingXp !== undefined) {
    const timeBadge = hasTimeEstimate ? ` • ⏱ ~${timeToNextStr}` : '';
    xpNeeded.textContent = `Faltam ${(sess.remainingXp || 0).toLocaleString('pt-BR')} XP para Nv. ${(char.level || 1) + 1}${timeBadge}`;
  }

  const timer = body.querySelector('.hunt-timer');
  if (timer) {
    timer.textContent = `⏱ ${sess.elapsedFormatted || '00s'}`;
  }

  const balanceEl = body.querySelector('.kpi-balance-val');
  if (balanceEl) {
    const bal = sess.balance || 0;
    balanceEl.textContent = `${bal >= 0 ? '+' : ''}${bal.toLocaleString('pt-BR')} gp`;
    balanceEl.className = `kpi-val kpi-balance-val ${bal >= 0 ? 'positive' : 'negative'}`;
  }

  // Atualiza badge de taxa no card de Lucro
  const balanceRateBadge = body.querySelector('.kpi-card .kpi-rate-badge.balance');
  if (balanceRateBadge) {
    balanceRateBadge.textContent = `${balHSign}${Math.abs(balH).toLocaleString('pt-BR')} gp/h`;
    balanceRateBadge.className = `kpi-rate-badge balance ${balHClass}`;
  }

  const balanceSub = body.querySelector('.kpi-balance-sub');
  if (balanceSub) {
    balanceSub.textContent = `🪙 Gold: +${(sess.goldGainedInBag || 0).toLocaleString('pt-BR')} | 🎒 Itens: +${(sess.itemsValue || 0).toLocaleString('pt-BR')} | 🧪 Gastos: -${(sess.waste || 0).toLocaleString('pt-BR')}`;
  }

  // Atualiza badge de taxa no card de XP
  const xpRateBadge = body.querySelector('.kpi-card .kpi-rate-badge.xp');
  if (xpRateBadge) {
    xpRateBadge.textContent = `${(rates.xpPerHour || 0).toLocaleString('pt-BR')} XP/h`;
  }

  const xpEl = body.querySelector('.kpi-xp-val');
  if (xpEl) {
    xpEl.textContent = (sess.experienceGained || 0).toLocaleString('pt-BR');
  }

  const xpSub = body.querySelector('.kpi-xp-sub');
  if (xpSub) {
    const timeSub = hasTimeEstimate ? ` • ⏱ Próx: ${timeToNextStr}` : '';
    xpSub.textContent = `Total de abates: ${sess.monsterDeaths || 0}${timeSub}`;
  }

  // Atualiza os valores da barra de taxas por hora
  const rateBalanceVal = body.querySelector('.hourly-rates-bar .rate-balance .rate-val');
  if (rateBalanceVal) {
    rateBalanceVal.textContent = `${balHSign}${Math.abs(balH).toLocaleString('pt-BR')} gp/h`;
    rateBalanceVal.className = `rate-val ${balHClass}`;
  }

  const rateGoldVal = body.querySelector('.hourly-rates-bar .rate-gold .rate-val');
  if (rateGoldVal) {
    rateGoldVal.textContent = `+${(rates.goldPerHour || 0).toLocaleString('pt-BR')} gp/h`;
  }

  const rateWasteVal = body.querySelector('.hourly-rates-bar .rate-waste .rate-val');
  if (rateWasteVal) {
    rateWasteVal.textContent = `-${(rates.wastePerHour || 0).toLocaleString('pt-BR')} gp/h`;
  }

  const rateTimeVal = body.querySelector('.hourly-rates-bar .rate-time .rate-val');
  if (rateTimeVal) {
    rateTimeVal.textContent = `⏱ ${timeToNextStr}`;
  }

  // Atualiza badges das sub-abas
  const badgeMonsters = body.querySelector(`#badge-monsters-${slot.id}`);
  if (badgeMonsters) badgeMonsters.textContent = sess.monsterDeaths || 0;

  const badgeActionbar = body.querySelector(`#badge-actionbar-${slot.id}`);
  if (badgeActionbar) badgeActionbar.textContent = (sess.actionBar?.slots || []).filter(Boolean).length;

  const badgeSupplies = body.querySelector(`#badge-supplies-${slot.id}`);
  if (badgeSupplies) badgeSupplies.textContent = sess.suppliesUsed?.length || 0;

  const badgeLoot = body.querySelector(`#badge-loot-${slot.id}`);
  if (badgeLoot) badgeLoot.textContent = sess.loot?.length || 0;

  const badgeInv = body.querySelector(`#badge-inv-${slot.id}`);
  if (badgeInv) badgeInv.textContent = sess.inventory?.backpack?.length || 0;

  const badgeSkills = body.querySelector(`#badge-skills-${slot.id}`);
  if (badgeSkills) badgeSkills.textContent = sess.skills?.length || 0;

  // Atualiza conteúdo da sub-aba ativa se estiver visível, sem sobrescrever se usuário estiver digitando preço custom ou configurando modal
  const contentEl = body.querySelector(`#subtab-content-${slot.id}`);
  const currentSubTab = state.slotSubTabs[slot.id - 1] || 'monsters';
  const isModalOpen = document.getElementById('actionbar-modal')?.style.display !== 'none';
  if (contentEl) {
    const activeEl = document.activeElement;
    const isEditingCustomPrice = activeEl && activeEl.classList.contains('custom-price-input') && contentEl.contains(activeEl);
    if (!isEditingCustomPrice && !isModalOpen) {
      const newHash = getSubTabHash(currentSubTab, sess);
      const prevHash = contentEl.dataset.subtabHash;
      const prevSubTab = contentEl.dataset.currentSubtab;

      if (prevSubTab !== currentSubTab || prevHash !== newHash) {
        const prevScroll = contentEl.scrollTop;
        contentEl.innerHTML = renderSubTabContent(slot.id, currentSubTab, sess);
        contentEl.scrollTop = prevScroll;
        contentEl.dataset.subtabHash = newHash;
        contentEl.dataset.currentSubtab = currentSubTab;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

function attachLoginHandler(slotId) {
  const form = document.getElementById(`form-login-${slotId}`);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (form.username?.value || form.email?.value || '').trim();
    const password = form.password ? form.password.value : '';

    const slot = state.slots[slotId - 1];
    if (slot) slot.status = 'logging_in';
    renderSlot({ id: slotId, status: 'logging_in' });

    try {
      const resp = await fetch(`/api/slots/${slotId}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Falha ao autenticar.');
      }
      if (Array.isArray(data.catalog) && data.catalog.length > 0) {
        state.catalogs[slotId - 1] = data.catalog;
        if (!state.selectedHunts[slotId - 1]) {
          state.selectedHunts[slotId - 1] = data.catalog[0].id ?? data.catalog[0].huntId;
        }
      }
      state.slots[slotId - 1] = data;
      renderSlot(data);
    } catch (err) {
      if (slot) {
        slot.status = 'idle';
        slot.errorMessage = err.message;
        renderSlot(slot);
      }
    }
  });
}

function attachConnectedHandlers(slotId) {
  const idx = slotId - 1;
  const select = document.getElementById(`select-hunt-${slotId}`);
  const btnStart = document.querySelector(`.btn-start-hunt[data-slot="${slotId}"]`);
  const btnLogout = document.querySelector(`.btn-logout[data-slot="${slotId}"]`);

  if (select) {
    select.addEventListener('change', () => {
      state.selectedHunts[idx] = select.value;
      state.selectedTiers[idx] = 0; // reset to cautious on hunt change
      renderSlot(state.slots[idx]);
    });
  }

  document.querySelectorAll(`.tier-pill[data-slot="${slotId}"]`).forEach((pill) => {
    pill.addEventListener('click', () => {
      state.selectedTiers[idx] = parseInt(pill.dataset.tier, 10);
      document.querySelectorAll(`.tier-pill[data-slot="${slotId}"]`).forEach((p) => p.classList.remove('selected'));
      pill.classList.add('selected');
    });
  });

  if (btnStart) {
    btnStart.addEventListener('click', async () => {
      const huntId = state.selectedHunts[idx];
      const tier = state.selectedTiers[idx] || 0;
      if (!huntId) return;

      btnStart.disabled = true;
      btnStart.textContent = 'Iniciando...';

      try {
        await fetch(`/api/slots/${slotId}/hunt/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ huntId, tier }),
        });
      } catch (err) {
        alert('Erro ao iniciar caçada: ' + err.message);
        btnStart.disabled = false;
        btnStart.textContent = '⚔️ Começar Caçada';
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetch(`/api/slots/${slotId}/logout`, { method: 'POST' });
    });
  }
}

function attachHuntingHandlers(slotId) {
  const btnLeave = document.querySelector(`.btn-leave-hunt[data-slot="${slotId}"]`);
  if (btnLeave) {
    btnLeave.addEventListener('click', async () => {
      btnLeave.disabled = true;
      btnLeave.textContent = '🚪 Saindo (5s)...';

      try {
        await fetch(`/api/slots/${slotId}/hunt/leave`, { method: 'POST' });
      } catch (err) {
        alert('Erro ao sair da caçada: ' + err.message);
        btnLeave.disabled = false;
        btnLeave.textContent = '🚪 Sair da Caçada';
      }
    });
  }

  // Sub-abas (Monstros, Suprimentos, Drops, Mochila)
  const subtabBtns = document.querySelectorAll(`.hunt-subtab-btn[data-slot="${slotId}"]`);
  subtabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const subtab = btn.dataset.subtab;
      state.slotSubTabs[slotId - 1] = subtab;
      subtabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const contentEl = document.getElementById(`subtab-content-${slotId}`);
      const slot = state.slots[slotId - 1];
      if (contentEl && slot && slot.session) {
        contentEl.innerHTML = renderSubTabContent(slotId, subtab, slot.session);
        contentEl.scrollTop = 0;
        contentEl.dataset.subtabHash = getSubTabHash(subtab, slot.session);
        contentEl.dataset.currentSubtab = subtab;
      }
    });
  });
}

function formatVocation(voc) {
  const v = (voc || '').toLowerCase();
  switch (v) {
    case 'knight': return 'Cavaleiro (Knight)';
    case 'paladin': return 'Paladino (Paladin)';
    case 'sorcerer': return 'Mago (Sorcerer)';
    case 'druid': return 'Druida (Druid)';
    default: return 'Sem Vocação';
  }
}

// ---------------------------------------------------------------------------
// Ações de Precificação de Drops (NPC, Leilão, Custom)
// ---------------------------------------------------------------------------

window.setSlotPriceMode = async function (slotId, mode) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/price-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    const data = await resp.json();
    if (data.session) {
      const idx = slotId - 1;
      if (state.slots[idx]) {
        state.slots[idx].session = data.session;
        renderSlot(state.slots[idx]);
      }
    }
  } catch (err) {
    console.error('Erro ao alternar modo de preço:', err);
  }
};

window.setSlotItemPrice = async function (slotId, itemId, price) {
  try {
    const numPrice = Math.max(0, parseInt(price, 10) || 0);
    const resp = await fetch(`/api/slots/${slotId}/item-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: Number(itemId), price: numPrice }),
    });
    const data = await resp.json();
    if (data.session) {
      const idx = slotId - 1;
      if (state.slots[idx]) {
        state.slots[idx].session = data.session;
        renderSlot(state.slots[idx]);
      }
    }
  } catch (err) {
    console.error('Erro ao definir preço do item:', err);
  }
};

// ---------------------------------------------------------------------------
// Ações de Sequência de Ações e Condições de Poções (Action Bar)
// ---------------------------------------------------------------------------

let currentModalType = 'potion';

window.toggleConnectedActionBar = function (slotId) {
  const panel = document.getElementById(`connected-actionbar-${slotId}`);
  if (!panel) return;
  const isHidden = panel.style.display === 'none';
  panel.style.display = isHidden ? 'block' : 'none';
};

window.openActionSlotModal = function (slotId, slotIndex) {
  const modal = document.getElementById('actionbar-modal');
  if (!modal) return;

  const slotData = state.slots[slotId - 1];
  const rule = slotData?.session?.actionBar?.slots?.[slotIndex] || null;

  document.getElementById('modal-slot-id').value = slotId;
  document.getElementById('modal-slot-index').value = slotIndex;
  document.getElementById('modal-slot-title').textContent = `⚡ Configurar Slot #${slotIndex + 1}`;

  // Determina o tipo e ID da ação
  let type = 'potion';
  let actionId = 'health-potion';
  if (rule) {
    if (rule.spellId) {
      type = 'spell';
      actionId = rule.spellId;
    } else if (rule.runeId) {
      type = 'rune';
      actionId = rule.runeId;
    } else if (rule.potionId) {
      type = 'potion';
      actionId = rule.potionId;
    }
  }

  selectActionType(type, actionId);

  // Enabled checkbox
  document.getElementById('modal-slot-enabled').checked = rule ? rule.enabled !== false : true;

  // Lista de condições
  const condList = document.getElementById('modal-conditions-list');
  condList.innerHTML = '';
  const conds = rule?.conditions || [];
  if (conds.length > 0) {
    conds.forEach((c) => addModalCondition(c));
  } else {
    // Adiciona uma condição padrão inteligente
    if (type === 'potion') {
      const isMana = actionId.includes('mana');
      addModalCondition({
        subject: 'player',
        attribute: isMana ? 'mana' : 'health',
        operator: '<=',
        value: isMana ? 50 : 60,
        percent: true,
      });
    } else if (type === 'rune') {
      addModalCondition({
        subject: 'area',
        attribute: 'targets',
        operator: '>=',
        value: 2,
        percent: false,
      });
    } else {
      addModalCondition({
        subject: 'player',
        attribute: 'health',
        operator: '<=',
        value: 70,
        percent: true,
      });
    }
  }

  modal.style.display = 'flex';
};

window.closeActionSlotModal = function () {
  const modal = document.getElementById('actionbar-modal');
  if (modal) modal.style.display = 'none';
};

window.selectActionType = function (type, selectedActionId) {
  currentModalType = type;
  const pills = document.querySelectorAll('#actionbar-modal .action-type-pills .type-pill');
  pills.forEach((p) => {
    if (p.getAttribute('data-type') === type) p.classList.add('active');
    else p.classList.remove('active');
  });

  const label = document.getElementById('modal-select-item-label');
  if (label) {
    label.textContent = type === 'potion' ? 'Selecione a Poção:' : type === 'rune' ? 'Selecione a Runa:' : 'Selecione o Feitiço / Spell:';
  }

  const select = document.getElementById('modal-action-item');
  if (!select) return;
  const options = ACTION_OPTIONS[type] || [];
  select.innerHTML = options.map((opt) => `
    <option value="${opt.id}">${opt.name}</option>
  `).join('');

  if (selectedActionId) {
    select.value = selectedActionId;
  }
};

window.addModalCondition = function (cond) {
  const condList = document.getElementById('modal-conditions-list');
  if (!condList) return;

  const row = document.createElement('div');
  row.className = 'condition-row';

  const attr = cond?.attribute || 'health';
  const op = cond?.operator || '<=';
  const val = cond?.value !== undefined ? cond.value : (attr === 'targets' ? 2 : 50);
  const isPercent = cond?.percent !== undefined ? cond.percent : (attr !== 'targets');

  row.innerHTML = `
    <select class="cond-attr-select" onchange="handleConditionAttrChange(this)">
      <option value="health" ${attr === 'health' ? 'selected' : ''}>❤️ Vida do Jogador</option>
      <option value="mana" ${attr === 'mana' ? 'selected' : ''}>🧪 Mana do Jogador</option>
      <option value="targets" ${attr === 'targets' ? 'selected' : ''}>👾 Monstros / Alvos na Tela</option>
    </select>
    <select class="cond-op-select">
      <option value="<=" ${op === '<=' ? 'selected' : ''}>&lt;= (Menor ou igual a)</option>
      <option value="<" ${op === '<' ? 'selected' : ''}>&lt; (Menor que)</option>
      <option value=">=" ${op === '>=' ? 'selected' : ''}>&gt;= (Maior ou igual a)</option>
      <option value=">" ${op === '>' ? 'selected' : ''}>&gt; (Maior que)</option>
      <option value="=" ${op === '=' ? 'selected' : ''}>= (Igual a)</option>
    </select>
    <input type="number" class="cond-val-input" min="0" max="10000" value="${val}" />
    <span class="cond-unit-label">${isPercent ? '%' : 'alvos'}</span>
    <button type="button" class="btn-remove-cond" onclick="removeModalCondition(this)" title="Remover condição">✕</button>
  `;

  condList.appendChild(row);
};

window.handleConditionAttrChange = function (select) {
  const row = select.closest('.condition-row');
  if (!row) return;
  const unitLabel = row.querySelector('.cond-unit-label');
  const valInput = row.querySelector('.cond-val-input');
  if (select.value === 'targets') {
    if (unitLabel) unitLabel.textContent = 'alvos';
    if (valInput && parseInt(valInput.value, 10) > 20) valInput.value = 2;
  } else {
    if (unitLabel) unitLabel.textContent = '%';
    if (valInput && parseInt(valInput.value, 10) > 100) valInput.value = 60;
  }
};

window.removeModalCondition = function (btn) {
  const row = btn.closest('.condition-row');
  if (row) row.remove();
};

window.submitSaveSlot = async function () {
  const slotId = parseInt(document.getElementById('modal-slot-id').value, 10) || 1;
  const slotIndex = parseInt(document.getElementById('modal-slot-index').value, 10) || 0;
  const actionItemId = document.getElementById('modal-action-item').value;
  const enabled = document.getElementById('modal-slot-enabled').checked;

  const condRows = document.querySelectorAll('#modal-conditions-list .condition-row');
  const conditions = Array.from(condRows).map((row) => {
    const attr = row.querySelector('.cond-attr-select')?.value || 'health';
    const op = row.querySelector('.cond-op-select')?.value || '<=';
    const val = parseInt(row.querySelector('.cond-val-input')?.value, 10) || 0;
    const isPercent = attr !== 'targets';
    const subject = attr === 'targets' ? 'area' : 'player';
    return {
      subject,
      attribute: attr,
      operator: op,
      value: val,
      percent: isPercent,
    };
  });

  const rule = {
    enabled,
    conditions,
  };

  if (currentModalType === 'potion') {
    rule.potionId = actionItemId;
  } else if (currentModalType === 'rune') {
    rule.runeId = actionItemId;
  } else if (currentModalType === 'spell') {
    rule.spellId = actionItemId;
  }

  try {
    const resp = await fetch(`/api/slots/${slotId}/action-bar/slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: slotIndex, rule }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao salvar slot: ${data.error || 'Falha no servidor'}`);
      return;
    }

    // Atualiza estado local
    const s = state.slots[slotId - 1];
    if (s && s.session) {
      if (!s.session.actionBar) s.session.actionBar = { slots: [] };
      if (!s.session.actionBar.slots) s.session.actionBar.slots = [];
      s.session.actionBar.slots[slotIndex] = rule;
      renderSlot(s);
    }

    closeActionSlotModal();
  } catch (err) {
    console.error('Erro ao salvar slot na Action Bar:', err);
    alert('Erro de conexão ao salvar regra de ação.');
  }
};

window.submitClearSlot = async function () {
  const slotId = parseInt(document.getElementById('modal-slot-id').value, 10) || 1;
  const slotIndex = parseInt(document.getElementById('modal-slot-index').value, 10) || 0;
  await clearActionSlot(slotId, slotIndex);
  closeActionSlotModal();
};

window.clearActionSlot = async function (slotId, slotIndex) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/action-bar/slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: slotIndex, rule: null }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao limpar slot: ${data.error || 'Falha no servidor'}`);
      return;
    }

    const s = state.slots[slotId - 1];
    if (s && s.session) {
      if (s.session.actionBar?.slots) {
        s.session.actionBar.slots[slotIndex] = null;
      }
      renderSlot(s);
    }
  } catch (err) {
    console.error('Erro ao limpar slot:', err);
    alert('Erro de conexão ao limpar regra de ação.');
  }
};

// ---------------------------------------------------------------------------
// Amigos & Party — Visão Global Unificada, Modais e Convites
// ---------------------------------------------------------------------------

let activePartyModalSlotId = null;
let activePartyModalTab = 'party'; // Padrão: Party Global

/**
 * Encontra a party mais completa e atualizada entre todos os slots conectados,
 * e identifica o slot que detém a liderança do grupo.
 */
function getGlobalPartyInfo() {
  let primaryParty = null;
  let leaderSlot = null;

  // 1. Procura a party ativa mais completa
  for (const s of state.slots) {
    const p = s?.session?.party;
    if (p && Array.isArray(p.members) && p.members.length > 0) {
      if (!primaryParty || (p.members.length > (primaryParty.members?.length || 0))) {
        primaryParty = p;
      }
    }
  }

  // 2. Se há uma party ativa, localiza se o líder está logado em algum dos slots da aplicação
  if (primaryParty && primaryParty.leaderId !== null && primaryParty.leaderId !== undefined) {
    const leaderMember = primaryParty.members?.find((m) => m.isLeader || m.id === primaryParty.leaderId);
    const leaderName = leaderMember?.name?.toLowerCase();

    leaderSlot = state.slots.find((s) => {
      if (s.status !== 'connected' && s.status !== 'hunting') return false;
      // 1. Por gamePlayerId
      if (s.session?.gamePlayerId && s.session.gamePlayerId === primaryParty.leaderId) return true;
      // 2. Por nome do personagem (case-insensitive) - garantia absoluta!
      if (leaderName && s.character?.name && s.character.name.toLowerCase() === leaderName) return true;
      // 3. Por character.id
      if (s.character?.id && s.character.id === primaryParty.leaderId) return true;
      return false;
    }) || null;
  }

  // Se o líder não estiver logado, encontra algum slot qualquer conectado na party como fallback de visualização
  const localPartySlot = state.slots.find((s) =>
    s?.session?.party?.members?.length > 0 &&
    (s.status === 'connected' || s.status === 'hunting')
  ) || null;

  // Lista de nomes de personagens locais para destacar quem pertence ao app
  const localCharNames = new Set(
    state.slots
      .filter((s) => s?.character?.name)
      .map((s) => s.character.name.toLowerCase())
  );

  return {
    party: primaryParty,
    leaderSlot,
    isLeaderLoggedIn: Boolean(leaderSlot),
    displaySlot: leaderSlot || localPartySlot,
    localCharNames,
    membersCount: primaryParty?.members?.length || 0,
  };
}

/**
 * Atualiza o banner horizontal fixo da party no topo e o badge do botão principal.
 */
function updateGlobalPartyBanner() {
  const { party, leaderSlot, isLeaderLoggedIn, membersCount } = getGlobalPartyInfo();
  const banner = document.getElementById('global-party-banner');
  const badge = document.getElementById('global-party-badge');

  if (badge) {
    badge.textContent = membersCount;
    badge.style.display = membersCount > 0 ? 'inline-block' : 'none';
  }

  if (!banner) return;

  if (!party || !party.members || party.members.length === 0) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  banner.style.display = 'flex';

  // Cálculos agregados da party
  const totalDps = party.members.reduce((acc, m) => acc + (m.dps || 0), 0);
  const totalHps = party.members.reduce((acc, m) => acc + (m.hps || 0), 0);
  const avgLevel = Math.round(party.members.reduce((acc, m) => acc + (m.level || 0), 0) / (party.members.length || 1));
  const sharedCosts = party.sharedCosts || {};
  const leaderMember = party.members.find((m) => m.isLeader);
  const leaderName = leaderMember?.name || 'Desconhecido';

  banner.innerHTML = `
    <div class="global-party-summary">
      <span class="party-tag-pill">🛡️ Party (${party.members.length} membros)</span>
      <span class="party-stat-pill" title="Líder do Grupo">Líder: <strong style="color: var(--gold);">${leaderName}</strong> ${isLeaderLoggedIn ? `<span style="color: var(--emerald); font-size: 10px;">(Slot ${leaderSlot.id})</span>` : '<span style="color: var(--ruby); font-size: 10px;">(Externo)</span>'}</span>
      <span class="party-stat-pill">Nível Médio: <strong>${avgLevel}</strong></span>
      ${totalDps > 0 ? `<span class="party-stat-pill" title="Dano por Segundo Total">DPS Total: <strong style="color: #ff7675;">${totalDps.toLocaleString('pt-BR')}</strong></span>` : ''}
      ${totalHps > 0 ? `<span class="party-stat-pill" title="Cura por Segundo Total">HPS Total: <strong style="color: #55efc4;">${totalHps.toLocaleString('pt-BR')}</strong></span>` : ''}
      ${sharedCosts.active ? `<span class="party-stat-pill" style="border-color: rgba(46, 204, 113, 0.4); color: var(--emerald);">💰 Custos Divididos</span>` : ''}
    </div>

    <div class="global-party-banner-members">
      ${party.members.map((m) => {
        const vocIcon = VOCATION_ICONS[m.vocation?.toLowerCase()] || '⚔️';
        const isLocal = state.slots.some((s) => s?.character?.name?.toLowerCase() === m.name.toLowerCase());
        return `
          <div class="banner-member-chip ${m.isLeader ? 'is-leader' : ''}" title="${m.name} (${formatVocation(m.vocation)} Nv.${m.level}) - HP: ${m.healthPercent || 100}% | MP: ${m.manaPercent || 100}%">
            <span>${vocIcon}</span>
            <span class="name">${m.name}${m.isLeader ? ' ⭐' : ''}${isLocal ? ' 👤' : ''}</span>
            <div class="hp-mini">
              <div class="hp-mini-fill" style="width: ${m.healthPercent || 100}%;"></div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: ${m.healthPercent < 40 ? 'var(--ruby)' : 'var(--text-dim)'};">${m.healthPercent || 100}%</span>
          </div>
        `;
      }).join('')}
    </div>

    <div>
      <button type="button" class="btn-open-party-global" onclick="openGlobalPartyModal()">
        ⚙️ Ver Party
      </button>
    </div>
  `;
}

window.openGlobalPartyModal = function () {
  const { leaderSlot, displaySlot } = getGlobalPartyInfo();
  // Se o líder está logado, a visão e os comandos obrigatoriamente partem dele
  const targetSlot = leaderSlot || displaySlot || state.slots.find((s) => s.status === 'connected' || s.status === 'hunting') || state.slots[0];
  openPartyFriendsModal(targetSlot ? targetSlot.id : 1, 'party');
};

window.openPartyFriendsModal = function (slotId, initialTab = 'friends') {
  const chosenSlot = (slotId ? state.slots[slotId - 1] : null) || state.slots.find((s) => s.status === 'connected' || s.status === 'hunting') || state.slots[0];
  activePartyModalSlotId = chosenSlot?.id || slotId || 1;
  activePartyModalTab = initialTab || 'friends';

  const modal = document.getElementById('party-friends-modal');
  if (!modal) return;

  const hiddenInput = document.getElementById('party-modal-slot-id');
  if (hiddenInput) hiddenInput.value = activePartyModalSlotId;

  switchPartyModalTab(activePartyModalTab);
  modal.style.display = 'flex';
  renderPartyModalContent();
};

window.closePartyFriendsModal = function () {
  const modal = document.getElementById('party-friends-modal');
  if (modal) modal.style.display = 'none';
};

window.switchPartyModalTab = function (tab) {
  activePartyModalTab = tab;
  const tabFriends = document.getElementById('tab-nav-friends');
  const tabParty = document.getElementById('tab-nav-party');
  const secFriends = document.getElementById('party-tab-friends-section');
  const secParty = document.getElementById('party-tab-party-section');

  if (tab === 'friends') {
    tabFriends?.classList.add('active');
    tabParty?.classList.remove('active');
    if (secFriends) secFriends.style.display = 'block';
    if (secParty) secParty.style.display = 'none';
  } else {
    tabParty?.classList.add('active');
    tabFriends?.classList.remove('active');
    if (secParty) secParty.style.display = 'block';
    if (secFriends) secFriends.style.display = 'none';
  }

  renderPartyModalContent();
};

function updateOpenPartyModal() {
  const modal = document.getElementById('party-friends-modal');
  if (modal && modal.style.display !== 'none') {
    renderPartyModalContent();
  }
}

function renderPartyModalContent() {
  const { party, leaderSlot, isLeaderLoggedIn, displaySlot, localCharNames } = getGlobalPartyInfo();
  // Se estivermos na aba de Party e houver líder logado, usa a perspectiva do líder.
  // Se estivermos na aba de Amigos (ou não houver líder), usa o slot específico selecionado.
  const selectedSlot = activePartyModalSlotId ? state.slots[activePartyModalSlotId - 1] : null;
  const friendsSlot = (selectedSlot && (selectedSlot.status === 'connected' || selectedSlot.status === 'hunting'))
    ? selectedSlot
    : (leaderSlot || displaySlot || state.slots.find((s) => s.status === 'connected' || s.status === 'hunting') || state.slots[0]);
  const effectiveSlot = (activePartyModalTab === 'party' && leaderSlot) ? leaderSlot : friendsSlot;
  const activeChar = effectiveSlot?.character;
  const effectiveSlotId = effectiveSlot?.id || 1;

  // Atualiza título do modal
  const modalTitle = document.getElementById('party-modal-title');
  if (modalTitle) {
    if (activePartyModalTab === 'friends') {
      modalTitle.textContent = activeChar ? `👥 Amigos VIP — ${activeChar.name} (Slot ${effectiveSlotId})` : `👥 Amigos VIP & Convidar`;
    } else if (party && isLeaderLoggedIn) {
      modalTitle.textContent = `🛡️ Gestão da Party — Líder: ${leaderSlot.character?.name} (Slot ${leaderSlot.id})`;
    } else if (party) {
      modalTitle.textContent = `🛡️ Grupo Global (Líder: ${party.members.find((m) => m.isLeader)?.name || 'Externo'})`;
    } else {
      modalTitle.textContent = `🛡️ Grupo Global & Amigos`;
    }
  }

  // Badges
  const friends = friendsSlot?.session?.friends || [];
  const friendsBadge = document.getElementById('party-modal-friends-count');
  if (friendsBadge) friendsBadge.textContent = friends.length;

  const partyBadge = document.getElementById('party-modal-party-count');
  if (partyBadge) partyBadge.textContent = party?.members?.length || 0;

  // Renderiza Lista de Amigos do slot do líder
  const friendsListEl = document.getElementById('modal-friends-list');
  if (friendsListEl) {
    if (friends.length === 0) {
      friendsListEl.innerHTML = `
        <div style="text-align: center; padding: 24px 0; color: var(--text-dim); font-size: 12px;">
          Nenhum amigo na lista VIP de ${activeChar?.name || 'este personagem'}.<br>Você pode convidar qualquer jogador pelo campo acima!
        </div>
      `;
    } else {
      friendsListEl.innerHTML = friends.map((f) => {
        const localSlot = state.slots.find((s) =>
          s.character?.name &&
          s.character.name.toLowerCase() === f.name.toLowerCase() &&
          (s.status === 'connected' || s.status === 'hunting')
        );
        const isOnline = Boolean(f.online) || Boolean(localSlot);
        const vocIcon = VOCATION_ICONS[f.vocation?.toLowerCase()] || '⚔️';
        const vocLabel = f.vocation ? formatVocation(f.vocation) : 'Aventureiro';
        const lvlLabel = f.level ? `Nv. ${f.level}` : '';
        const inCurrentParty = party?.members?.some((m) => m.name.toLowerCase() === f.name.toLowerCase());

        return `
          <div class="friend-card ${localSlot ? 'is-local-friend' : ''}">
            <div class="friend-info-left">
              <span class="friend-status-dot ${isOnline ? 'online' : ''}" title="${isOnline ? 'Online' : 'Offline'}"></span>
              <div class="friend-details-box">
                <span class="friend-name-text">
                  ${f.name}
                  ${localSlot ? `<span class="party-slot-tag" title="Conectado no Slot ${localSlot.id} do Idlex">Slot ${localSlot.id}</span>` : ''}
                </span>
                <span class="friend-meta-text">
                  <span>${vocIcon} ${vocLabel}</span>
                  ${lvlLabel ? `<span>• ${lvlLabel}</span>` : ''}
                  <span style="color: ${isOnline ? 'var(--emerald)' : 'var(--text-muted)'};">• ${isOnline ? 'Online' : 'Offline'}${localSlot ? ' (Idlex)' : ''}</span>
                </span>
              </div>
            </div>
            <div>
              ${inCurrentParty ? `
                <span style="font-size: 11px; color: var(--emerald); font-weight: 600; padding: 4px 8px;">Na Party ✓</span>
              ` : `
                <button type="button" class="btn-friend-invite" onclick="invitePlayerToParty(${effectiveSlotId}, '${f.name}')" title="Convidar ${f.name} para o grupo">
                  ➕ Convidar
                </button>
              `}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Renderiza Aba de Party Global
  const partyContentEl = document.getElementById('modal-party-content');
  if (!partyContentEl) return;

  if (!party || !party.members || party.members.length === 0) {
    partyContentEl.innerHTML = `
      <div style="text-align: center; padding: 36px 0; color: var(--text-dim); font-size: 13px;">
        <p style="font-size: 32px; margin-bottom: 8px;">🛡️</p>
        <p style="font-weight: 700; color: var(--text-main); margin-bottom: 4px; font-size: 15px;">Nenhum personagem está em Party no momento.</p>
        <p style="font-size: 12px; margin-bottom: 14px;">Você pode convidar seus personagens ou amigos para formarem um grupo juntos!</p>
        <div style="display: flex; justify-content: center; gap: 8px;">
          <button type="button" class="btn-primary" onclick="switchPartyModalTab('friends')">
            👥 Ver Lista de Amigos & Convidar
          </button>
        </div>
      </div>
    `;
    return;
  }

  const sharedCosts = party.sharedCosts || { active: false, offerPending: false };
  const totalDps = party.members.reduce((acc, m) => acc + (m.dps || 0), 0);
  const totalHps = party.members.reduce((acc, m) => acc + (m.hps || 0), 0);
  const totalDmg = party.members.reduce((acc, m) => acc + (m.damageTotal || 0), 0);
  const totalHeal = party.members.reduce((acc, m) => acc + (m.healTotal || 0), 0);
  const leaderMember = party.members.find((m) => m.isLeader);

  partyContentEl.innerHTML = `
    <div class="party-active-container">
      <!-- Cabeçalho da Party: Visão Oficial do Líder -->
      <div class="party-active-header">
        <div class="party-active-title">
          🛡️ Grupo Global (${party.members.length} Integrantes)
          ${isLeaderLoggedIn ? `
            <span class="party-leader-star" title="Visão Oficial do Líder">⭐ Visão do Líder (${leaderSlot.character?.name})</span>
          ` : `
            <span style="font-size: 10px; color: var(--ruby); background: rgba(231, 76, 60, 0.1); border: 1px solid rgba(231, 76, 60, 0.3); padding: 2px 8px; border-radius: 4px;">
              Líder (${leaderMember?.name || 'Outro'}) não está neste app
            </span>
          `}
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${party.members.some((m) => localCharNames.has(m.name.toLowerCase())) ? `
            <button type="button" class="btn-secondary" style="color: var(--ruby); border-color: rgba(231, 76, 60, 0.4); padding: 5px 10px; font-size: 11px;" onclick="leaveParty(${effectiveSlotId})" title="Sair do grupo">
              🚪 Sair da Party
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Configuração de Custos Compartilhados: APENAS se o Líder estiver logado na aplicação -->
      ${isLeaderLoggedIn ? `
        <div class="party-shared-costs-box">
          <div class="shared-costs-info">
            <div class="shared-costs-title">
              💰 Divisão de Suprimentos & Custos (Controle do Líder)
              <span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; ${sharedCosts.active ? 'background: rgba(46, 204, 113, 0.2); color: var(--emerald);' : 'background: rgba(255, 255, 255, 0.08); color: var(--text-dim);'}">
                ${sharedCosts.active ? 'ATIVO' : 'DESATIVADO'}
              </span>
            </div>
            <div class="shared-costs-sub">
              ${sharedCosts.active ? 'Os suprimentos consumidos durante a hunt serão ressarcidos antes do lucro ser dividido igualmente.' : 'A divisão automática de custos das poções e runas está desativada no momento.'}
            </div>
          </div>
          <div>
            ${sharedCosts.offerPending ? `
              <span style="font-size: 11px; color: var(--gold); font-weight: 700;">Proposta Pendente...</span>
            ` : `
              <button type="button" class="btn-secondary" style="font-size: 11px; padding: 5px 10px;" onclick="togglePartyCosts(${leaderSlot.id}, ${!sharedCosts.active})">
                ${sharedCosts.active ? 'Desativar Divisão' : 'Ativar Divisão de Custos'}
              </button>
            `}
          </div>
        </div>
      ` : ''}

      <!-- Resumo Total de Combate do Grupo -->
      ${(totalDps > 0 || totalHps > 0 || totalDmg > 0) ? `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: var(--bg-inner); border: 1px solid var(--border-subtle); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
          <div>
            <div style="font-size: 9px; color: var(--text-dim); text-transform: uppercase;">DPS Total</div>
            <div style="font-size: 13px; font-weight: 800; color: #ff7675; font-family: monospace;">${totalDps.toLocaleString('pt-BR')}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: var(--text-dim); text-transform: uppercase;">Dano Acumulado</div>
            <div style="font-size: 13px; font-weight: 800; color: var(--gold); font-family: monospace;">${totalDmg.toLocaleString('pt-BR')}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: var(--text-dim); text-transform: uppercase;">HPS Total</div>
            <div style="font-size: 13px; font-weight: 800; color: #55efc4; font-family: monospace;">${totalHps.toLocaleString('pt-BR')}</div>
          </div>
          <div>
            <div style="font-size: 9px; color: var(--text-dim); text-transform: uppercase;">Cura Acumulada</div>
            <div style="font-size: 13px; font-weight: 800; color: var(--sapphire); font-family: monospace;">${totalHeal.toLocaleString('pt-BR')}</div>
          </div>
        </div>
      ` : ''}

      <!-- Lista Detalhada de Todos os Membros da Party -->
      <div class="party-members-list">
        ${party.members.map((m) => {
          const vocIcon = VOCATION_ICONS[m.vocation?.toLowerCase()] || '⚔️';
          const localSlot = state.slots.find((s) => s.character?.name?.toLowerCase() === m.name.toLowerCase());

          // Formatação de stamina se disponível
          let staminaText = '';
          if (typeof m.staminaMinutes === 'number') {
            const h = Math.floor(m.staminaMinutes / 60);
            const min = m.staminaMinutes % 60;
            staminaText = `${h}h ${min < 10 ? '0' : ''}${min}m`;
          }

          return `
            <div class="party-member-card ${m.isLeader ? 'is-leader' : ''} ${localSlot ? 'is-local-slot' : ''}">
              <div class="party-member-left">
                <span style="font-size: 22px;">${vocIcon}</span>
                <div class="party-member-info">
                  <div class="party-member-name-row">
                    <span class="party-member-name">${m.name}</span>
                    ${m.isLeader ? '<span class="party-leader-star">⭐ Líder</span>' : ''}
                    ${localSlot ? `<span class="party-slot-tag" title="Gerenciado pelo Slot ${localSlot.id}">Slot ${localSlot.id}</span>` : ''}
                    ${m.followsLeader ? '<span class="party-follow-pill">🚶 Seguindo Líder</span>' : ''}
                  </div>
                  <div class="party-member-stats">
                    <span>Nv. ${m.level || '?'}</span>
                    <span>•</span>
                    <span>${formatVocation(m.vocation)}</span>
                    ${staminaText ? `<span>•</span><span title="Stamina">${staminaText}</span>` : ''}
                  </div>
                </div>
              </div>

              <!-- DPS / HPS Combat Chips -->
              <div class="party-member-combat">
                ${m.dps !== null ? `
                  <div class="combat-chip" title="Dano por Segundo / Dano Total">
                    <span class="combat-chip-label">DPS / Dano</span>
                    <span class="combat-chip-val dps">${(m.dps || 0).toLocaleString('pt-BR')} <span style="font-size: 9px; color: var(--text-dim); font-weight: 400;">(${((m.damageTotal || 0) / 1000).toFixed(1)}k)</span></span>
                  </div>
                ` : ''}
                ${m.hps !== null ? `
                  <div class="combat-chip" title="Cura por Segundo / Cura Total">
                    <span class="combat-chip-label">HPS / Cura</span>
                    <span class="combat-chip-val hps">${(m.hps || 0).toLocaleString('pt-BR')} <span style="font-size: 9px; color: var(--text-dim); font-weight: 400;">(${((m.healTotal || 0) / 1000).toFixed(1)}k)</span></span>
                  </div>
                ` : ''}
              </div>

              <!-- Barras de HP e Mana -->
              <div class="party-member-bars">
                <div class="party-bar-bg" title="Vida: ${m.healthPercent || 100}%">
                  <div class="party-bar-fill hp" style="width: ${m.healthPercent || 100}%;"></div>
                </div>
                <div class="party-bar-pct-label" style="color: ${m.healthPercent < 40 ? 'var(--ruby)' : 'var(--text-dim)'};">HP ${m.healthPercent || 100}%</div>
                <div class="party-bar-bg" title="Mana: ${m.manaPercent || 100}%">
                  <div class="party-bar-fill mp" style="width: ${m.manaPercent || 100}%;"></div>
                </div>
                <div class="party-bar-pct-label">MP ${m.manaPercent || 100}%</div>
              </div>

              <!-- Ações Contextuais: Seguir Líder, Expulsar (exclusivo do líder logado) -->
              <div class="party-member-actions">
                ${localSlot && !m.isLeader ? `
                  <button type="button" class="btn-party-action-sm follow ${m.followsLeader ? 'following' : ''}" onclick="toggleFollowLeader(${localSlot.id}, ${!m.followsLeader})" title="${m.followsLeader ? 'Parar de seguir o líder' : 'Seguir o líder automaticamente'}">
                    ${m.followsLeader ? 'Parar Seguir' : 'Seguir Líder'}
                  </button>
                ` : ''}

                ${isLeaderLoggedIn && !m.isLeader ? `
                  <button type="button" class="btn-party-action-sm kick" onclick="kickPartyMember(${leaderSlot.id}, ${m.id}, '${m.name}')" title="Expulsar membro da party (ação do líder)">
                    ✕
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

window.toggleFollowLeader = async function (slotId, follow) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/party/follow-leader`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follow }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro: ${data.error || 'Falha no servidor'}`);
      return;
    }
    showPartyToastFeedback(follow ? 'Seguir líder ativado!' : 'Seguir líder desativado.');
  } catch (err) {
    console.error('Erro ao alternar seguir líder:', err);
  }
};

window.kickPartyMember = async function (slotId, memberId, memberName) {
  if (!confirm(`Deseja realmente expulsar ${memberName} do grupo?`)) return;
  try {
    const resp = await fetch(`/api/slots/${slotId}/party/kick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: memberId }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao expulsar membro: ${data.error || 'Falha no servidor'}`);
      return;
    }
    showPartyToastFeedback(`${memberName} foi expulso do grupo.`);
  } catch (err) {
    console.error('Erro ao expulsar membro da party:', err);
  }
};

window.togglePartyCosts = async function (slotId, enabled) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/party/costs-offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao alterar divisão de custos: ${data.error || 'Falha no servidor'}`);
      return;
    }
    showPartyToastFeedback(enabled ? 'Divisão de custos ativada com sucesso!' : 'Divisão de custos desativada.');
  } catch (err) {
    console.error('Erro ao alterar custos de party:', err);
  }
};

window.submitCustomPartyInvite = async function () {
  const input = document.getElementById('party-custom-name-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  await invitePlayerToParty(activePartyModalSlotId, name);
  input.value = '';
};

window.invitePlayerToParty = async function (slotId, playerName) {
  try {
    const { leaderSlot, displaySlot } = getGlobalPartyInfo();
    const effectiveSlot = leaderSlot || (slotId ? state.slots[slotId - 1] : displaySlot) || state.slots.find((s) => s.status === 'connected' || s.status === 'hunting') || state.slots[0];
    const targetSlotId = effectiveSlot?.id || slotId || 1;

    const resp = await fetch(`/api/slots/${targetSlotId}/party/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao convidar: ${data.error || 'Falha no servidor'}`);
      return;
    }
    showPartyToastFeedback(`Convite enviado para ${playerName}!`);
  } catch (err) {
    console.error('Erro ao convidar jogador para party:', err);
    alert('Erro de conexão ao convidar jogador.');
  }
};

window.leaveParty = async function (slotId) {
  if (!confirm('Deseja realmente sair da party?')) return;
  try {
    const resp = await fetch(`/api/slots/${slotId}/party/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao sair da party: ${data.error || 'Falha no servidor'}`);
      return;
    }
    showPartyToastFeedback('Você saiu da party.');
  } catch (err) {
    console.error('Erro ao sair da party:', err);
    alert('Erro de conexão ao sair da party.');
  }
};

function renderSlotInviteBanner(slotId, sess) {
  if (!sess) return '';

  if (sess.transferOffer) {
    const tr = sess.transferOffer;
    return `
      <div class="slot-invite-banner" id="slot-transfer-banner-${slotId}">
        <div class="slot-invite-header">
          <span class="slot-invite-title">🌍 Mudança de Mundo (Party)</span>
          <span class="party-badge-indicator has-invite">Pendente</span>
        </div>
        <div class="slot-invite-body">
          <strong>${tr.fromName}</strong> está em outro mundo e convidou você para jogar junto!
        </div>
        <div class="slot-invite-actions">
          <button type="button" class="btn-invite-accept" onclick="respondToTransferOffer(${slotId}, true)">
            Entrar no Mundo
          </button>
          <button type="button" class="btn-invite-decline" onclick="respondToTransferOffer(${slotId}, false)">
            Recusar
          </button>
        </div>
      </div>
    `;
  }

  if (sess.partyInvite) {
    const inv = sess.partyInvite;
    const membersSummary = (inv.members && inv.members.length > 0)
      ? `Grupo atual: ${inv.members.map((m) => `${m.name} (${formatVocation(m.vocation)} Nv.${m.level})`).join(', ')}`
      : '';

    return `
      <div class="slot-invite-banner" id="slot-party-banner-${slotId}">
        <div class="slot-invite-header">
          <span class="slot-invite-title">🛡️ Convite de Party</span>
          <span class="party-badge-indicator has-invite">Pendente</span>
        </div>
        <div class="slot-invite-body">
          <strong>${inv.fromName}</strong> convidou você para entrar no grupo!
          ${membersSummary ? `<div class="invite-toast-members-preview">${membersSummary}</div>` : ''}
        </div>
        <div class="slot-invite-actions">
          <button type="button" class="btn-invite-accept-all" onclick="respondToPartyInvite(${slotId}, true, true)" title="Aceita e segue o líder automaticamente">
            Entrar e Seguir
          </button>
          <button type="button" class="btn-invite-decline" onclick="respondToPartyInvite(${slotId}, false)">
            Recusar
          </button>
        </div>
      </div>
    `;
  }

  return '';
}

window.respondToPartyInvite = async function (slotId, accept, followLeader = false) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/party/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept, followLeader }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao responder convite: ${data.error || 'Falha no servidor'}`);
      return;
    }

    const s = state.slots[slotId - 1];
    if (s && s.session) {
      s.session.partyInvite = null;
      renderSlot(s);
    }
  } catch (err) {
    console.error('Erro ao responder convite de party:', err);
    alert('Erro de conexão ao responder convite.');
  }
};

window.respondToTransferOffer = async function (slotId, accept) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/party/transfer-respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      alert(`Erro ao responder convite: ${data.error || 'Falha no servidor'}`);
      return;
    }

    const s = state.slots[slotId - 1];
    if (s && s.session) {
      s.session.transferOffer = null;
      renderSlot(s);
    }
    showPartyToastFeedback(accept ? 'Transferência aceita! Conectando ao mundo da party...' : 'Transferência de mundo recusada.');
  } catch (err) {
    console.error('Erro ao responder transferência:', err);
    alert('Erro de conexão ao responder convite de transferência.');
  }
};

window.switchCitySubTab = function (slotId, tab) {
  state.citySubTabs[slotId - 1] = tab;
  const s = state.slots[slotId - 1];
  if (s) {
    const card = document.getElementById(`slot-card-${slotId}`);
    if (card) {
      delete card.dataset.currentStatus;
      renderSlot(s);
    }
  }
};

function showPartyToastFeedback(message, isError = false) {
  let toastContainer = document.getElementById('global-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'global-toast-container';
    toastContainer.className = 'global-toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast-feedback ${isError ? 'toast-error' : 'toast-success'}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showPartyToastFeedback = showPartyToastFeedback;

window.reviveSlot = async function (slotId) {
  const card = document.getElementById(`slot-card-${slotId}`);
  const btn = card ? card.querySelector(`.btn-revive-main`) : document.querySelector(`.btn-revive-main`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⚰️ Revivendo...';
  }
  try {
    const resp = await fetch(`/api/slots/${slotId}/revive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    if (!resp.ok) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚰️ Reviver Personagem';
      }
      showPartyToastFeedback(`Erro ao reviver: ${data.error || 'Falha no servidor'}`, true);
      return;
    }
    const s = state.slots[slotId - 1];
    if (s) {
      Object.assign(s, data);
      if (card) {
        delete card.dataset.currentStatus;
        delete card.dataset.currentError;
      }
      renderSlot(s);
    }
    showPartyToastFeedback('✨ Personagem revivido com sucesso! Agora você está pronto na cidade.');
  } catch (err) {
    console.error('Erro ao reviver slot:', err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚰️ Reviver Personagem';
    }
    showPartyToastFeedback('Erro de conexão ao reviver personagem.', true);
  }
};

window.dismissDeathSlot = async function (slotId) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/death/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await resp.json();
    if (!resp.ok) {
      showPartyToastFeedback(`Erro ao dispensar tela de morte: ${data.error || 'Falha no servidor'}`, true);
      return;
    }
    const s = state.slots[slotId - 1];
    if (s) {
      Object.assign(s, data);
      const card = document.getElementById(`slot-card-${slotId}`);
      if (card) delete card.dataset.currentStatus;
      renderSlot(s);
    }
  } catch (err) {
    console.error('Erro ao dispensar tela de morte:', err);
  }
};

window.buyAllBlessings = async function (slotId) {
  const card = document.getElementById(`slot-card-${slotId}`);
  const btn = card ? card.querySelector(`.btn-bless-all`) : document.querySelector(`.btn-bless-all`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '✨ Adquirindo Bênçãos...';
  }
  try {
    const resp = await fetch(`/api/slots/${slotId}/blessings/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all' }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '✨ Adquirir Todas as Bênçãos';
      }
      showPartyToastFeedback(`Erro ao comprar bênçãos: ${data.error || 'Falha no servidor'}`, true);
      return;
    }
    const s = state.slots[slotId - 1];
    if (s) {
      Object.assign(s, data);
      const card = document.getElementById(`slot-card-${slotId}`);
      if (card) delete card.dataset.currentStatus;
      renderSlot(s);
    }
    showPartyToastFeedback('✨ Todas as 5 bênçãos foram adquiridas com sucesso!');
  } catch (err) {
    console.error('Erro ao comprar bênçãos:', err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✨ Adquirir Todas as Bênçãos';
    }
    showPartyToastFeedback('Erro de conexão ao comprar bênçãos.', true);
  }
};

window.buySingleBlessing = async function (slotId, blessingId) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/blessings/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: blessingId }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showPartyToastFeedback(`Erro ao comprar bênção: ${data.error || 'Falha no servidor'}`, true);
      return;
    }
    const s = state.slots[slotId - 1];
    if (s) {
      Object.assign(s, data);
      const card = document.getElementById(`slot-card-${slotId}`);
      if (card) delete card.dataset.currentStatus;
      renderSlot(s);
    }
    showPartyToastFeedback('✨ Bênção adquirida com sucesso!');
  } catch (err) {
    console.error('Erro ao comprar bênção:', err);
    showPartyToastFeedback('Erro de conexão ao comprar bênção.', true);
  }
};

window.selectTrainingSkill = function (slotId, skillId) {
  state.selectedTrainingSkills[slotId - 1] = skillId;
  const s = state.slots[slotId - 1];
  if (s) {
    const card = document.getElementById(`slot-card-${slotId}`);
    if (card) delete card.dataset.currentStatus;
    renderSlot(s);
  }
};

window.startOnlineTraining = async function (slotId, skillId) {
  const chosenSkill = skillId || state.selectedTrainingSkills[slotId - 1] || 'sword';
  const skillObj = HUNTERA_TRAINING_SKILLS.find(s => s.id === chosenSkill);
  const skillName = skillObj ? skillObj.name : chosenSkill;

  try {
    showPartyToastFeedback(`Iniciando treino de ${skillName}...`);
    const resp = await fetch(`/api/slots/${slotId}/training/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: chosenSkill }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      showPartyToastFeedback(`Erro ao iniciar treino: ${data.error || 'Falha no servidor'}`, true);
      return;
    }
    const s = state.slots[slotId - 1];
    if (s) {
      Object.assign(s, data);
      if (s.session) {
        s.session.training = { active: true, skill: chosenSkill };
      }
      const card = document.getElementById(`slot-card-${slotId}`);
      if (card) delete card.dataset.currentStatus;
      renderSlot(s);
    }
    showPartyToastFeedback(`🥋 Treino online de ${skillName} iniciado com sucesso!`);
  } catch (err) {
    console.error('Erro ao iniciar treino:', err);
    showPartyToastFeedback('Erro de conexão ao iniciar treino online.', true);
  }
};

window.stopTraining = async function (slotId) {
  try {
    const resp = await fetch(`/api/slots/${slotId}/training/leave`, {
      method: 'POST',
    });
    const data = await resp.json();
    if (!resp.ok) {
      showPartyToastFeedback(`Erro ao parar treino: ${data.error || 'Falha no servidor'}`, true);
      return;
    }
    const s = state.slots[slotId - 1];
    if (s) {
      Object.assign(s, data);
      if (s.session) {
        s.session.training = { active: false, skill: null };
      }
      const card = document.getElementById(`slot-card-${slotId}`);
      if (card) delete card.dataset.currentStatus;
      renderSlot(s);
    }
    showPartyToastFeedback('Treino online interrompido.');
  } catch (err) {
    console.error('Erro ao parar treino:', err);
    showPartyToastFeedback('Erro de conexão ao parar treino online.', true);
  }
};

// ---------------------------------------------------------------------------
// Sistema de Autenticação / Usuário (Fase 3 Frontend Provisório)
// ---------------------------------------------------------------------------

state.currentUser = null;

window.openAuthModal = function () {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.style.display = 'flex';
    clearAuthMsg();
  }
};

window.closeAuthModal = function () {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
};

window.switchAuthTab = function (tab) {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabReg = document.getElementById('auth-tab-register');
  const formLogin = document.getElementById('form-login');
  const formReg = document.getElementById('form-register');

  clearAuthMsg();

  if (tab === 'login') {
    tabLogin?.classList.add('active');
    tabReg?.classList.remove('active');
    if (formLogin) formLogin.style.display = 'flex';
    if (formReg) formReg.style.display = 'none';
  } else {
    tabReg?.classList.add('active');
    tabLogin?.classList.remove('active');
    if (formReg) formReg.style.display = 'flex';
    if (formLogin) formLogin.style.display = 'none';
  }
};

function showAuthMsg(msg, isError = false) {
  const el = document.getElementById('auth-status-msg');
  if (el) {
    el.textContent = msg;
    el.className = `auth-feedback-msg ${isError ? 'error' : 'success'}`;
    el.style.display = 'block';
  }
}

function clearAuthMsg() {
  const el = document.getElementById('auth-status-msg');
  if (el) el.style.display = 'none';
}

function updateAuthUI(user) {
  state.currentUser = user;
  const btnUser = document.getElementById('btn-user-account');
  const userLabel = document.getElementById('auth-user-label');
  const viewLogged = document.getElementById('auth-view-logged');
  const viewForms = document.getElementById('auth-view-forms');

  if (user) {
    if (btnUser) btnUser.classList.add('logged-in');
    if (userLabel) userLabel.textContent = user.email.split('@')[0];
    if (viewLogged) viewLogged.style.display = 'block';
    if (viewForms) viewForms.style.display = 'none';

    const emailEl = document.getElementById('auth-display-email');
    const planEl = document.getElementById('auth-display-plan');
    const screensEl = document.getElementById('auth-display-screens');
    if (emailEl) emailEl.textContent = user.email;
    if (planEl) planEl.textContent = `Plano: ${user.plan || 'screens1'}`;
    if (screensEl) screensEl.textContent = `${user.screens || 1} tela(s) máx`;
  } else {
    if (btnUser) btnUser.classList.remove('logged-in');
    if (userLabel) userLabel.textContent = 'Entrar';
    if (viewLogged) viewLogged.style.display = 'none';
    if (viewForms) viewForms.style.display = 'block';
  }
}

async function checkCurrentUser() {
  try {
    const [sessRes, cfgRes] = await Promise.all([
      fetch('/api/v1/auth/session').catch(() => null),
      fetch('/api/v1/auth/config').catch(() => null),
    ]);

    if (cfgRes && cfgRes.ok) {
      const cfg = await cfgRes.json();
      const tabReg = document.getElementById('auth-tab-register');
      if (tabReg && cfg.registrationEnabled === false) {
        tabReg.style.display = 'none';
      }
    }

    if (sessRes && sessRes.ok) {
      const data = await sessRes.json();
      if (data && data.user) {
        updateAuthUI(data.user);
        return;
      }
    }
    
    updateAuthUI(null);
    window.openAuthModal();
  } catch {
    updateAuthUI(null);
    window.openAuthModal();
  }
}

window.handleLoginSubmit = async function (e) {
  e.preventDefault();
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const totpInput = document.getElementById('login-totp');
  const totpGroup = document.getElementById('login-totp-group');
  const btnSubmit = document.getElementById('btn-login-submit');

  const email = emailInput?.value.trim();
  const password = passInput?.value;
  const totpCode = totpInput?.value.trim();

  if (!email || !password) return;

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Entrando...';
  }
  clearAuthMsg();

  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (data.code === 'MFA_REQUIRED') {
        if (totpGroup) totpGroup.style.display = 'flex';
        showAuthMsg('Digite o código 2FA de 6 dígitos gerado no seu aplicativo.', true);
      } else {
        showAuthMsg(data.error || 'Credenciais inválidas.', true);
      }
      return;
    }

    showAuthMsg('Login realizado com sucesso!', false);
    updateAuthUI(data.user);
    setTimeout(() => {
      window.closeAuthModal();
    }, 800);
  } catch (err) {
    showAuthMsg('Erro de rede ao conectar ao servidor.', true);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Entrar';
    }
  }
};

window.handleRegisterSubmit = async function (e) {
  e.preventDefault();
  const emailInput = document.getElementById('reg-email');
  const passInput = document.getElementById('reg-password');
  const btnSubmit = document.getElementById('btn-reg-submit');

  const email = emailInput?.value.trim();
  const password = passInput?.value;

  if (!email || !password) return;

  if (password.length < 10) {
    showAuthMsg('A senha deve ter no mínimo 10 caracteres.', true);
    return;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Criando conta...';
  }
  clearAuthMsg();

  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      showAuthMsg(data.error || 'Falha ao criar conta.', true);
      return;
    }

    showAuthMsg('Conta criada com sucesso! Você já pode fazer login.', false);
    setTimeout(() => {
      window.switchAuthTab('login');
      const loginEmail = document.getElementById('login-email');
      if (loginEmail) loginEmail.value = email;
    }, 1200);
  } catch {
    showAuthMsg('Erro de rede ao criar conta.', true);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Criar Minha Conta';
    }
  }
};

window.handleLogout = async function () {
  try {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    updateAuthUI(null);
    showAuthMsg('Desconectado com sucesso.', false);
    setTimeout(() => {
      window.closeAuthModal();
    }, 600);
  } catch {
    updateAuthUI(null);
  }
};

// Checa estado do usuário no carregamento
checkCurrentUser();




