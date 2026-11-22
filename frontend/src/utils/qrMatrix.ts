// frontend/src/utils/qrMatrix.ts
// Gerador ISO/IEC 18004 puro em TypeScript (Byte Mode, Nível L, Versões 2 a 6 — até 134 bytes).
// Zero dependências externas. Ideal para convites de sala (?sala=XXXX) em projeções e celulares.

interface VersionSpec {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  blocks: number;
  alignments: number[];
}

// Tabelas oficiais ISO/IEC 18004 para Nível L (Versões 1..6)
const VERSION_SPECS: VersionSpec[] = [
  { version: 1, size: 21, dataCodewords: 19, ecCodewordsPerBlock: 7, blocks: 1, alignments: [] },
  { version: 2, size: 25, dataCodewords: 34, ecCodewordsPerBlock: 10, blocks: 1, alignments: [6, 18] },
  { version: 3, size: 29, dataCodewords: 55, ecCodewordsPerBlock: 15, blocks: 1, alignments: [6, 22] },
  { version: 4, size: 33, dataCodewords: 80, ecCodewordsPerBlock: 20, blocks: 1, alignments: [6, 26] },
  { version: 5, size: 37, dataCodewords: 108, ecCodewordsPerBlock: 26, blocks: 1, alignments: [6, 30] },
  { version: 6, size: 41, dataCodewords: 136, ecCodewordsPerBlock: 18, blocks: 2, alignments: [6, 34] },
];

// Aritmética de corpo finito GF(256) com polinômio primitivo 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildGeneratorPoly(degree: number): Uint8Array {
  let poly: Uint8Array = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function computeReedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = buildGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    for (let j = 0; j < ecCount - 1; j++) {
      rem[j] = rem[j + 1] ^ gfMul(gen[j + 1], factor);
    }
    rem[ecCount - 1] = gfMul(gen[ecCount], factor);
  }
  return rem;
}

function encodeUtf8Bytes(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(text);
  }
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

function pushBits(target: number[], value: number, bitCount: number) {
  for (let i = bitCount - 1; i >= 0; i--) {
    target.push((value >>> i) & 1);
  }
}

function formatBitsForLevelL(maskPattern: number): number {
  // EC Level L = 01 (2 bits) + maskPattern (3 bits)
  const data = (0b01 << 3) | (maskPattern & 0b111);
  let rem = data << 10;
  const poly = 0b10100110111;
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) {
      rem ^= poly << (i - 10);
    }
  }
  const raw = (data << 10) | rem;
  return raw ^ 0b101010000010010;
}

function applyMask(maskPattern: number, row: number, col: number): boolean {
  switch (maskPattern) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
    default:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function evaluatePenalty(matrix: boolean[][]): number {
  const n = matrix.length;
  let penalty = 0;

  // Regra 1: corridas horizontais e verticais >= 5
  for (let r = 0; r < n; r++) {
    let runLen = 1;
    for (let c = 1; c < n; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < n; c++) {
    let runLen = 1;
    for (let r = 1; r < n; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Regra 2: blocos 2x2 da mesma cor
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = matrix[r][c];
      if (
        matrix[r][c + 1] === v &&
        matrix[r + 1][c] === v &&
        matrix[r + 1][c + 1] === v
      ) {
        penalty += 3;
      }
    }
  }

  // Regra 4: equilíbrio de módulos escuros (~50%)
  let dark = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) dark++;
    }
  }
  const percent = (dark * 100) / (n * n);
  const deviation = Math.floor(Math.abs(percent - 50) / 5);
  penalty += deviation * 10;

  return penalty;
}

/**
 * Gera uma matriz booleana NxN (true = módulo escuro) compatível com ISO/IEC 18004 (QR Code).
 * Retorna null se o texto exceder a capacidade da Versão 6-L (134 bytes).
 */
