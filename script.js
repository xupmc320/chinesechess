// script.js
// 完整中國象棋（簡易 UI + 完整走法判定）
// Requirements: index.html 包含 <canvas id="chessCanvas">、#turn-indicator、#restart-button

// ---------- 基本設定 ----------
const canvas = document.getElementById('chessCanvas');
const ctx = canvas.getContext('2d');
const turnIndicator = document.getElementById('turn-indicator');
const restartButton = document.getElementById('restart-button');

// 視覺 / 棋盤參數（可調）
const gridSize = 60;      // 格距（px）
const cols = 9;           // 交叉點橫向數（0..8）
const rows = 10;          // 交叉點縱向數（0..9）
const pieceRadius = 24;   // 棋子半徑（px）
const margin = pieceRadius * 2; // 四周安全邊距

// 計算 canvas 尺寸並設定（避免被切掉）
canvas.width = (cols - 1) * gridSize + margin * 2;
canvas.height = (rows - 1) * gridSize + margin * 2;

// 支援高 DPI 畫面（讓線條與字體更銳利）
(function scaleForDPR() {
    const dpr = window.devicePixelRatio || 1;
    if (dpr !== 1) {
        const cssW = canvas.width;
        const cssH = canvas.height;
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        ctx.scale(dpr, dpr);
    }
})();

// 遊戲狀態
let currentTurn = 'red'; // 'red' 或 'black'（你原設定：紅在上，黑在下）
let pieces = [];         // 棋子陣列：{x,y,type,color}
let selected = null;     // 被選中的棋子
let legalMoves = [];     // 被選棋子的合法走位（顯示）

// ---------- 坐標轉換 ----------
function boardToPixel(x, y) {
    // 回傳中心座標（px），基於邊距 margin
    return { px: margin + x * gridSize, py: margin + y * gridSize };
}
function pixelToBoard(px, py) {
    // 把 canvas 事件座標轉成棋盤座標（四捨五入到最近交叉點）
    const x = Math.round((px - margin) / gridSize);
    const y = Math.round((py - margin) / gridSize);
    return { x, y };
}
function withinBoard(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
}

