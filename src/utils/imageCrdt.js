export const createClientId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const compareClock = (a, b) => {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  if (a.ts !== b.ts) return a.ts > b.ts ? 1 : -1;
  if (a.clientId === b.clientId) return 0;
  return a.clientId > b.clientId ? 1 : -1;
};

export const ensureModuleCrdt = (config, moduleName, clientId) => {
  const module = config[moduleName] || {};
  const items = Array.isArray(module.items || module.images || module.events) ? (module.items || module.images || module.events) : [];
  const clocks = module.clocks || (moduleName === 'gallery' ? module.imageClocks : {}) || {};
  const tombstones = module.tombstones || (moduleName === 'gallery' ? module.imageTombstones : {}) || {};
  
  const normalizedItems = items.map((item) => {
    const id = item.id || createClientId();
    const itemClocks = clocks[id] || {};
    // Ensure all fields have clocks
    Object.keys(item).forEach(key => {
      if (key !== 'id' && !itemClocks[key]) {
        itemClocks[key] = { ts: 0, clientId };
      }
    });
    clocks[id] = itemClocks;
    return { ...item, id };
  });

  return {
    ...config,
    [moduleName]: {
      ...module,
      [moduleName === 'gallery' ? 'images' : (moduleName === 'story' ? 'events' : 'items')]: normalizedItems,
      [moduleName === 'gallery' ? 'imageClocks' : 'clocks']: clocks,
      [moduleName === 'gallery' ? 'imageTombstones' : 'tombstones']: tombstones
    }
  };
};

export const buildPatch = ({ module, action, itemId, field, value, item, clientId }) => {
  const ts = Date.now();
  const opId = `${clientId}-${ts}-${Math.random().toString(16).slice(2)}`;
  return {
    opId,
    module, // 'gallery', 'story', etc.
    action,
    itemId,
    field,
    value,
    item,
    clock: { ts, clientId }
  };
};

export const applyPatch = (config, patch) => {
  const moduleName = patch.module || 'gallery';
  const module = config[moduleName] || {};
  
  const itemsKey = moduleName === 'gallery' ? 'images' : (moduleName === 'story' ? 'events' : 'items');
  const clocksKey = moduleName === 'gallery' ? 'imageClocks' : 'clocks';
  const tombstonesKey = moduleName === 'gallery' ? 'imageTombstones' : 'tombstones';

  const items = Array.isArray(module[itemsKey]) ? [...module[itemsKey]] : [];
  const clocks = { ...(module[clocksKey] || {}) };
  const tombstones = { ...(module[tombstonesKey] || {}) };

  const tombstone = patch.itemId ? tombstones[patch.itemId] : null;
  if (tombstone && compareClock(tombstone, patch.clock) >= 0) {
    return config;
  }

  if (patch.action === 'remove') {
    tombstones[patch.itemId] = patch.clock;
    const filtered = items.filter((item) => item.id !== patch.itemId);
    return { ...config, [moduleName]: { ...module, [itemsKey]: filtered, [clocksKey]: clocks, [tombstonesKey]: tombstones } };
  }

  if (patch.action === 'add') {
    const incoming = patch.item || {};
    const id = patch.itemId || incoming.id || createClientId();
    const existingIndex = items.findIndex((item) => item.id === id);
    const nextItem = { ...incoming, id };
    
    const itemClocks = clocks[id] || {};
    Object.keys(nextItem).forEach(key => {
      if (key !== 'id') itemClocks[key] = patch.clock;
    });
    clocks[id] = itemClocks;

    if (existingIndex >= 0) {
      items[existingIndex] = { ...items[existingIndex], ...nextItem };
    } else {
      items.push(nextItem);
    }
    return { ...config, [moduleName]: { ...module, [itemsKey]: items, [clocksKey]: clocks, [tombstonesKey]: tombstones } };
  }

  if (patch.action === 'update') {
    const index = items.findIndex((item) => item.id === patch.itemId);
    if (index === -1) return config;

    const itemClocks = clocks[patch.itemId] || {};
    const existingClock = itemClocks[patch.field];
    if (compareClock(patch.clock, existingClock) <= 0) {
      return config;
    }

    const nextItem = { ...items[index], [patch.field]: patch.value };
    items[index] = nextItem;
    itemClocks[patch.field] = patch.clock;
    clocks[patch.itemId] = itemClocks;

    return { ...config, [moduleName]: { ...module, [itemsKey]: items, [clocksKey]: clocks, [tombstonesKey]: tombstones } };
  }

  return config;
};