export function generateQrMatrix(text: string): boolean[][] | null {
  const bytes = encodeUtf8Bytes(text);
  // 4 bits modo (0100) + 8 bits tamanho + bytes*8 + até 4 bits terminador
  const requiredCodewords = Math.ceil((4 + 8 + bytes.length * 8) / 8);
  const spec = VERSION_SPECS.find((v) => v.dataCodewords >= requiredCodewords);
  if (!spec) {
    return null;
  }

  // 1. Monta stream de dados (Byte mode = 0100)
  const bits: number[] = [];
  pushBits(bits, 0b0100, 4);
  pushBits(bits, bytes.length, 8);
  for (let i = 0; i < bytes.length; i++) {
    pushBits(bits, bytes[i], 8);
  }

  const maxDataBits = spec.dataCodewords * 8;
  const terminatorLen = Math.min(4, maxDataBits - bits.length);
  pushBits(bits, 0, terminatorLen);
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes = new Uint8Array(spec.dataCodewords);
  let byteIndex = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    dataBytes[byteIndex++] = b;
  }
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (byteIndex < spec.dataCodewords) {
    dataBytes[byteIndex++] = padPatterns[padIdx++ % 2];
  }

  // 2. Blocos Reed-Solomon + intercalação (interleaving)
  const blockDataLen = Math.floor(spec.dataCodewords / spec.blocks);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.blocks; b++) {
    const slice = dataBytes.subarray(b * blockDataLen, (b + 1) * blockDataLen);
    dataBlocks.push(slice);
    ecBlocks.push(computeReedSolomon(slice, spec.ecCodewordsPerBlock));
  }

  const finalCodewords: number[] = [];
  for (let i = 0; i < blockDataLen; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      finalCodewords.push(dataBlocks[b][i]);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.blocks; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  const finalBits: number[] = [];
  for (const cw of finalCodewords) {
    pushBits(finalBits, cw, 8);
  }

  // 3. Constrói matriz base com padrões funcionais
  const n = spec.size;
  const base: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false),
  );
  const isFunction: boolean[][] = Array.from({ length: n }, () =>
    Array<boolean>(n).fill(false),
  );

  const setFunc = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < n && c >= 0 && c < n) {
      base[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder patterns + separadores
  const placeFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (onBorder || inCore));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Alignment patterns
  for (const rCenter of spec.alignments) {
    for (const cCenter of spec.alignments) {
      if (isFunction[rCenter][cCenter]) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(rCenter + dr, cCenter + dc, dist !== 1);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    if (!isFunction[6][i]) setFunc(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setFunc(i, 6, i % 2 === 0);
  }

  // Reserva áreas de Format Info + Dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = n - 8; i < n; i++) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(n - 8, 8, true); // dark module obrigatório

  // 4. Posiciona bits de dados em zigue-zague
  let bitIdx = 0;
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step;
      for (let offset = 0; offset < 2; offset++) {
        const c = right - offset;
        if (isFunction[r][c]) continue;
        base[r][c] = bitIdx < finalBits.length ? finalBits[bitIdx++] === 1 : false;
      }
    }
    upward = !upward;
  }

  // 5. Avalia as 8 máscaras oficiais e escolhe a de menor penalidade
  let bestMatrix: boolean[][] | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.map((row, r) =>
      row.map((val, c) =>
        isFunction[r][c] ? val : applyMask(mask, r, c) ? !val : val,
      ),
    );

    const fmt = formatBitsForLevelL(mask);
    // Coloca os 15 bits de formato (bit 14 = MSB -> índice 0)
    const fmtBit = (index: number) => ((fmt >>> (14 - index)) & 1) === 1;

    // Cópia 1 (topo-esquerda)
    const coords1: [number, number][] = [
      [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
      [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    ];
    for (let i = 0; i < 15; i++) {
      const [r, c] = coords1[i];
      candidate[r][c] = fmtBit(i);
    }

    // Cópia 2 (inferior-esquerda + superior-direita)
    const coords2: [number, number][] = [
      [n - 1, 8], [n - 2, 8], [n - 3, 8], [n - 4, 8], [n - 5, 8], [n - 6, 8], [n - 7, 8],
      [8, n - 8], [8, n - 7], [8, n - 6], [8, n - 5], [8, n - 4], [8, n - 3], [8, n - 2], [8, n - 1],
    ];
    for (let i = 0; i < 15; i++) {
      const [r, c] = coords2[i];
      candidate[r][c] = fmtBit(i);
    }

    const penalty = evaluatePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}
