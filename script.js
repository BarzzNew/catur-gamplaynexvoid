(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const PIECES = {
    w: {k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},
    b: {k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}
  };
  const files = "abcdefgh";
  let game = null, mode = "ai", flipped = false, selected = null, legalTargets = [], hintMove = null;
  let lastMove = null, aiThinking = false, soundOn = false, toastTimer = null;
  let historySnapshots = [];
  const chessLoaded = () => typeof window.Chess === "function";
  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }
  function openModal(title, text, actions = [{label:"Oke", primary:true, action:closeModal}]) {
    $("#modalTitle").textContent = title; $("#modalText").textContent = text;
    const area = $("#modalActions"); area.innerHTML = "";
    actions.forEach(a => {
      const b = document.createElement("button"); b.textContent = a.label;
      if (a.primary) b.classList.add("primary");
      b.addEventListener("click", () => a.action()); area.appendChild(b);
    });
    $("#modal").classList.remove("hidden");
  }
  function closeModal(){ $("#modal").classList.add("hidden"); }
  function showLanding(){ $("#game").classList.add("hidden"); $("#landing").classList.remove("hidden"); selected=null; hintMove=null; }
  function showGame(nextMode) {
    mode = nextMode; flipped = false; selected = null; hintMove = null; lastMove = null; historySnapshots = [];
    if (!chessLoaded()) {
      openModal("Library belum termuat", "Koneksi internet dibutuhkan untuk memuat aturan catur (chess.js). Periksa koneksi lalu refresh halaman.");
      return;
    }
    game = new Chess();
    $("#landing").classList.add("hidden"); $("#game").classList.remove("hidden");
    $("#difficultyWrap").classList.toggle("hidden", mode !== "ai");
    $("#gameTitle").textContent = mode === "ai" ? "Lawan AI" : "2 Player";
    $("#topName").textContent = mode === "ai" ? "Nexvoid AI" : "Player 2";
    $("#bottomName").textContent = mode === "ai" ? "You" : "Player 1";
    $("#topSub").textContent = "Black pieces"; $("#bottomSub").textContent = "White pieces";
    render(); window.scrollTo({top:0,behavior:"smooth"});
  }
  function boardSquares() {
    const rows = [];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
      const rank = flipped ? r+1 : 8-r;
      const file = flipped ? files[7-c] : files[c];
      rows.push({square:file+rank, rank, file, r, c, light:(r+c)%2===0});
    }
    return rows;
  }
  function renderBoard() {
    const board = $("#board"); board.innerHTML = "";
    const squares = boardSquares();
    squares.forEach(({square,light}) => {
      const el = document.createElement("button"); el.type="button"; el.className="square "+(light?"light":"dark");
      el.setAttribute("role","gridcell"); el.setAttribute("aria-label",square);
      const piece = game.get(square);
      if(lastMove && (lastMove.from===square || lastMove.to===square)) el.classList.add("last-move");
      if(selected===square) el.classList.add("selected");
      if(legalTargets.includes(square)) { el.classList.add("legal"); if(piece) el.classList.add("capture"); }
      if(hintMove && (hintMove.from===square || hintMove.to===square)) el.classList.add("hint-square");
      if(piece) {
        const span=document.createElement("span"); span.className="piece "+(piece.color==="w"?"white-piece":"black-piece");
        span.textContent=PIECES[piece.color][piece.type]; el.appendChild(span);
      }
      el.addEventListener("click",()=>onSquareClick(square)); board.appendChild(el);
    });
    $("#rankLabels").innerHTML = (flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1]).map(n=>`<span>${n}</span>`).join("");
    $("#fileLabels").innerHTML = (flipped ? [...files].reverse() : [...files]).map(f=>`<span>${f}</span>`).join("");
  }
  function renderHistory() {
    const history = game.history({verbose:true}), area=$("#moveHistory"); area.innerHTML="";
    $("#moveCount").textContent = `${history.length} plies`;
    if(!history.length){area.innerHTML='<p class="empty-history">Moves will appear here.</p>';return;}
    for(let i=0;i<history.length;i+=2){
      const row=document.createElement("div"); row.className="history-row";
      const num=document.createElement("span"); num.className="history-number"; num.textContent=(i/2+1)+".";
      const white=document.createElement("span"); white.className="history-move"; white.textContent=history[i].san;
      const black=document.createElement("span"); black.className="history-move"; black.textContent=history[i+1]?.san||"";
      row.append(num,white,black); area.appendChild(row);
    }
    area.scrollTop=area.scrollHeight;
  }
  function statusText() {
    if(game.in_checkmate()) return game.turn()==="w" ? "Black wins by checkmate!" : "White wins by checkmate!";
    if(game.in_stalemate()) return "Draw by stalemate.";
    if(game.in_draw()) return "Game drawn.";
    if(game.in_check()) return (game.turn()==="w"?"White":"Black")+" is in check!";
    return (game.turn()==="w"?"White":"Black")+" to move";
  }
  function renderStatus() {
    const over=game.game_over(), turn=game.turn();
    $("#turnPiece").textContent=PIECES[turn].p;
    $("#turnText").textContent=over?"Game finished":(turn==="w"?"White to move":"Black to move");
    $("#gameStatus").textContent=game.in_checkmate()?"Checkmate":game.in_stalemate()?"Stalemate":game.in_draw()?"Draw":game.in_check()?"Check!":"Game in progress";
    $("#statusBanner").textContent=game.in_checkmate()?"Skakmat! Permainan selesai.":game.in_stalemate()?"Stalemate — tidak ada langkah legal.":game.in_draw()?"Hasil seri.":game.in_check()?"Raja sedang diserang!":(mode==="ai"&&turn==="b"?"AI sedang berpikir...":turn==="w"?"Giliran putih. Tentukan langkahmu.":"Giliran hitam.");
    $("#topTurn").classList.toggle("active",turn==="b"&&!over); $("#bottomTurn").classList.toggle("active",turn==="w"&&!over);
  }
  function render() { if(!game)return; renderBoard();renderHistory();renderStatus(); }
  function onSquareClick(square) {
    if(!game || game.game_over() || aiThinking || (mode==="ai"&&game.turn()==="b")) return;
    const piece=game.get(square);
    if(selected && legalTargets.includes(square)) { makeMove(selected,square); return; }
    if(piece && piece.color===game.turn()) {
      selected=square; legalTargets=game.moves({square,verbose:true}).map(m=>m.to); hintMove=null; renderBoard();
    } else { selected=null; legalTargets=[]; renderBoard(); }
  }
  function makeMove(from,to,promotion="q") {
    try {
      const move=game.move({from,to,promotion});
      if(!move)return false;
      historySnapshots.push(move); lastMove={from:move.from,to:move.to}; selected=null; legalTargets=[]; hintMove=null;
      if(soundOn) { try { const ctx=new (window.AudioContext||window.webkitAudioContext)(); const osc=ctx.createOscillator(); const gain=ctx.createGain(); osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=move.captured?260:420;gain.gain.value=.035;osc.start();osc.stop(ctx.currentTime+.07); } catch(e){} }
      render();
      if(game.game_over()) { setTimeout(()=>endGame(),250); return true; }
      if(mode==="ai"&&game.turn()==="b") setTimeout(aiMove,280);
      return true;
    } catch(e) { return false; }
  }
  const values={p:100,n:320,b:335,r:500,q:900,k:20000};
  function evaluatePosition(g) {
    if(g.in_checkmate()) return g.turn()==="w"?-100000:100000;
    let score=0;
    const board=g.board();
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=board[r][c]; if(!p)continue;
      let v=values[p.type];
      const center=3.5-(Math.abs(3.5-r)+Math.abs(3.5-c))/2;
      if(p.type==="p") v+=(p.color==="w"?(6-r):(r-1))*5;
      if(["n","b"].includes(p.type))v+=center*7;
      if(p.type==="q")v+=center*2;
      score+=(p.color==="w"?v:-v);
    }
    return score;
  }
  function minimax(g,depth,alpha,beta,maximizing) {
    if(depth===0||g.game_over())return evaluatePosition(g);
    const moves=g.moves({verbose:true});
    moves.sort((a,b)=>((b.captured?values[b.captured]:0)-(a.captured?values[a.captured]:0)));
    if(maximizing) {
      let best=-Infinity;
      for(const m of moves){g.move(m);best=Math.max(best,minimax(g,depth-1,alpha,beta,false));g.undo();alpha=Math.max(alpha,best);if(beta<=alpha)break;}
      return best;
    } else {
      let best=Infinity;
      for(const m of moves){g.move(m);best=Math.min(best,minimax(g,depth-1,alpha,beta,true));g.undo();beta=Math.min(beta,best);if(beta<=alpha)break;}
      return best;
    }
  }
  function aiMove() {
    if(!game||game.game_over()||game.turn()!=="b")return;
    aiThinking=true; renderStatus();
    const level=Number($("#difficulty").value); const depth=level===1?1:level===2?2:3;
    // Search is small enough for a browser; level 3 uses a capped move set for responsiveness.
    let moves=game.moves({verbose:true});
    if(!moves.length){aiThinking=false;endGame();return;}
    moves.sort((a,b)=>((b.captured?values[b.captured]:0)-(a.captured?values[a.captured]:0)));
    if(level===3&&moves.length>22)moves=moves.slice(0,22);
    let best=Infinity, candidates=[];
    for(const m of moves){
      game.move(m); const score=minimax(game,depth-1,-Infinity,Infinity,true);game.undo();
      if(score<best){best=score;candidates=[m];}else if(score===best)candidates.push(m);
    }
    const chosen=candidates[Math.floor(Math.random()*candidates.length)]||moves[Math.floor(Math.random()*moves.length)];
    aiThinking=false; makeMove(chosen.from,chosen.to,chosen.promotion||"q");
  }
  function endGame() {
    if(!game)return;
    let title="Permainan selesai",message=statusText();
    if(game.in_checkmate()) { title="Skakmat!"; message=game.turn()==="w"?"AI menang. Coba strategi baru dan main lagi!":"Keren! Kamu menang melawan AI."; }
    else if(game.in_stalemate())message="Seri karena stalemate.";
    else if(game.in_draw())message="Permainan berakhir seri.";
    openModal(title,message,[{label:"Main lagi",primary:true,action:()=>{closeModal();showGame(mode)}},{label:"Dashboard",action:()=>{closeModal();showLanding()}}]);
  }
  function getHint() {
    if(!game||game.game_over()|| (mode==="ai"&&game.turn()==="b"))return;
    const moves=game.moves({verbose:true}); if(!moves.length)return;
    let bestMove=moves[0], best=game.turn()==="w"?-Infinity:Infinity;
    for(const m of moves){
      game.move(m);const score=evaluatePosition(game);game.undo();
      if(game.turn()==="w"?score>best:score<best){best=score;bestMove=m;}
    }
    hintMove={from:bestMove.from,to:bestMove.to};renderBoard();toast(`Petunjuk: ${bestMove.from} → ${bestMove.to}`);
  }
  function undoMove() {
    if(!game||!game.history().length)return toast("Belum ada langkah untuk di-undo.");
    if(mode==="ai"&&game.history().length>=2){game.undo();game.undo();}
    else game.undo();
    const h=game.history({verbose:true});lastMove=h.length?{from:h[h.length-1].from,to:h[h.length-1].to}:null;
    selected=null;legalTargets=[];hintMove=null;aiThinking=false;render();toast("Langkah terakhir dibatalkan.");
  }
  function newGameConfirm() {
    openModal("Mulai game baru?", "Posisi papan dan riwayat langkah saat ini akan direset.", [
      {label:"Batal",action:closeModal},{label:"Mulai ulang",primary:true,action:()=>{closeModal();showGame(mode)}}
    ]);
  }
  function rules() {
    openModal("Aturan dasar catur", "• Tujuan utama: skakmat raja lawan.\n• Putih selalu bergerak lebih dulu.\n• Setiap bidak punya pola gerak berbeda.\n• Raja tidak boleh dibiarkan dalam posisi skak.\n• Rokade, en passant, dan promosi pion didukung.\n• Seri bisa terjadi melalui stalemate, pengulangan posisi, atau aturan remis lainnya.\n\nKlik bidak untuk melihat kotak tujuan legal. Petunjuk memberi saran langkah sederhana.",[{label:"Mengerti",primary:true,action:closeModal}]);
  }
  document.querySelectorAll("[data-mode]").forEach(btn=>btn.addEventListener("click",()=>{
    const m=btn.dataset.mode;
    if(m==="online"){openModal("Multiplayer Online", "Fitur multiplayer online masih dalam pengembangan. Versi ini sudah bisa dimainkan offline melawan AI atau bersama teman di satu perangkat.",[{label:"Siap, mengerti",primary:true,action:closeModal}]);return;}
    showGame(m);
  }));
  $("#backHome").addEventListener("click",showLanding);$("#brandHome").addEventListener("click",e=>{e.preventDefault();showLanding();});
  $("#undoBtn").addEventListener("click",undoMove);$("#hintBtn").addEventListener("click",getHint);
  $("#flipBtn").addEventListener("click",()=>{flipped=!flipped;renderBoard();});
  $("#newGameBtn").addEventListener("click",newGameConfirm);
  $("#rulesOpen").addEventListener("click",rules);$("#rulesOpenGame").addEventListener("click",rules);
  $("#modalClose").addEventListener("click",closeModal);
  $("#modal").addEventListener("click",e=>{if(e.target===$("#modal"))closeModal();});
  $("#soundToggle").addEventListener("click",()=>{soundOn=!soundOn;$("#soundToggle").textContent=soundOn?"♫":"♪";$("#soundToggle").style.color=soundOn?"var(--accent)":"var(--text)";toast(soundOn?"Sound aktif":"Sound nonaktif");});
  // Friendly promotion flow: default queen promotion is applied automatically by chess.js.
  window.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});
  setTimeout(()=>{$("#loader").classList.add("hidden");$("#app").classList.remove("hidden");},1350);
})();