function cleanPart(value, fallback = "entity") {
  const text = String(value ?? fallback).trim().toLowerCase();
  return text.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

export class EntityIdAllocator {
  constructor({ namespace = "world" } = {}) {
    this.namespace = cleanPart(namespace, "world");
    this.reset();
  }

  reset() {
    this.serial = 0;
    this.byKind = new Map();
  }

  next(kind = "entity", owner = "neutral") {
    const safeKind = cleanPart(kind, "entity");
    const safeOwner = cleanPart(owner, "neutral");
    const key = `${safeOwner}:${safeKind}`;
    const ordinal = (this.byKind.get(key) || 0) + 1;
    this.byKind.set(key, ordinal);
    this.serial += 1;
    return `${this.namespace}:${safeOwner}:${safeKind}:${String(ordinal).padStart(4, "0")}`;
  }

  ensure(entity, kind = null, owner = null) {
    if (!entity?.userData) return null;
    if (!entity.userData.entityId) {
      entity.userData.entityId = this.next(kind || entity.userData.type || "entity", owner || entity.userData.owner || "neutral");
    }
    return entity.userData.entityId;
  }

  ensureWorld(world) {
    for (const entity of world?.entities || []) this.ensure(entity);
    return world;
  }
}

export function createEntityIdAllocator(options = {}) {
  return new EntityIdAllocator(options);
}
