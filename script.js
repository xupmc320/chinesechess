const canvas = document.getElementById('chessCanvas');
const ctx = canvas.getContext('2d');

// 棋盤參數
const gridSize = 60;
const cols = 9;
const rows = 10;
const pieceRadius = 24;
const margin = pieceRadius * 2;

// 設定 canvas 尺寸
canvas.width = (cols - 1) * gridSize + margin * 2;
canvas.height = (rows - 1) * gridSize + margin * 2;

// 遊戲狀態
let board = [];
let selectedPiece = null;
let currentTurn = 'red';
let moveHistory = []; // 悔棋記錄

// 棋子初始佈局
function initBoard() {
    board = Array(rows).fill(null).map(() => Array(cols).fill(null));
    const redPieces = [
        ['車',0,9],['馬',1,9],['象',2,9],['士',3,9],['將',4,9],['士',5,9],['象',6,9],['馬',7,9],['車',8,9],
        ['炮',1,7],['炮',7,7],
        ['兵',0,6],['兵',2,6],['兵',4,6],['兵',6,6],['兵',8,6]
    ];
    const blackPieces = [
        ['車',0,0],['馬',1,0],['象',2,0],['士',3,0],['帥',4,0],['士',5,0],['象',6,0],['馬',7,0],['車',8,0],
        ['炮',1,2],['炮',7,2],
        ['卒',0,3],['卒',2,3],['卒',4,3],['卒',6,3],['卒',8,3]
    ];
    redPieces.forEach(([name,x,y]) => board[y][x] = {name,color:'red',x,y});
    blackPieces.forEach(([name,x,y]) => board[y][x] = {name,color:'black',x,y});
}

// 畫棋盤
function drawBoard() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    const startX = margin;
    const startY = margin;

    // 畫橫線
    for (let i=0;i<rows;i++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + i*gridSize);
        ctx.lineTo(startX + (cols-1)*gridSize, startY + i*gridSize);
        ctx.stroke();
    }

    // 畫豎線
    for (let i=0;i<cols;i++) {
        ctx.beginPath();
        ctx.moveTo(startX + i*gridSize, startY);
        if (i===0 || i===cols-1) {
            ctx.lineTo(startX + i*gridSize, startY + (rows-1)*gridSize);
        } else {
            ctx.lineTo(startX + i*gridSize, startY + 4*gridSize);
            ctx.moveTo(startX + i*gridSize, startY + 5*gridSize);
            ctx.lineTo(startX + i*gridSize, startY + (rows-1)*gridSize);
        }
        ctx.stroke();
    }

    // 畫九宮斜線
    ctx.beginPath();
    ctx.moveTo(startX+3*gridSize, startY);
    ctx.lineTo(startX+5*gridSize, startY+2*gridSize);
    ctx.moveTo(startX+5*gridSize, startY);
    ctx.lineTo(startX+3*gridSize, startY+2*gridSize);
    ctx.moveTo(startX+3*gridSize, startY+7*gridSize);
    ctx.lineTo(startX+5*gridSize, startY+9*gridSize);
    ctx.moveTo(startX+5*gridSize, startY+7*gridSize);
    ctx.lineTo(startX+3*gridSize, startY+9*gridSize);
    ctx.stroke();

    // 畫棋子
    for (let y=0;y<rows;y++) {
        for (let x=0;x<cols;x++) {
            const piece = board[y][x];
            if (piece) drawPiece(piece);
        }
    }
}

// 畫單個棋子
function drawPiece(piece) {
    const px = margin + piece.x*gridSize;
    const py = margin + piece.y*gridSize;
    ctx.beginPath();
    ctx.arc(px, py, pieceRadius, 0, Math.PI*2);
    ctx.fillStyle = '#f5deb3';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.fillStyle = piece.color === 'red' ? 'red' : 'black';
    ctx.font = '20px Microsoft JhengHei';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(piece.name, px, py);
}

// 點擊事件
canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - margin;
    const my = e.clientY - rect.top - margin;
    const x = Math.round(mx / gridSize);
    const y = Math.round(my / gridSize);
    if (x<0||x>=cols||y<0||y>=rows) return;

    const clicked = board[y][x];
    if (selectedPiece) {
        if (canMove(selectedPiece, x, y)) {
            // 儲存歷史
            moveHistory.push({
                board: JSON.parse(JSON.stringify(board)),
                currentTurn
            });
            movePiece(selectedPiece, x, y);
            currentTurn = currentTurn === 'red' ? 'black' : 'red';
            document.getElementById('turn-indicator').textContent = `輪到 ${currentTurn==='red'?'紅方':'黑方'}`;
            selectedPiece = null;
        } else {
            selectedPiece = clicked && clicked.color === currentTurn ? clicked : null;
        }
    } else {
        if (clicked && clicked.color === currentTurn) {
            selectedPiece = clicked;
        }
    }
    drawBoard();
});

