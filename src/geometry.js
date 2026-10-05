export function canStand(x, y, obstacles, bounds = { left: 70, right: 930, top: 205, bottom: 580 }) {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom && !obstacles.some(r => x + 11 > r.x && x - 11 < r.x + r.w && y + 5 > r.y && y - 8 < r.y + r.h);
}
export function movePlayer(player, dx, dy, obstacles, bounds) {
  // Resolve each axis separately, allowing a player to slide along furniture.
  const step = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
  for (let i = 0; i < step; i++) {
    if (canStand(player.x + dx / step, player.y, obstacles, bounds)) player.x += dx / step;
    if (canStand(player.x, player.y + dy / step, obstacles, bounds)) player.y += dy / step;
  }
  return player;
}
export function nearestExhibit(player, exhibits, radius = 102) {
  return exhibits.map(e => ({ ...e, distance: Math.hypot(player.x - e.approach.x, player.y - e.approach.y) })).filter(e => e.distance < radius).sort((a,b) => a.distance - b.distance)[0] || null;
}
export function sectionPhotos(photos, section, size = 6) { return photos.slice(section * size, (section + 1) * size); }

export function findPath(start, target, obstacles, bounds) {
  const grid = 20;
  const cell = (p) => ({ x: Math.round(p.x / grid), y: Math.round(p.y / grid) });
  const first = cell(start), last = cell(target);
  const key = (p) => `${p.x},${p.y}`;
  if (!canStand(last.x * grid, last.y * grid, obstacles, bounds)) return [];
  const open = [first], visited = new Map([[key(first), null]]);
  let cursor = 0;
  while (cursor < open.length && cursor < 2000) {
    const current = open[cursor++];
    if (key(current) === key(last)) {
      const points = [];
      for (let point = current; point; point = visited.get(key(point))) points.push({ x: point.x * grid, y: point.y * grid });
      return points.reverse().slice(1);
    }
    for (const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!visited.has(key(next)) && canStand(next.x * grid, next.y * grid, obstacles, bounds)) { visited.set(key(next), current); open.push(next); }
    }
  }
  return [];
}
