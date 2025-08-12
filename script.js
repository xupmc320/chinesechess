// script.js
const canvas = document.getElementById('chessCanvas');
const ctx = canvas.getContext('2d');
const turnIndicator = document.getElementById('turn-indicator');
const restartButton = document.getElementById('restart-button');

const gridSize = 60;
const cols = 9;
const rows = 10;
const pieceRadius = 24;

let currentTurn = 'red'; // 'red' 或 'black'
let pieces = [];
let selected = null;
let legalMoves = [];

// --- 初始化棋子（與你給的初始位置一致） ---
function initPieces() {
    pieces = [
        // 紅方 (y=0 為上方)
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

        // 黑方
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

// --- 輔助查找 ---
function getPieceAt(x, y) {
    return pieces.find(p => p.x === x && p.y === y);
}
function removePieceAt(x, y) {
    pieces = pieces.filter(p => !(p.x === x && p.y === y));
}
function withinBoard(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
}
function sameColor(a, b) {
    return a && b && a.color === b.color;
}

// --- 棋盤 / 繪圖 ---
function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 背景格線（交叉點制）
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    // 橫線
    for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * gridSize);
        ctx.lineTo((cols - 1) * gridSize, r * gridSize);
        ctx.stroke();
    }
    // 直線
    for (let c = 0; c < cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * gridSize, 0);
        ctx.lineTo(c * gridSize, (rows - 1) * gridSize);
        ctx.stroke();
    }

    // 畫九宮斜線（上方與下方九宮）
    ctx.beginPath();
    ctx.moveTo(3 * gridSize, 0);
    ctx.lineTo(5 * gridSize, 2 * gridSize);
    ctx.moveTo(5 * gridSize, 0);
    ctx.lineTo(3 * gridSize, 2 * gridSize);
    ctx.moveTo(3 * gridSize, 7 * gridSize);
    ctx.lineTo(5 * gridSize, 9 * gridSize);
    ctx.moveTo(5 * gridSize, 7 * gridSize);
    ctx.lineTo(3 * gridSize, 9 * gridSize);
    ctx.stroke();

    // river 標示文字
    ctx.font = '18px Microsoft JhengHei';
    ctx.fillStyle = '#000';
    ctx.fillText('楚河', 1 * gridSize + 10, 4.5 * gridSize);
    ctx.fillText('漢界', 6 * gridSize - 10, 4.5 * gridSize);
}