// ---------- 初始化棋子（紅在上，黑在下） ----------
function initPieces() {
    pieces = [
        // 紅方（上）
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

        // 黑方（下）
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

// ---------- 尋找 / 操作棋子 ----------
function getPieceAt(x, y) {
    return pieces.find(p => p.x === x && p.y === y);
}
function removePieceAt(x, y) {
    pieces = pieces.filter(p => !(p.x === x && p.y === y));
}
function countPiecesBetween(sx, sy, tx, ty) {
    if (sx !== tx && sy !== ty) return -1;
    let count = 0;
    if (sx === tx) {
        const dir = ty > sy ? 1 : -1;
        for (let y = sy + dir; y !== ty; y += dir) {
            if (getPieceAt(sx, y)) count++;
        }
    } else {
        const dir = tx > sx ? 1 : -1;
        for (let x = sx + dir; x !== tx; x += dir) {
            if (getPieceAt(x, sy)) count++;
        }
    }
    return count;
}
function pathClearStraight(sx, sy, tx, ty) {
    return countPiecesBetween(sx, sy, tx, ty) === 0;
}
function isHorseBlocked(sx, sy, tx, ty) {
    // 馬走日：先直一步是否被擋
    const dx = tx - sx, dy = ty - sy;
    if (Math.abs(dx) === 2 && Math.abs(dy) === 1) {
        const midx = sx + dx / 2;
        return !!getPieceAt(midx, sy);
    }
    if (Math.abs(dx) === 1 && Math.abs(dy) === 2) {
        const midy = sy + dy / 2;
        return !!getPieceAt(sx, midy);
    }
    return false;
}
function isElephantBlocked(sx, sy, tx, ty) {
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    return !!getPieceAt(mx, my);
}
function inPalace(x, y, color) {
    if (color === 'red') return x >= 3 && x <= 5 && y >= 0 && y <= 2;
    return x >= 3 && x <= 5 && y >= 7 && y <= 9;
}
function findGeneral(color) {
    if (color === 'red') return pieces.find(p => p.type === '帥' && p.color === 'red');
    return pieces.find(p => p.type === '將' && p.color === 'black');
}

// ---------- 基本吃/走判斷（不含自將檢查） ----------
function canPieceAttack(piece, tx, ty) {
    if (!withinBoard(tx, ty)) return false;
    const sx = piece.x, sy = piece.y;
    const dx = tx - sx, dy = ty - sy;
    const target = getPieceAt(tx, ty);
    if (target && target.color === piece.color) return false; // 不能吃自己

    switch (piece.type) {
        case '車':
            if (sx !== tx && sy !== ty) return false;
            return pathClearStraight(sx, sy, tx, ty);

        case '炮':
            if (sx !== tx && sy !== ty) return false;
            const between = countPiecesBetween(sx, sy, tx, ty);
            if (!target) return between === 0;  // 非吃子，必須空
            return between === 1;               // 吃子時剛好隔一子

        case '馬':
            if (!((Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2))) return false;
            if (isHorseBlocked(sx, sy, tx, ty)) return false;
            return true;

        case '象':
        case '相':
            if (!(Math.abs(dx) === 2 && Math.abs(dy) === 2)) return false;
            if (isElephantBlocked(sx, sy, tx, ty)) return false;
            // 象不能過河（河在4/5之間）
            if (piece.color === 'red' && ty > 4) return false;
            if (piece.color === 'black' && ty < 5) return false;
            return true;

        case '士':
        case '仕':
            if (!(Math.abs(dx) === 1 && Math.abs(dy) === 1)) return false;
            if (!inPalace(tx, ty, piece.color)) return false;
            return true;

        case '帥':
        case '將':
            // 只能在九宮內且走一步（直）
            if (!((Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0))) return false;
            if (!inPalace(tx, ty, piece.color)) return false;
            return true;

        case '兵':
	case '卒':
   	    // 紅向下 (y+1)，黑向上 (y-1)
    	    const forward = piece.color === 'red' ? 1 : -1;
   	    // 向前一步（可吃可不吃）
   	    if (dx === 0 && dy === forward) return true;
   	    // 過河後可以左右一步
   	    const crossed = piece.color === 'red' ? piece.y >= 5 : piece.y <= 4;
   	    if (crossed && Math.abs(dx) === 1 && dy === 0) return true;
   	    return false;


        default:
            return false;
    }
}

// ---------- 將帥見面判定 & 被將檢查 ----------
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
    if (!general) return true; // 沒有將視為被將（或被吃）
    // 任何對方棋子能攻擊將/帥，或見面情況
    for (const p of pieces) {
        if (p.color !== color) {
            if (canPieceAttack(p, general.x, general.y)) return true;
            // 對方為將/帥 且與我方將同列且無阻擋，也算被將（但 canPieceAttack 會處理此情況）
            if ((p.type === '將' || p.type === '帥') && p.x === general.x) {
                const between = countPiecesBetween(p.x, p.y, general.x, general.y);
                if (between === 0) return true;
            }
        }
    }
    return false;
}

// ---------- 合法移動（包含不自陷被將） ----------
function isValidMove(piece, tx, ty) {
    if (!withinBoard(tx, ty)) return false;
    if (piece.x === tx && piece.y === ty) return false;
    const target = getPieceAt(tx, ty);
    if (target && target.color === piece.color) return false;

    // 基本移動規則（不考慮自將）
    if (!canPieceAttack(piece, tx, ty)) return false;

    // 模擬走法：移動後檢查自己是否被將（或將帥見面）
    const sx = piece.x, sy = piece.y;
    let removed = null;
    if (target) {
        // 暫時移除被吃子
        removed = target;
        pieces = pieces.filter(p => p !== target);
    }
    piece.x = tx; piece.y = ty;

    // 若模擬移動後 own general 被攻擊，則不合法
    const illegal = isInCheck(piece.color) || generalsFaceToFace();

    // 還原
    piece.x = sx; piece.y = sy;
    if (removed) pieces.push(removed);

    return !illegal;
}

// 計算某子所有合法走位（UI 用）
function computeLegalMoves(piece) {
    const moves = [];
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (isValidMove(piece, x, y)) moves.push({ x, y });
        }
    }
    return moves;
}

// ---------- 繪圖 ----------
function drawBoard() {
    // 清空（以 CSS 背景為主，這裡畫線）
    // 注意：若有 DPR scaling 已經處理
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 線條屬性
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // 橫線（從左到右，0..9 行）
    for (let r = 0; r < rows; r++) {
        const start = boardToPixel(0, r);
        const end = boardToPixel(cols - 1, r);
        ctx.beginPath();
        ctx.moveTo(start.px, start.py);
        ctx.lineTo(end.px, end.py);
        ctx.stroke();
    }
    // 直線（上下河分段畫，河是 4.5）
    for (let c = 0; c < cols; c++) {
        // 上半（0..4）
        const top = boardToPixel(c, 0);
        const mid = boardToPixel(c, 4);
        ctx.beginPath();
        ctx.moveTo(top.px, top.py);
        ctx.lineTo(mid.px, mid.py);
        ctx.stroke();
        // 下半（5..9）
        const mid2 = boardToPixel(c, 5);
        const bottom = boardToPixel(c, 9);
        ctx.beginPath();
        ctx.moveTo(mid2.px, mid2.py);
        ctx.lineTo(bottom.px, bottom.py);
        ctx.stroke();
    }

    // 九宮（斜線）
    drawPalace(3, 0);
    drawPalace(3, 7);

    // 河界文字
    ctx.font = '18px Microsoft JhengHei';
    ctx.fillStyle = '#000';
    const r1 = boardToPixel(1, 4.5);
    ctx.fillText('楚河', r1.px - 10, r1.py);
    const r2 = boardToPixel(6, 4.5);
    ctx.fillText('漢界', r2.px - 10, r2.py);
}

