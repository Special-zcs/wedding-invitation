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

export const ensureGalleryCrdt = (config, clientId) => {
  const gallery = config.gallery || {};
  const images = Array.isArray(gallery.images) ? gallery.images : [];
  const imageClocks = gallery.imageClocks || {};
  const imageTombstones = gallery.imageTombstones || {};
  const normalizedImages = images.map((img) => {
    const id = img.id || createClientId();
    const clocks = imageClocks[id] || {};
    const nextClocks = {
      src: clocks.src || { ts: 0, clientId },
      caption: clocks.caption || { ts: 0, clientId },
      date: clocks.date || { ts: 0, clientId }
    };
    imageClocks[id] = nextClocks;
    return { ...img, id };
  });
  return {
    ...config,
    gallery: {
      ...gallery,
      images: normalizedImages,
      imageClocks,
      imageTombstones
    }
  };
};

export const buildImagePatch = ({ action, imageId, field, value, image, clientId }) => {
  const ts = Date.now();
  const opId = `${clientId}-${ts}-${Math.random().toString(16).slice(2)}`;
  return {
    opId,
    action,
    imageId,
    field,
    value,
    image,
    clock: { ts, clientId }
  };
};

export const applyImagePatch = (config, patch) => {
  const gallery = config.gallery || {};
  const images = Array.isArray(gallery.images) ? [...gallery.images] : [];
  const imageClocks = { ...(gallery.imageClocks || {}) };
  const imageTombstones = { ...(gallery.imageTombstones || {}) };
  const tombstone = patch.imageId ? imageTombstones[patch.imageId] : null;
  if (tombstone && compareClock(tombstone, patch.clock) >= 0) {
    return { ...config, gallery: { ...gallery, images, imageClocks, imageTombstones } };
  }
  if (patch.action === 'remove') {
    imageTombstones[patch.imageId] = patch.clock;
    const filtered = images.filter((img) => img.id !== patch.imageId);
    return { ...config, gallery: { ...gallery, images: filtered, imageClocks, imageTombstones } };
  }
  if (patch.action === 'add') {
    const incoming = patch.image || {};
    const id = patch.imageId || incoming.id || createClientId();
    const existingIndex = images.findIndex((img) => img.id === id);
    const nextImage = { ...incoming, id };
    const nextClocks = {
      src: patch.clock,
      caption: patch.clock,
      date: patch.clock
    };
    imageClocks[id] = { ...(imageClocks[id] || {}), ...nextClocks };
    if (existingIndex >= 0) {
      images[existingIndex] = { ...images[existingIndex], ...nextImage };
    } else {
      images.push(nextImage);
    }
    return { ...config, gallery: { ...gallery, images, imageClocks, imageTombstones } };
  }
  if (patch.action === 'update') {
    const index = images.findIndex((img) => img.id === patch.imageId);
    if (index === -1) {
      return { ...config, gallery: { ...gallery, images, imageClocks, imageTombstones } };
    }
    const fieldClocks = imageClocks[patch.imageId] || {};
    const existingClock = fieldClocks[patch.field];
    if (compareClock(patch.clock, existingClock) <= 0) {
      return { ...config, gallery: { ...gallery, images, imageClocks, imageTombstones } };
    }
    const nextImage = { ...images[index], [patch.field]: patch.value };
    images[index] = nextImage;
    imageClocks[patch.imageId] = { ...fieldClocks, [patch.field]: patch.clock };
    return { ...config, gallery: { ...gallery, images, imageClocks, imageTombstones } };
  }
  return { ...config, gallery: { ...gallery, images, imageClocks, imageTombstones } };
};