function drawPieces() {
    pieces.forEach(p => {
        const cx = p.x * gridSize;
        const cy = p.y * gridSize;

        // 外圈
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.arc(cx, cy, pieceRadius + 2, 0, Math.PI * 2);
        ctx.fill();

        // 內圈顏色代表陣營
        ctx.beginPath();
        ctx.fillStyle = p.color === 'red' ? '#e74c3c' : '#2c3e50';
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // 文字
        ctx.fillStyle = '#fff';
        ctx.font = '20px Microsoft JhengHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type, cx, cy);
    });

    // 選取提示
    if (selected) {
        const sx = selected.x * gridSize;
        const sy = selected.y * gridSize;
        ctx.beginPath();
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 3;
        ctx.arc(sx, sy, pieceRadius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    // 合法走位點標示
    legalMoves.forEach(m => {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0,255,0,0.6)';
        ctx.arc(m.x * gridSize, m.y * gridSize, 8, 0, Math.PI * 2);
        ctx.fill();
    });
}

// --- 規則檢查工具函式 ---
// 路徑是否無阻（只檢查直線、水平/垂直）
function pathClearStraight(sx, sy, tx, ty) {
    if (sx === tx) {
        const dir = ty > sy ? 1 : -1;
        for (let y = sy + dir; y !== ty; y += dir) {
            if (getPieceAt(sx, y)) return false;
        }
        return true;
    } else if (sy === ty) {
        const dir = tx > sx ? 1 : -1;
        for (let x = sx + dir; x !== tx; x += dir) {
            if (getPieceAt(x, sy)) return false;
        }
        return true;
    }
    return false;
}

// 計算直線上間隔的子數（不含端點）
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

// 檢查馬腿、象眼阻擋
function isHorseBlocked(sx, sy, tx, ty) {
    // 馬走日：先直一再斜一。判斷直的一步是否被擋
    const dx = tx - sx;
    const dy = ty - sy;
    if (Math.abs(dx) === 2 && Math.abs(dy) === 1) {
        const midx = sx + (dx / 2);
        return !!getPieceAt(midx, sy);
    }
    if (Math.abs(dx) === 1 && Math.abs(dy) === 2) {
        const midy = sy + (dy / 2);
        return !!getPieceAt(sx, midy);
    }
    return false;
}
function isElephantBlocked(sx, sy, tx, ty) {
    // 象走田：2格對角，檢查中點是否有子
    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    return !!getPieceAt(mx, my);
}

// 九宮格判斷
function inPalace(x, y, color) {
    if (color === 'red') {
        return x >= 3 && x <= 5 && y >= 0 && y <= 2;
    } else {
        return x >= 3 && x <= 5 && y >= 7 && y <= 9;
    }
}

// 找到某顏色的將/帥
function findGeneral(color) {
    return pieces.find(p => (color === 'red' ? p.type === '帥' : p.type === '將') && p.color === color);
}

// --- 單純判斷能否攻擊目標的函式（不考慮自我將軍情況） ---
// 用於判斷"對方是否能吃到指定格"（例如判 own-general 是否處於被攻擊狀態）
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
            if (!target) { // 非吃子，路徑需空
                return between === 0;
            } else { // 吃子時必須恰好隔一子
                return between === 1;
            }
        case '馬':
            if (!((Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2))) return false;
            if (isHorseBlocked(sx, sy, tx, ty)) return false;
            return true;
        case '象':
        case '相':
            if (!(Math.abs(dx) === 2 && Math.abs(dy) === 2)) return false;
            if (isElephantBlocked(sx, sy, tx, ty)) return false;
            // 象不能過河：依照 y 分界（河在 4 和 5 之間）
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
            // 將帥只可在九宮內且走一步 orthogonal
            if (!( (Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0) )) return false;
            if (!inPalace(tx, ty, piece.color)) return false;
            return true;
        case '兵':
        case '卒':
            const forward = piece.color === 'red' ? 1 : -1; // red 往下 (y 增), black 往上 (y 減)
            if (dx === 0 && dy === forward && !target) return true; // 向前一步（非吃子必須空格）
            // 過河後可左右走一步
            const crossed = piece.color === 'red' ? piece.y >= 5 : piece.y <= 4;
            if (crossed && Math.abs(dx) === 1 && dy === 0) return true;
            // 兵不可以後退
            return false;
        default:
            return false;
    }
}

// --- 判斷某顏色是否處於被將軍狀態 ---
function isInCheck(color) {
    const general = findGeneral(color);
    if (!general) return true; // 已無將（被吃），視為被將
    // 檢查對方任一子是否可以攻擊到 general 的位子
    for (const p of pieces) {
        if (p.color !== color) {
            if (canPieceAttack(p, general.x, general.y)) return true;
            // 特別情況：將帥見面（同列無子夾）視為被攻擊
            if ((p.type === '將' || p.type === '帥') && p.x === general.x) {
                const between = countPiecesBetween(p.x, p.y, general.x, general.y);
                if (between === 0) return true;
            }
        }
    }
    return false;
}

