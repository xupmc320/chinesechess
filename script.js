// script.js - 完整版 (包含悔棋、DPR 支援、完整走法)
// 需要 index.html 有: <canvas id="chessCanvas"></canvas>, 
// #turn-indicator, #restart-button, #undo-button

const canvas = document.getElementById('chessCanvas');
const ctx = canvas.getContext('2d');
const turnIndicator = document.getElementById('turn-indicator');
const restartButton = document.getElementById('restart-button');
const undoButton = document.getElementById('undo-button');

// 視覺 / 棋盤參數
const gridSize = 60;
const cols = 9;
const rows = 10;
const pieceRadius = 24;
const margin = pieceRadius * 2;

// CSS 尺寸（以 CSS px 為基準）
const cssWidth = (cols - 1) * gridSize + margin * 2;
const cssHeight = (rows - 1) * gridSize + margin * 2;
canvas.style.width = cssWidth + 'px';
canvas.style.height = cssHeight + 'px';

// 物理畫布尺度與 DPR 處理（確保點擊座標與畫面一致）
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
ctx.scale(dpr, dpr);

// 遊戲狀態
let pieces = [];            // 平面陣列：{x,y,type,color}
let currentTurn = 'red';    // 'red' (紅在上) 或 'black' (黑在下)
let selected = null;
let legalMoves = [];
let moveHistory = [];       // 每步存 { pieces, currentTurn }

// 坐標轉換（CSS px）
function boardToPixel(x, y) {
    return { px: margin + x * gridSize, py: margin + y * gridSize };
}
function pixelToBoard(px, py) {
    return {
        x: Math.round((px - margin) / gridSize),
        y: Math.round((py - margin) / gridSize)
    };
}
function withinBoard(x, y) { return x >= 0 && x < cols && y >= 0 && y < rows; }

// 初始化棋子（紅在上，如你先前設定）
function initPieces() {
    pieces = [
        // 紅（上）
        { x: 0, y: 0, type: '車', color: 'red' },
        { x: 1, y: 0, type: '馬', color: 'red' },
        { x: 2, y: 0, type: '象', color: 'red' },
        { x: 3, y: 0, type: '士', color: 'red' },
        { x: 4, y: 0, type: '帥', color: 'red' },
        { x: 5, y: 0, type: '士', color: 'red' },
        { x: 6, y: 0, type: '象', color: 'red' },
        { x: 7, y: 0, type: '馬', color: 'red' },
        { x: 8, y: 0, type: '車', color: 'red' },
        { x: 1, y: 2, type: '炮', color: 'red' },
        { x: 7, y: 2, type: '炮', color: 'red' },
        { x: 0, y: 3, type: '兵', color: 'red' },
        { x: 2, y: 3, type: '兵', color: 'red' },
        { x: 4, y: 3, type: '兵', color: 'red' },
        { x: 6, y: 3, type: '兵', color: 'red' },
        { x: 8, y: 3, type: '兵', color: 'red' },

        // 黑（下）
        { x: 0, y: 9, type: '車', color: 'black' },
        { x: 1, y: 9, type: '馬', color: 'black' },
        { x: 2, y: 9, type: '象', color: 'black' },
        { x: 3, y: 9, type: '士', color: 'black' },
        { x: 4, y: 9, type: '將', color: 'black' },
        { x: 5, y: 9, type: '士', color: 'black' },
        { x: 6, y: 9, type: '象', color: 'black' },
        { x: 7, y: 9, type: '馬', color: 'black' },
        { x: 8, y: 9, type: '車', color: 'black' },
        { x: 1, y: 7, type: '炮', color: 'black' },
        { x: 7, y: 7, type: '炮', color: 'black' },
        { x: 0, y: 6, type: '卒', color: 'black' },
        { x: 2, y: 6, type: '卒', color: 'black' },
        { x: 4, y: 6, type: '卒', color: 'black' },
        { x: 6, y: 6, type: '卒', color: 'black' },
        { x: 8, y: 6, type: '卒', color: 'black' }
    ];
}

