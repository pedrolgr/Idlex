const SENSITIVE_KEY = /^(ticket|token|cookie|set-cookie|password|senha|email|authorization|websocketUrl|secret|accountId)$/i;

/** Remove recursivamente campos sensíveis (substitui por "[REDACTED]"). Não muta a entrada. */
export function sanitizeMessage(value) {
  if (Array.isArray(value)) return value.map(sanitizeMessage);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[REDACTED]" : sanitizeMessage(v);
    }
    return out;
  }
  return value;
}

/**
 * Cria uma função que troca nomes de jogadores por pseudônimos estáveis (Player1, Player2...).
 * Cobre: creature.name quando kind === "player", members[].name, entries[].name, fromName, playerName.
 */
export function createAnonymizer() {
  const map = new Map();
  const alias = (n) => {
    if (typeof n !== "string" || !n) return n;
    const key = n.toLowerCase();
    if (!map.has(key)) map.set(key, `Player${map.size + 1}`);
    return map.get(key);
  };
  const walk = (v, ctx = {}) => {
    if (Array.isArray(v)) return v.map((x) => walk(x, { ...ctx, inList: ctx.key }));
    if (v && typeof v === "object") {
      const isPlayer = v.kind === "player" || ["members", "entries"].includes(ctx.inList ?? "");
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        if ((k === "name" && isPlayer) || k === "fromName" || k === "playerName") out[k] = alias(val);
        else out[k] = walk(val, { key: k });
      }
      return out;
    }
    return v;
  };
  return (msg) => walk(msg);
}