// --- 檢查移動合法性（包含不使自己被將軍） ---
function isValidMove(piece, tx, ty) {
    if (!withinBoard(tx, ty)) return false;
    if (piece.x === tx && piece.y === ty) return false;
    const target = getPieceAt(tx, ty);
    if (target && target.color === piece.color) return false;

    // 先用 canPieceAttack 檢查基本移動/吃法（不考慮自將）
    if (!canPieceAttack(piece, tx, ty)) return false;

    // 額外檢查：如果移動後會讓自己的將被對方吃掉（或將帥見面），則不合法
    // 做「假走一步」
    const backupFrom = { x: piece.x, y: piece.y };
    const backupTaken = getPieceAt(tx, ty) ? { ...getPieceAt(tx, ty) } : null;
    // apply
    piece.x = tx; piece.y = ty;
    if (backupTaken) {
        pieces = pieces.filter(p => !(p.x === tx && p.y === ty && p !== piece));
    }

    // 檢查 own color 是否被將
    const illegal = isInCheck(piece.color);

    // revert
    piece.x = backupFrom.x; piece.y = backupFrom.y;
    if (backupTaken) pieces.push(backupTaken);

    return !illegal;
}

// --- 計算一子所有合法走位（用於顯示提示） ---
function computeLegalMoves(piece) {
    const moves = [];
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (isValidMove(piece, x, y)) moves.push({ x, y });
        }
    }
    return moves;
}

// --- 事件處理: 點擊 ---
canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    const gx = Math.round(cx / gridSize);
    const gy = Math.round(cy / gridSize);

    if (!withinBoard(gx, gy)) return;

    const clicked = getPieceAt(gx, gy);

    if (selected) {
        // 如果點到同色子，改選
        if (clicked && clicked.color === currentTurn) {
            selected = clicked;
            legalMoves = computeLegalMoves(selected);
            render();
            return;
        }
        // 嘗試走 selected -> (gx,gy)
        const moveOk = legalMoves.some(m => m.x === gx && m.y === gy);
        if (moveOk) {
            // 如果有敵方子，吃掉
            if (clicked && clicked.color !== selected.color) {
                // 吃子
                pieces = pieces.filter(p => !(p.x === gx && p.y === gy));
            }
            // 移動
            selected.x = gx; selected.y = gy;

            // 檢查是否吃到對方將帥（遊戲結束）
            const oppGeneral = findGeneral(currentTurn === 'red' ? 'black' : 'red');
            if (!oppGeneral || (oppGeneral.x === gx && oppGeneral.y === gy)) {
                // 對方將被吃掉
                render();
                setTimeout(() => {
                    alert(`${currentTurn === 'red' ? '紅方' : '黑方'} 勝利！`);
                }, 10);
                // 停在該局面，但不再切換回合
                selected = null;
                legalMoves = [];
                turnIndicator.textContent = `${currentTurn === 'red' ? '紅方' : '黑方'} 勝利`;
                return;
            }

            // 換手前檢查「將帥見面」情況：若換手後自己處於被將狀態則理論上isValidMove已排除
            currentTurn = currentTurn === 'red' ? 'black' : 'red';
            turnIndicator.textContent = `輪到 ${currentTurn === 'red' ? '紅方' : '黑方'}`;

            // 換手後若對方已經被將軍（check），顯示提示
            if (isInCheck(currentTurn)) {
                // 小提示（不阻止遊戲）
                console.log(`${currentTurn === 'red' ? '紅方' : '黑方'} 被將軍！`);
            }

            selected = null;
            legalMoves = [];
            render();
            return;
        } else {
            // 非合法走法，取消選取或改選
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
        // 未選，點到自己的子則選取
        if (clicked && clicked.color === currentTurn) {
            selected = clicked;
            legalMoves = computeLegalMoves(selected);
            render();
            return;
        }
    }
});

// 重新開始
restartButton.addEventListener('click', () => {
    initPieces();
    currentTurn = 'red';
    selected = null;
    legalMoves = [];
    turnIndicator.textContent = '輪到 紅方';
    render();
});

// --- 繪製主流程 ---
function render() {
    drawBoard();
    drawPieces();
}

initPieces();
render();
