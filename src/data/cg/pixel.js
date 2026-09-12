// 像素画绘制辅助：CG 与成就图标共用
// grid: 字符串数组（每行同长），palette: 单字符 → 颜色（"."或 null = 透明）

export function drawPixelGrid(ctx, grid, palette, scale, ox = 0, oy = 0) {
  for (let y = 0; y < grid.length; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}

export function renderToCanvas(grid, palette, scale) {
  const w = grid[0].length * scale;
  const h = grid.length * scale;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  drawPixelGrid(ctx, grid, palette, scale);
  return canvas;
}