// 尋找/移除棋子
function getPieceAt(x, y) {
    return pieces.find(p => p.x === x && p.y === y);
}
function removePieceAt(x, y) {
    pieces = pieces.filter(p => !(p.x === x && p.y === y));
}

// 路徑、阻擋相關
function countPiecesBetween(sx, sy, tx, ty) {
    if (sx !== tx && sy !== ty) return -1;
    let count = 0;
    if (sx === tx) {
        const dir = ty > sy ? 1 : -1;
        for (let y = sy + dir; y !== ty; y += dir) if (getPieceAt(sx, y)) count++;
    } else {
        const dir = tx > sx ? 1 : -1;
        for (let x = sx + dir; x !== tx; x += dir) if (getPieceAt(x, sy)) count++;
    }
    return count;
}
function pathClearStraight(sx, sy, tx, ty) {
    return countPiecesBetween(sx, sy, tx, ty) === 0;
}
function isHorseBlocked(sx, sy, tx, ty) {
    const dx = tx - sx, dy = ty - sy;
    if (Math.abs(dx) === 2 && Math.abs(dy) === 1) {
        const midx = sx + dx / 2; return !!getPieceAt(midx, sy);
    }
    if (Math.abs(dx) === 1 && Math.abs(dy) === 2) {
        const midy = sy + dy / 2; return !!getPieceAt(sx, midy);
    }
    return false;
}
function isElephantBlocked(sx, sy, tx, ty) {
    const mx = (sx + tx) / 2, my = (sy + ty) / 2; return !!getPieceAt(mx, my);
}
function inPalace(x, y, color) {
    if (color === 'red') return x >= 3 && x <= 5 && y >= 0 && y <= 2;
    return x >= 3 && x <= 5 && y >= 7 && y <= 9;
}
function findGeneral(color) {
    return pieces.find(p => (color === 'red' ? p.type === '帥' : p.type === '將') && p.color === color);
}

// 基本攻擊規則（不含自將檢查）
function canPieceAttack(piece, tx, ty) {
    if (!withinBoard(tx, ty)) return false;
    const sx = piece.x, sy = piece.y;
    const dx = tx - sx, dy = ty - sy;
    const target = getPieceAt(tx, ty);
    if (target && target.color === piece.color) return false;

    switch (piece.type) {
        case '車':
            if (sx !== tx && sy !== ty) return false;
            return pathClearStraight(sx, sy, tx, ty);

        case '炮':
            if (sx !== tx && sy !== ty) return false;
            const between = countPiecesBetween(sx, sy, tx, ty);
            if (!target) return between === 0;
            return between === 1;

        case '馬':
            if (!((Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2))) return false;
            if (isHorseBlocked(sx, sy, tx, ty)) return false;
            return true;

        case '象':
            if (!(Math.abs(dx) === 2 && Math.abs(dy) === 2)) return false;
            if (isElephantBlocked(sx, sy, tx, ty)) return false;
            if (piece.color === 'red' && ty > 4) return false;
            if (piece.color === 'black' && ty < 5) return false;
            return true;

        case '士':
            if (!(Math.abs(dx) === 1 && Math.abs(dy) === 1)) return false;
            if (!inPalace(tx, ty, piece.color)) return false;
            return true;

        case '帥':
        case '將':
            if (!((Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0))) return false;
            if (!inPalace(tx, ty, piece.color)) return false;
            return true;

        case '兵':
        case '卒':
            const forward = piece.color === 'red' ? 1 : -1;
            if (dx === 0 && dy === forward) return true; // 可直一步（可吃可不吃）
            const crossed = piece.color === 'red' ? piece.y >= 5 : piece.y <= 4;
            if (crossed && Math.abs(dx) === 1 && dy === 0) return true;
            return false;

        default:
            return false;
    }
}

