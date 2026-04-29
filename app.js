// ============================================================
// TOKİ 2026 İstanbul Çekiliş Simülasyonu — Canlı Motor
// ============================================================

const CONFIG = {
  TOTAL_CANDIDATES: 1072660,
  TOTAL_WINNERS: 100000,
  MERGE_POINT: 55739,
  DRAWS_AFTER_MERGE: 44261,
  HIGHEST_WINNER: 955067,
  EXCLUDED_START: 955068,
  EXCLUDED_END: 1072660,
  EXCLUDED_COUNT: 117593,
};
CONFIG.EXPECTED_FROM_RANGE = CONFIG.DRAWS_AFTER_MERGE * (CONFIG.EXCLUDED_COUNT / CONFIG.TOTAL_CANDIDATES);

// ── Helpers ──
function fmt(n) { return n.toLocaleString('tr-TR'); }
function fmtD(n, d = 2) { return n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randInt(min, max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return min + (arr[0] % (max - min + 1));
}
function $(id) { return document.getElementById(id); }

// ── Speed presets: [batchSize, delayMs] ──
const SPEEDS = {
  '0': [44261, 0],   // instant
  '1': [500, 0],     // fast — 500 per tick
  '2': [80, 10],     // medium
  '3': [10, 30],     // slow
};

// ============================================================
// App
// ============================================================
class App {
  constructor() {
    this.running = false;
    this.allResults = [];
    this.bindUI();
    this.populateStatic();
  }

  bindUI() {
    this.btnStart = $('btn-start');
    this.btnStop = $('btn-stop');
    this.btnReset = $('btn-reset');
    this.selSpeed = $('sim-speed');
    this.liveArea = $('live-area');
    this.resultsSection = $('results-section');
    this.numberStream = $('number-stream');

    this.btnStart.onclick = () => this.start();
    this.btnStop.onclick = () => this.stop();
    this.btnReset.onclick = () => this.reset();
  }

  // ── Static values ──
  populateStatic() {
    $('stat-total').textContent = fmt(CONFIG.TOTAL_CANDIDATES);
    $('stat-draws').textContent = fmt(CONFIG.DRAWS_AFTER_MERGE);
    $('stat-excluded').textContent = fmt(CONFIG.EXCLUDED_COUNT);
    $('stat-expected').textContent = fmtD(CONFIG.EXPECTED_FROM_RANGE, 0);

    $('prob-range-size').textContent = fmt(CONFIG.EXCLUDED_COUNT);
    $('prob-range-pct').textContent = fmtD((CONFIG.EXCLUDED_COUNT / CONFIG.TOTAL_CANDIDATES) * 100) + '%';
    $('prob-draw-count').textContent = fmt(CONFIG.DRAWS_AFTER_MERGE);
    $('prob-expected').textContent = fmtD(CONFIG.EXPECTED_FROM_RANGE, 1);

    // Hypergeometric P(X=0)
    const N = CONFIG.TOTAL_CANDIDATES, M = CONFIG.EXCLUDED_COUNT, n = CONFIG.DRAWS_AFTER_MERGE;
    let logP = 0;
    for (let i = 0; i < n; i++) logP += Math.log((N - M - i) / (N - i));
    $('prob-p0-exp').textContent = Math.floor(logP / Math.LN10).toString();

    const mean = n * M / N;
    const variance = n * M * (N - M) * (N - n) / (N * N * (N - 1));
    const sigma = mean / Math.sqrt(variance);
    $('prob-sigma').textContent = fmtD(sigma, 1) + 'σ';
  }

  // ── Start ──
  async start() {
    const simCount = 1;
    const speedKey = this.selSpeed.value;
    const [batchSize, delayMs] = SPEEDS[speedKey];

    this.running = true;
    this.allResults = [];
    this.btnStart.disabled = true;
    this.btnStop.style.display = 'inline-flex';
    this.liveArea.style.display = 'block';
    this.resultsSection.style.display = 'none';

    for (let round = 0; round < simCount; round++) {
      if (!this.running) break;
      const result = await this.runLiveRound(batchSize, delayMs);
      this.allResults.push(result);
    }

    if (this.running && this.allResults.length > 0) {
      this.showFinalResults();
    }

    this.running = false;
    this.btnStart.disabled = false;
    this.btnStop.style.display = 'none';
  }

  stop() {
    this.running = false;
    this.btnStart.disabled = false;
    this.btnStop.style.display = 'none';
  }

  reset() {
    this.stop();
    this.allResults = [];
    this.liveArea.style.display = 'none';
    this.roundsArea.style.display = 'none';
    this.resultsSection.style.display = 'none';
    this.numberStream.innerHTML = '';
    $('rounds-tbody').innerHTML = '';
  }

  // ── Run one round with live UI ──
  async runLiveRound(batchSize, delayMs) {
    const total = CONFIG.DRAWS_AFTER_MERGE;
    const N = CONFIG.TOTAL_CANDIDATES;
    const exStart = CONFIG.EXCLUDED_START;
    const exEnd = CONFIG.EXCLUDED_END;

    let drawn = 0, hits = 0, firstHit = -1;
    const usedSet = new Set();

    // Reset live counters
    $('lc-drawn').textContent = '0';
    $('lc-hits').textContent = '0';
    $('lc-miss').textContent = '0';
    $('current-number').textContent = '—';
    $('current-number').className = 'current-draw-number';
    $('current-status').textContent = '';
    $('live-progress-fill').style.width = '0%';
    $('live-progress-text').textContent = '0%';
    this.numberStream.innerHTML = '';

    while (drawn < total && this.running) {
      const thisBatch = Math.min(batchSize, total - drawn);
      let lastNum = 0;
      let batchHtml = '';

      for (let b = 0; b < thisBatch; b++) {
        let num;
        do { num = randInt(1, N); } while (usedSet.has(num));
        usedSet.add(num);
        drawn++;
        lastNum = num;

        const inRange = num >= exStart && num <= exEnd;
        if (inRange) {
          hits++;
          if (firstHit === -1) firstHit = drawn;
        }

        // Build stream HTML (limit to last numbers for performance)
        if (batchSize <= 80) {
          const cls = inRange ? 'ns-hit' : 'ns-num';
          batchHtml += `<span class="${cls}">${fmt(num)}</span>`;
        }
      }

      // Update counters
      $('lc-drawn').textContent = fmt(drawn);
      $('lc-hits').textContent = fmt(hits);
      $('lc-miss').textContent = fmt(drawn - hits);

      // Current number
      const isHit = lastNum >= exStart && lastNum <= exEnd;
      $('current-number').textContent = fmt(lastNum);
      $('current-number').className = 'current-draw-number' + (isHit ? ' glow-green' : '');
      $('current-status').textContent = isHit ? '✅ ARALIKTA!' : '';
      $('current-status').className = 'current-draw-status' + (isHit ? ' status-hit' : '');

      // Progress
      const pct = (drawn / total * 100);
      $('live-progress-fill').style.width = pct + '%';
      $('live-progress-text').textContent = pct.toFixed(1) + '%';

      // Stream (keep last ~200 for performance)
      if (batchHtml) {
        this.numberStream.insertAdjacentHTML('beforeend', batchHtml);
        const children = this.numberStream.children;
        while (children.length > 300) children[0].remove();
        this.numberStream.scrollTop = this.numberStream.scrollHeight;
      }

      if (delayMs > 0) await sleep(delayMs);
      else await sleep(0); // yield
    }

    // Flash final state
    $('lc-hits').parentElement.classList.add('flash');
    setTimeout(() => $('lc-hits').parentElement.classList.remove('flash'), 600);

    return { hitsInRange: hits, firstHitDraw: firstHit, drawCount: drawn };
  }

  // ── Add row to rounds table ──
  addRoundRow(num, r) {
    const tbody = $('rounds-tbody');
    const tr = document.createElement('tr');
    const isZero = r.hitsInRange === 0;
    const c = isZero ? 'var(--accent-red)' : 'var(--accent-green)';
    tr.innerHTML = `
      <td style="color:var(--text-muted)">#${num}</td>
      <td style="color:${c};font-weight:600">${fmt(r.hitsInRange)}</td>
      <td>${r.firstHitDraw > 0 ? fmt(r.firstHitDraw) + '. çekim' : '—'}</td>
      <td style="color:${c}">${isZero ? '⛔ Sıfır' : '✅ Normal'}</td>
    `;
    tr.classList.add('animate-in');
    tbody.appendChild(tr);
    tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── Final results ──
  showFinalResults() {
    const results = this.allResults;
    const hits = results.map(r => r.hitsInRange);
    const total = hits.length;
    const sum = hits.reduce((a, b) => a + b, 0);
    const avg = sum / total;
    const min = Math.min(...hits);
    const max = Math.max(...hits);
    const zeroCount = hits.filter(h => h === 0).length;
    const variance = hits.reduce((acc, h) => acc + (h - avg) ** 2, 0) / total;
    const stdDev = Math.sqrt(variance);
    const sorted = [...hits].sort((a, b) => a - b);
    const median = sorted[Math.floor(total / 2)];
    const p5 = sorted[Math.floor(total * 0.05)];
    const p95 = sorted[Math.floor(total * 0.95)];

    const expected = CONFIG.EXPECTED_FROM_RANGE;

    $('res-avg').textContent = fmtD(avg, 1);
    $('res-zero-count').textContent = fmt(zeroCount);
    $('res-zero-pct').textContent = fmtD((zeroCount / total) * 100, 4);
    $('res-min').textContent = fmt(min);
    $('res-max').textContent = fmt(max);
    $('res-median').textContent = fmt(median);
    $('res-stddev').textContent = fmtD(stdDev, 2);
    $('res-p5').textContent = fmt(p5);
    $('res-p95').textContent = fmt(p95);

    // Bars
    const maxVal = Math.max(expected, avg, 1);
    const sc = v => Math.max(2, (v / maxVal) * 100);
    $('bar-expected').style.width = sc(expected) + '%';
    $('bar-expected-val').textContent = fmtD(expected, 0);
    $('bar-sim').style.width = sc(avg) + '%';
    $('bar-sim-val').textContent = fmtD(avg, 1);
    $('bar-actual').style.width = sc(0) + '%';
    $('bar-actual-val').textContent = '0';

    // Verdict
    $('verdict-expected').textContent = 'Beklenen ≈ ' + fmtD(expected, 0);

    const N = CONFIG.TOTAL_CANDIDATES, M = CONFIG.EXCLUDED_COUNT, n = CONFIG.DRAWS_AFTER_MERGE;
    const sMean = n * M / N;
    const sVar = n * M * (N - M) * (N - n) / (N * N * (N - 1));
    const sSigma = sMean / Math.sqrt(sVar);
    $('verdict-sigma').textContent = 'Fark = ' + fmtD(sSigma, 1) + 'σ';

    const vt = $('verdict-text');
    if (zeroCount === 0) {
      vt.innerHTML = `<strong>${fmt(total)}</strong> simülasyonun <strong>hiçbirinde</strong> bu aralıktan sıfır kazanan çıkmadı. Her simülasyonda ortalama <strong>${fmtD(avg, 1)}</strong> kişi bu aralıktan kazandı. Minimum bile <strong>${fmt(min)}</strong> kişiydi.<br><br>Gerçek çekilişte bu aralıktan <strong>0 kişinin</strong> kazanması istatistiksel olarak <strong>neredeyse imkânsızdır</strong>.`;
    } else {
      vt.innerHTML = `<strong>${fmt(total)}</strong> simülasyonun yalnızca <strong>${fmt(zeroCount)}</strong> tanesinde sıfır sonucu çıktı (%${fmtD((zeroCount / total) * 100, 6)}). Ortalama <strong>${fmtD(avg, 1)}</strong> kişi bu aralıktan kazandı.<br><br>Gerçek çekilişte bu aralıktan <strong>0 kişinin</strong> kazanması istatistiksel olarak <strong>son derece düşük olasılıklıdır</strong>.`;
    }

    this.resultsSection.style.display = 'block';
    setTimeout(() => {
      this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => new App());
