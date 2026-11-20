/**
 * Lightweight Zero-Dependency Canvas Chart Visualizer
 * Renders High-DPI Donut & Horizontal Bar Charts for Executive Dashboards
 */

const Charts = {
  /**
   * Render a polished Donut Chart on an HTML5 Canvas
   * @param {HTMLCanvasElement} canvas
   * @param {Object} dataObject e.g. { 'Laptops': 5, 'Displays': 3 }
   * @param {Array<string>} [colorPalette]
   */
  renderDonut(canvas, dataObject, colorPalette) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement.clientWidth || 300;
    const height = 240;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const labels = Object.keys(dataObject);
    const values = Object.values(dataObject);
    const total = values.reduce((sum, v) => sum + v, 0);

    ctx.clearRect(0, 0, width, height);

    if (total === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    const defaultColors = [
      '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'
    ];
    const colors = colorPalette || defaultColors;

    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const radius = Math.min(centerX, centerY) - 15;
    const innerRadius = radius * 0.62;

    let currentAngle = -Math.PI / 2;

    values.forEach((val, i) => {
      const sliceAngle = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Inner White Hole
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 1, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Center Summary Metric
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total}`, centerX, centerY - 4);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('TOTAL ASSETS', centerX, centerY + 16);
  },

  /**
   * Render Horizontal Bar Breakdown
   * @param {HTMLElement} container
   * @param {Object} dataObject e.g. { 'Engineering': 4, 'Sales': 2 }
   */
  renderBarList(container, dataObject) {
    if (!container) return;
    const labels = Object.keys(dataObject);
    const values = Object.values(dataObject);
    const maxVal = Math.max(...values, 1);

    container.innerHTML = labels.map((label, idx) => {
      const val = values[idx];
      const pct = Math.round((val / maxVal) * 100);
      return `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px;">
            <span style="font-weight: 600; color: #334155;">${label}</span>
            <span style="font-weight: 700; color: #0f172a;">${val}</span>
          </div>
          <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: #4f46e5; border-radius: 4px; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
};