// 將帥見面 & 被將判定
function generalsFaceToFace() {
    const redGen = pieces.find(p => p.type === '帥' && p.color === 'red');
    const blackGen = pieces.find(p => p.type === '將' && p.color === 'black');
    if (!redGen || !blackGen) return false;
    if (redGen.x !== blackGen.x) return false;
    const between = countPiecesBetween(redGen.x, redGen.y, blackGen.x, blackGen.y);
    return between === 0;
}
function isInCheck(color) {
    const general = findGeneral(color);
    if (!general) return true;
    for (const p of pieces) {
        if (p.color !== color) {
            if (canPieceAttack(p, general.x, general.y)) return true;
            if ((p.type === '將' || p.type === '帥') && p.x === general.x) {
                const between = countPiecesBetween(p.x, p.y, general.x, general.y);
                if (between === 0) return true;
            }
        }
    }
    return false;
}

// 合法移動（含模擬自將判斷）
function isValidMove(piece, tx, ty) {
    if (!withinBoard(tx, ty)) return false;
    if (piece.x === tx && piece.y === ty) return false;
    const target = getPieceAt(tx, ty);
    if (target && target.color === piece.color) return false;
    if (!canPieceAttack(piece, tx, ty)) return false;

    // 模擬走子
    const sx = piece.x, sy = piece.y;
    let removed = null;
    if (target) {
        removed = target;
        pieces = pieces.filter(p => p !== target);
    }
    piece.x = tx; piece.y = ty;

    const illegal = isInCheck(piece.color) || generalsFaceToFace();

    // 還原
    piece.x = sx; piece.y = sy;
    if (removed) pieces.push(removed);

    return !illegal;
}

// 計算合法走位
function computeLegalMoves(piece) {
    const moves = [];
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++)
        if (isValidMove(piece, x, y)) moves.push({ x, y });
    return moves;
}

// 繪圖
function drawBoard() {
    // 背景填滿（CSS 已給顏色）
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // 橫線
    for (let r = 0; r < rows; r++) {
        const s = boardToPixel(0, r);
        const e = boardToPixel(cols - 1, r);
        ctx.beginPath(); ctx.moveTo(s.px, s.py); ctx.lineTo(e.px, e.py); ctx.stroke();
    }
    // 直線（河中央分段）
    for (let c = 0; c < cols; c++) {
        const top = boardToPixel(c, 0), mid = boardToPixel(c, 4);
        ctx.beginPath(); ctx.moveTo(top.px, top.py); ctx.lineTo(mid.px, mid.py); ctx.stroke();
        const mid2 = boardToPixel(c, 5), bottom = boardToPixel(c, 9);
        ctx.beginPath(); ctx.moveTo(mid2.px, mid2.py); ctx.lineTo(bottom.px, bottom.py); ctx.stroke();
    }

    // 九宮
    drawPalace(3, 0); drawPalace(3, 7);

    // 河界字
    ctx.font = '18px Microsoft JhengHei';
    ctx.fillStyle = '#000';
    const r1 = boardToPixel(1, 4.5); ctx.fillText('楚河', r1.px - 10, r1.py);
    const r2 = boardToPixel(6, 4.5); ctx.fillText('漢界', r2.px - 10, r2.py);
}

function drawPalace(sx, sy) {
    const a = boardToPixel(sx, sy), b = boardToPixel(sx + 2, sy + 2);
    ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
    const c = boardToPixel(sx + 2, sy), d = boardToPixel(sx, sy + 2);
    ctx.beginPath(); ctx.moveTo(c.px, c.py); ctx.lineTo(d.px, d.py); ctx.stroke();
}

