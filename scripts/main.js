console.clear();

const model = {
  synth: window.speechSynthesis,
  voices: '',
  msg: new SpeechSynthesisUtterance('would you like to play a game?'),
  matrix: {0: 'topLeft', 1: 'topMid', 2: 'topRight', 3: 'midLeft', 4: 'midMid', 5: 'midRight', 6: 'botLeft', 7: 'botMid', 8: 'botRight'},
  winCombos: ['0.?.?1.?.?2', '3.?.?4.?.?5', '6.?.?7.?.?8', '0.?.?3.?.?6', '1.?.?4.?.?7', '2.?.?5.?.?8', '0.?.?4.?.?8', '2.?.?4.?.?6'],
  squares: document.querySelectorAll('.square'),
  getSquare: function(id) {return document.querySelector(`.${id}`)},
  gameBoard: document.querySelector('.game-board'),
  prompt: document.querySelector('.prompt'),
  startHTML: `<p>choose a side</p>
        <div class="sides">
          <div class="side X">X</div>
          <div class="side O">O</div>
        </div>`,
  choiceHTML: function(user) {
    return `<p>good luck ${user}</p>`
  },
  gameOverWinHTML: function(winner) {
    return `<p>${winner} wins!<br>try again?</p>
            <div class="sides">
              <div class="side X">yes</div>
              <div class="side O">no</div>
            </div>`
  },
  gameOverTieHTML: function() {
    return `<p> AI is tough to beat...<br> try again?</p>
            <div class="sides">
              <div class="side X">yes</div>
              <div class="side O">no</div>
            </div>`
  },
  goodByeHTML: function() {return `<p> Thanks for playing!`}
}; //end of model


const state = {
  winCombos: ['0.?.?1.?.?2', '3.?.?4.?.?5', '6.?.?7.?.?8', '0.?.?3.?.?6', '1.?.?4.?.?7', '2.?.?5.?.?8', '0.?.?4.?.?8', '2.?.?4.?.?6'],
  game: [],
  currentGame: ['','','',
                '','','',
                '','',''],
  winTie: [false, null],
  AI: '',
  opponent: '',
  turn: '',
  numNodes: 0
}

