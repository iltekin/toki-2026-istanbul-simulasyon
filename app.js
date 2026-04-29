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

    // Notary interaction
    const notary = $('notary-container');
    const notaryImg = $('notary-img');
    const notaryBubble = $('notary-bubble');
    
    if (notary) {
      notary.onclick = () => {
        const isNormal = notaryImg.src.includes('notary_normal');
        notaryImg.src = isNormal ? 'notary_thumbs_up.png' : 'notary_normal.png';
        
        if (isNormal) {
          const msgs = ["Onaylıyorum!", "Hile yoktur!", "Tamamen rastgele!", "Bilimsel kanıt!", "Noter tasdikli!"];
          notaryBubble.textContent = msgs[Math.floor(Math.random() * msgs.length)];
          notaryBubble.classList.add('active');
          setTimeout(() => notaryBubble.classList.remove('active'), 2000);
        }
      };
    }
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
      $('live-progress-text').textContent = Math.floor(pct) + '%';

      // Stream (keep last 150 for performance)
      if (batchHtml) {
        this.numberStream.insertAdjacentHTML('beforeend', batchHtml);
        if (this.numberStream.children.length > 200) {
          const toRemove = this.numberStream.children.length - 200;
          for (let i = 0; i < toRemove; i++) {
            this.numberStream.removeChild(this.numberStream.firstChild);
          }
        }
        this.numberStream.scrollTop = this.numberStream.scrollHeight;
      }

      if (delayMs > 0) await sleep(delayMs);
      else if (drawn % 5000 === 0) await sleep(0); // Yield less frequently on max speed for better perf
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
    const lastResult = results[results.length - 1];
    const val = lastResult.hitsInRange;
    const expected = CONFIG.EXPECTED_FROM_RANGE;

    $('res-val').textContent = fmt(val);
    $('res-draw-count').textContent = fmt(lastResult.drawCount);
    $('res-actual-val').textContent = fmt(val);

    // Bars
    const maxVal = Math.max(expected, val, 1);
    const sc = v => Math.max(2, (v / maxVal) * 100);
    $('bar-expected').style.width = sc(expected) + '%';
    $('bar-expected-val').textContent = fmtD(expected, 0);
    $('bar-sim').style.width = sc(val) + '%';
    $('bar-sim-val').textContent = fmtD(val, 1);
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
    if (val > 0) {
      vt.innerHTML = `Bu simülasyon sonucunda, belirlenen aralıktan <strong>${fmt(val)}</strong> aday kazandı. <br><br>
        Oysa gerçek çekilişte bu aralıktan <strong>0 kişinin</strong> kazanmış olması, istatistiksel olarak beklenen 
        <strong>${fmtD(expected, 1)}</strong> değerinden çok uzaktır ve gerçekleşme olasılığı neredeyse sıfırdır.`;
    } else {
      // This is extremely unlikely to happen in a fair simulation
      vt.innerHTML = `Bu simülasyonda da 0 sonucu çıktı. Ancak bu durumun rastgele bir çekilişte gerçekleşme olasılığı 
        astronomik düzeyde küçüktür (≈ 10<sup>-2108</sup>).`;
    }

    this.resultsSection.style.display = 'block';
    setTimeout(() => {
      this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => new App());