function drawPieces() {
    pieces.forEach(p => {
        const { px, py } = boardToPixel(p.x, p.y);
        // 外圈
        ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(px, py, pieceRadius + 2, 0, Math.PI * 2); ctx.fill();
        // 本色
        ctx.beginPath(); ctx.fillStyle = p.color === 'red' ? '#e74c3c' : '#2c3e50'; ctx.arc(px, py, pieceRadius, 0, Math.PI * 2); ctx.fill();
        // 字
        ctx.fillStyle = '#fff'; ctx.font = '20px Microsoft JhengHei'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.type, px, py);
    });

    if (selected) {
        const { px, py } = boardToPixel(selected.x, selected.y);
        ctx.beginPath(); ctx.strokeStyle = '#ff0'; ctx.lineWidth = 3; ctx.arc(px, py, pieceRadius + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
    }
    legalMoves.forEach(m => {
        const { px, py } = boardToPixel(m.x, m.y);
        ctx.beginPath(); ctx.fillStyle = 'rgba(0,255,0,0.6)'; ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    });
}

function render() { drawBoard(); drawPieces(); }

// 互動：點擊
canvas.addEventListener('click', ev => {
    const rect = canvas.getBoundingClientRect();
    const clickX = ev.clientX - rect.left;
    const clickY = ev.clientY - rect.top;
    const { x: gx, y: gy } = pixelToBoard(clickX, clickY);

    if (!withinBoard(gx, gy)) {
        selected = null; legalMoves = []; render(); return;
    }

    const clicked = getPieceAt(gx, gy);

    if (selected) {
        // 點到自己顏色 -> 改選
        if (clicked && clicked.color === currentTurn) {
            selected = clicked; legalMoves = computeLegalMoves(selected); render(); return;
        }
        // 嘗試走
        const allowed = legalMoves.some(m => m.x === gx && m.y === gy);
        if (allowed) {
            // 儲存歷史（深拷貝）
            moveHistory.push({ pieces: JSON.parse(JSON.stringify(pieces)), currentTurn });

            // 吃子（如有）
            if (clicked && clicked.color !== selected.color) {
                pieces = pieces.filter(p => !(p.x === gx && p.y === gy));
            }
            // 移動 selected
            selected.x = gx; selected.y = gy;

            // 檢查對方是否還有將/帥
            const oppGen = pieces.find(p => p.color !== currentTurn && (p.type === '將' || p.type === '帥'));
            if (!oppGen) {
                render();
                setTimeout(() => alert(`${currentTurn === 'red' ? '紅方' : '黑方'} 勝利！`), 10);
                turnIndicator.textContent = `${currentTurn === 'red' ? '紅方' : '黑方'} 勝利`;
                selected = null; legalMoves = []; return;
            }

            // 換手
            currentTurn = currentTurn === 'red' ? 'black' : 'red';
            turnIndicator.textContent = `輪到 ${currentTurn === 'red' ? '紅方' : '黑方'}`;
            // 若新回合被將，可在 console 提示
            if (isInCheck(currentTurn)) console.log(`${currentTurn === 'red' ? '紅方' : '黑方'} 被將軍！`);

            selected = null; legalMoves = []; render(); return;
        } else {
            // 非合法 => 取消或改選
            if (clicked && clicked.color === currentTurn) { selected = clicked; legalMoves = computeLegalMoves(selected); }
            else { selected = null; legalMoves = []; }
            render(); return;
        }
    } else {
        if (clicked && clicked.color === currentTurn) {
            selected = clicked; legalMoves = computeLegalMoves(selected); render(); return;
        }
    }
});

// 悔棋
function undoMove() {
    if (!moveHistory.length) { alert('沒有步可悔'); return; }
    const last = moveHistory.pop();
    pieces = JSON.parse(JSON.stringify(last.pieces));
    currentTurn = last.currentTurn;
    selected = null; legalMoves = [];
    turnIndicator.textContent = `輪到 ${currentTurn === 'red' ? '紅方' : '黑方'}`;
    render();
}

// 重新開始
restartButton.addEventListener('click', () => {
    initPieces();
    moveHistory = [];
    currentTurn = 'red';
    selected = null;
    legalMoves = [];
    turnIndicator.textContent = '輪到 紅方';
    render();
});

// 綁定悔棋按鈕（若不存在則不綁）
if (undoButton) undoButton.addEventListener('click', undoMove);

// 啟動
initPieces();
render();