function drawPalace(sx, sy) {
    // draw two diagonals in 3x3 palace
    const a = boardToPixel(sx, sy);
    const b = boardToPixel(sx + 2, sy + 2);
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();

    const c = boardToPixel(sx + 2, sy);
    const d = boardToPixel(sx, sy + 2);
    ctx.beginPath();
    ctx.moveTo(c.px, c.py);
    ctx.lineTo(d.px, d.py);
    ctx.stroke();
}

function drawPieces() {
    // 先畫棋子
    pieces.forEach(p => {
        const { px, py } = boardToPixel(p.x, p.y);
        // 外圈白
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.arc(px, py, pieceRadius + 2, 0, Math.PI * 2);
        ctx.fill();
        // 內圈代表顏色
        ctx.beginPath();
        ctx.fillStyle = p.color === 'red' ? '#e74c3c' : '#2c3e50';
        ctx.arc(px, py, pieceRadius, 0, Math.PI * 2);
        ctx.fill();
        // 文字
        ctx.fillStyle = '#fff';
        ctx.font = '20px Microsoft JhengHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type, px, py);
    });

    // 選取標示
    if (selected) {
        const { px, py } = boardToPixel(selected.x, selected.y);
        ctx.beginPath();
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.arc(px, py, pieceRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    // 合法走位標示
    legalMoves.forEach(m => {
        const { px, py } = boardToPixel(m.x, m.y);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0,255,0,0.6)';
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 全部渲染
function render() {
    drawBoard();
    drawPieces();
}

// ---------- 事件處理：滑鼠點擊 ----------
canvas.addEventListener('click', (ev) => {
    // 事件座標（相對 canvas 左上）
    const rect = canvas.getBoundingClientRect();
    // clientX/Y - rect.left/top -> 真實 CSS 像素座標
    let clickX = ev.clientX - rect.left;
    let clickY = ev.clientY - rect.top;

    // 若啟用 DPR scaling，上面已將 canvas 寬高乘以 dpr 並 scale(ctx)，但 getBoundingClientRect 回傳 CSS 大小，
    // 所以直接用 css 大小與 margin/gridSize (都是以 CSS px 為基準) 做換算即可。

    const { x: gx, y: gy } = pixelToBoard(clickX, clickY);

    if (!withinBoard(gx, gy)) {
        // 點到邊界外，取消選取
        selected = null;
        legalMoves = [];
        render();
        return;
    }

    const clicked = getPieceAt(gx, gy);

    if (selected) {
        // 點到自己顏色 -> 改選
        if (clicked && clicked.color === currentTurn) {
            selected = clicked;
            legalMoves = computeLegalMoves(selected);
            render();
            return;
        }

        // 嘗試走 selected -> (gx,gy)
        const allowed = legalMoves.some(m => m.x === gx && m.y === gy);
        if (allowed) {
            // 若有敵方子，吃掉
            if (clicked && clicked.color !== selected.color) {
                pieces = pieces.filter(p => !(p.x === gx && p.y === gy));
            }
            // 移動
            selected.x = gx; selected.y = gy;

            // 檢查是否吃到對方將帥（遊戲結束）
            const oppGen = findGeneral(currentTurn === 'red' ? 'black' : 'red');
            if (!oppGen) {
                render();
                setTimeout(() => alert(`${currentTurn === 'red' ? '紅方' : '黑方'} 勝利！`), 10);
                turnIndicator.textContent = `${currentTurn === 'red' ? '紅方' : '黑方'} 勝利`;
                selected = null;
                legalMoves = [];
                return;
            }

            // 換手
            currentTurn = currentTurn === 'red' ? 'black' : 'red';
            turnIndicator.textContent = `輪到 ${currentTurn === 'red' ? '紅方' : '黑方'}`;

            // 若換手後對方被將軍，簡單 console 提示（不阻止走）
            if (isInCheck(currentTurn)) {
                console.log(`${currentTurn === 'red' ? '紅方' : '黑方'} 被將軍！`);
            }

            selected = null;
            legalMoves = [];
            render();
            return;
        } else {
            // 非合法走：取消或改選
            if (clicked && clicked.color === currentTurn) {
                selected = clicked;
                legalMoves = computeLegalMoves(selected);
            } else {
                selected = null;
                legalMoves = [];
            }
            render();
            return;
        }
    } else {
        // 尚未選棋: 點到自己棋子則選
        if (clicked && clicked.color === currentTurn) {
            selected = clicked;
            legalMoves = computeLegalMoves(selected);
            render();
            return;
        }
    }
});

// 重新開始按鈕
restartButton.addEventListener('click', () => {
    initPieces();
    currentTurn = 'red';
    selected = null;
    legalMoves = [];
    turnIndicator.textContent = '輪到 紅方';
    render();
});

// 初始化並開始
initPieces();
render();

// ---------- done ----------