// 移動棋子
function movePiece(piece, x, y) {
    board[piece.y][piece.x] = null;
    piece.x = x; piece.y = y;
    board[y][x] = piece;
}

// 判斷走法合法性
function canMove(piece, x, y) {
    if (x===piece.x && y===piece.y) return false;
    const target = board[y][x];
    if (target && target.color === piece.color) return false;
    const dx = x - piece.x;
    const dy = y - piece.y;

    switch(piece.name) {
        case '車':
            if (dx===0 || dy===0) return clearPath(piece.x, piece.y, x, y);
            return false;
        case '馬':
            if ((Math.abs(dx)===1 && Math.abs(dy)===2) || (Math.abs(dx)===2 && Math.abs(dy)===1)) {
                const legX = piece.x + (Math.abs(dx)===2 ? dx/2 : 0);
                const legY = piece.y + (Math.abs(dy)===2 ? dy/2 : 0);
                return !board[legY][legX];
            }
            return false;
        case '炮':
            if (dx===0 || dy===0) {
                const count = countPiecesBetween(piece.x, piece.y, x, y);
                if (!target) return count===0;
                else return count===1;
            }
            return false;
        case '象':
            if (Math.abs(dx)===2 && Math.abs(dy)===2) {
                if (piece.color==='red' && y<5) return false;
                if (piece.color==='black' && y>4) return false;
                return !board[piece.y+dy/2][piece.x+dx/2];
            }
            return false;
        case '士':
            if (Math.abs(dx)===1 && Math.abs(dy)===1) {
                const palaceX = x>=3 && x<=5;
                const palaceY = piece.color==='red' ? (y>=7 && y<=9) : (y>=0 && y<=2);
                return palaceX && palaceY;
            }
            return false;
        case '將':
        case '帥':
            if (Math.abs(dx)+Math.abs(dy)===1) {
                const palaceX = x>=3 && x<=5;
                const palaceY = piece.color==='red' ? (y>=7 && y<=9) : (y>=0 && y<=2);
                return palaceX && palaceY;
            }
            // 將帥對面
            if (x===piece.x) {
                let step = dy>0?1:-1;
                let cy = piece.y+step;
                while (cy!==y && !board[cy][x]) cy+=step;
                if (cy===y && target && (target.name==='將' || target.name==='帥')) return true;
            }
            return false;
        case '兵':
        case '卒':
            const forward = piece.color==='red' ? -1 : 1;
            if (dx===0 && dy===forward) return true; // 可直走吃子
            const crossed = piece.color==='red' ? piece.y<=4 : piece.y>=5;
            if (crossed && Math.abs(dx)===1 && dy===0) return true;
            return false;
    }
    return false;
}

// 工具函式
function clearPath(x1,y1,x2,y2) {
    const dx = Math.sign(x2-x1);
    const dy = Math.sign(y2-y1);
    let cx = x1+dx, cy = y1+dy;
    while (cx!==x2 || cy!==y2) {
        if (board[cy][cx]) return false;
        cx+=dx; cy+=dy;
    }
    return true;
}
function countPiecesBetween(x1,y1,x2,y2) {
    let count=0;
    const dx = Math.sign(x2-x1);
    const dy = Math.sign(y2-y1);
    let cx = x1+dx, cy = y1+dy;
    while (cx!==x2 || cy!==y2) {
        if (board[cy][cx]) count++;
        cx+=dx; cy+=dy;
    }
    return count;
}

// 悔棋
function undoMove() {
    if (moveHistory.length===0) return;
    const lastState = moveHistory.pop();
    board = JSON.parse(JSON.stringify(lastState.board));
    currentTurn = lastState.currentTurn;
    selectedPiece = null;
    document.getElementById('turn-indicator').textContent = `輪到 ${currentTurn==='red'?'紅方':'黑方'}`;
    drawBoard();
}

// 綁定按鈕
document.getElementById('restart-button').addEventListener('click', () => {
    initBoard();
    moveHistory = [];
    currentTurn = 'red';
    selectedPiece = null;
    document.getElementById('turn-indicator').textContent = '輪到 紅方';
    drawBoard();
});
document.getElementById('undo-button').addEventListener('click', undoMove);

// 初始化
initBoard();
drawBoard();