const control = {
  
  setPrompt: function(html, _state) {
    // console.log('setPrompt', state)
    model.prompt.innerHTML = html;
    window.getComputedStyle(model.prompt).getPropertyValue('opacity');//cause page reflow otherwise initial transition doesn't work
    this.promptOptions(_state);//set specifics for which prompt is being called
  },

  promptOptions: function(_state) {
    switch (_state) {
      case 'start':
        this.togglePrompt();
        
        model.prompt.addEventListener('click', function(e) {
          e.target.classList.contains('X') ? state.opponent = 'X' : state.opponent = 'O'; //set player
          state.opponent === 'X' ? state.AI = 'O' : state.AI = 'X'; //set computer
          this.removeEventListener('click', arguments.callee);
          control.setPrompt(model.choiceHTML(state.opponent), 'pickSide');
          state.turn = state.opponent;
        });
      break;
        
      case 'pickSide':
        setTimeout(function() {
          control.togglePrompt();
        }, 100);
        control.setSquareListeners()
        break;
        
      case 'gameOver':
        this.togglePrompt();
        
        model.prompt.addEventListener('click', function(e) {
          if (e.target.classList.contains('X')) {
            control.togglePrompt();
            control.init('restart') 
          } else {
            control.setPrompt(model.goodByeHTML(), 'goodBye');
          }
          this.removeEventListener('click', arguments.callee);
          
        });
        
        break;
      case 'goodBye':
        setTimeout(function() {
          control.togglePrompt();
        }, 300)
        break;
    }//end of switch
    console.log('promptOptions', 'user= ' + state.opponent, 'AI= ' + state.AI)
  },
  
  togglePrompt: function() {
    if (!model.prompt.classList.contains('show')) {
      model.prompt.style.transition = 'opacity, 0.5s linear, visibility 0s linear 0s';
      model.prompt.classList.toggle('show');
      
    } else {
      // model.prompt.style.visibility = 'hidden';
      model.prompt.style.transition = 'opacity, 0.5s linear, visibility 0s linear 0.5s';
      model.prompt.classList.toggle('show');
    }
  },

  setSquareListeners: function(e) {
    // console.log('setSquareListeners', e);
        model.squares.forEach(square => {
          square.classList.add('hover');
          square.addEventListener('mouseenter', view.hover);
          square.addEventListener('mouseleave', view.hover);
          square.addEventListener('click', control.squareClicked);
      }) 
  },

  squareClicked: function(e) {
    // console.log('squareClicked, current turn', current.turn)
    control.makeInactive(e.target, 'click', control.squareClicked);
    control.makeInactive(e.target, 'mouseenter', view.hover);
    control.makeInactive(e.target, 'mouseleave', view.hover);
    e.target.style.opacity = '1';
    control.assessMove(e.target);
    // console.log('squareClicked', e.target.id);
  },

  makeInactive: function(target, event, func) {
    target.removeEventListener(event, func);
    target.classList.remove('hover');
    // console.log('makeInactive', target.id);
  },

  assessMove: function(target) {
    //place move in array and on game board
    state.currentGame[target.id] = state.turn;
    view.placeMove(target);
    //is game over? 
    if (control.win(state.currentGame, 0) !== null) {
      control.gameOver();
      return;
    }
   
    //whose turn is it? if it's AI initiate AI turn
    state.turn === 'X' ? state.turn = 'O' : state.turn = 'X';
    if (state.turn === state.AI) {
      // console.log('current turn', current.turn)
      control.moveLogic(control.AiMove(state.currentGame, state.turn));
    }
  },
  //click the square for the AI's turn.
  moveLogic: function(minMaxResult) {
    // console.log('@ moveLogic, val is = ', minMaxResult)
    model.getSquare(model.matrix[minMaxResult]).click();//use the matrix to find the square to click
  },
  
  win: function(game, indx) {
    let optimize = indx;//prioritize higher index losses...made game last longer...made opp work harder 
    let regex;
    let outcomeVal = null;
    //convert each players moves to a string
    let AImoves = game.reduce(function(acc, move, index){
      if (move === state.AI) acc.push(index);
      return acc;
    },[]).join('');
    let oppMoves = game.reduce(function(acc, move, index){
      if (move === state.opponent) acc.push(index);
      return acc;
    },[]).join('');
    
    //check moves against winning combinations...player win? opponent win?
    for (c=0; c<state.winCombos.length; c++) {
      if (outcomeVal) return outcomeVal;
      regex = new RegExp(state.winCombos[c]);
      if (regex.test(AImoves)) { 
        state.winTie = [true, 'AI'];
        outcomeVal =  -10 + optimize;//optimized for early win
        // outcomeVal = 10;
      }
      if (regex.test(oppMoves)) {
        state.winTie = [true, 'opponent'];
        outcomeVal = 10 - optimize;//optimized for later loss
        // outcomeVal = -10;
      }
    }
    //tie?
    let allMoves = game.join('');
    if (!state.winTie[0] && allMoves.length === 9) {
      state.winTie = [true, 'tie'];
      outcomeVal = 0;
    }
    state.winTie = [false, null];
    return outcomeVal;
  },//end of win function
  
  //determine if location is open, place move and return new gameboard with placed move
  newNode: function(node, player, move) {
    let childNode = node.slice(0);
    if (!childNode[move]) {
      childNode[move] = player;
      return childNode;
    } else {
      return null;
    }
  },
  
  //initiat Ai's first move and keep track of best move value
  AiMove: function(game, minPlayer) {
    let AI = minPlayer;
    let opp;
    minPlayer === 'O' ? opp = 'X' : opp = 'O';
    console.log('@ ai this win = ', this.win(game,0))
    if (this.win(game,0)) {
      console.log('hey')
      return 'game over'
    }
    
    let move = null;
    let depth = 5;
    let alpha = -1000;
    let beta = 1000;
    let moveVal = 1000;
    
    for (let r = 0; r < game.length; r++) {
      let rootNode = this.newNode(game, AI, r);
      if (rootNode) {
        if (this.win(rootNode) !== null) {
          return r;
        }
        let childNodeVal = this.minMax(rootNode, state.opponent, r, depth, alpha, beta);
        if (childNodeVal <= moveVal) {
          moveVal = childNodeVal;
          move = r;
        }
      }
    }
    return move;
  },//end AiMove
  
  //recurse through all possible moves
  minMax: function(node, turn, indx, depth, alpha, beta) {
    
    let outcome = this.win(node, indx);
    
    if (outcome != null || depth == 0) {
      state.numNodes++;
      return outcome;
    } else {

      if (turn === state.opponent) {
        for (let i = 0; i < node.length; i++) {
          let childNode = this.newNode(node, turn, i);
          if (childNode) {
            alpha = Math.max(alpha, this.minMax(childNode, state.AI, i, depth-1, alpha, beta));
            // console.log('AT MAX node alpha = ', alpha + ' beta = ', beta + ' node = ', childNode)
            if (alpha >= beta) {
              
              break;
            }
          }
        }
        
        return alpha;
        
      } else if (turn === state.AI) {
        for (let b = 0; b < node.length; b++) {
          let childNode = this.newNode(node, turn, b);
          if (childNode) {
            beta = Math.min(beta, this.minMax(childNode, state.opponent, b, depth-1, alpha, beta));
            // console.log('AT MAX node alpha = ', alpha + ' beta = ', beta + ' node = ', childNode)
            if (alpha >= beta) {
              
              break;
            }
          }
        }
        // console.log('AT MIN node alpha = ', alpha + ' beta(return) = ', beta)
        return beta;
      }
    }
  },//end minmax

  gameOver: function() {
    model.squares.forEach(square => {
        control.makeInactive(square, 'click', control.squareClicked);
        control.makeInactive(square, 'mouseenter', view.hover);
        control.makeInactive(square, 'mouseleave', view.hover);
        // square.innerHTML = null;
      })
    let outcome = control.win(state.currentGame, 0);
    //if there's a win
    if (outcome === -10) {
      this.setPrompt(model.gameOverWinHTML(state.turn), 'gameOver');
    }
    //if there's a tie
    if (outcome === 0) {
      this.setPrompt(model.gameOverTieHTML(), 'gameOver');
    }
  },
    
  init: function(_state) {
    if (_state === 'start') {
      control.setPrompt(model.startHTML, 'start');
      window.speechSynthesis.onvoiceschanged = function() 
      {
        setTimeout(function() 
        {
        model.voices = model.synth.getVoices();
        model.msg.voice = model.voices[21]
        model.synth.speak(model.msg);
        }, 1000)
      }
    }
    //if game has already been played.
    if (_state === 'restart') {
      console.log('restart!!!!')
      model.squares.forEach(square => {
        square.style.opacity = '0';
        square.innerHTML = null;
      })
      state.currentGame = ['','','',
                          '','','',
                          '','','']
      state.AI = '';
      state.opponent = '';
      state.turn = '';
      control.setPrompt(model.startHTML, 'start');
    }
  }

}//end of control object

const view = {
  hover: function(e) {
    if (e.type === 'mouseenter') {
      e.target.style.opacity = 0.4;
      e.target.innerHTML = state.turn 
    } else if (e.type === 'mouseleave') {
      e.target.style.opacity = 0;
      setTimeout(function() {
        e.target.innerHTML = null;
      }, 200);
      
    }
    // console.log('hover', e);
  },

  placeMove: function(target) {
      target.innerHTML = state.turn;
      // console.log('placeMove')
    
  }
}


window.onload = control.init('start');