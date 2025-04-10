document.addEventListener('DOMContentLoaded', () => {
    const cardSelection = document.querySelector('.card-selection');
    const gameBoard = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    let selectedCard = null;
    let highlightedCell = null;
    let score = 0;
    let multiplier = 1;
    
    // Для отслеживания уже обработанных рядов
    const scoredRows = new Set();
    const scoredCols = new Set();
    const scoredDiagonals = new Set();

    // Колода из 52 карт
    const suits = ['♥', '♦', '♣', '♠'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let deck = [];

    // Создаём колоду
    function createDeck() {
        deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push(`${value}${suit}`);
            }
        }
        shuffleDeck();
    }

    // Перемешиваем колоду
    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    // Обновляем карты в верхнем ряду
    function updateSelectionCards() {
        cardSelection.innerHTML = '';
        for (let i = 0; i < 2; i++) {
            if (deck.length === 0) {
                setTimeout(() => showGameCompleteModal(), 500);
                return;
            }
            const cardValue = deck.pop();
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.value = cardValue;
            card.textContent = cardValue;
            cardSelection.appendChild(card);

            card.addEventListener('click', () => {
                selectedCard = card;
                if (highlightedCell) {
                    highlightedCell.classList.remove('highlight');
                    highlightedCell = null;
                }
            });
        }
    }

    // Функция для определения стоимости карты
    function getCardPoints(cardText) {
        const value = cardText.substring(0, cardText.length - 1);
        switch(value) {
            case 'A': return 14;
            case 'K': return 13;
            case 'Q': return 12;
            case 'J': return 11;
            case '10': return 10;
            default: return parseInt(value);
        }
    }

    // Проверка всех комбинаций на поле
    function checkAllCombinations() {
        const cells = Array.from(document.querySelectorAll('.cell'));
        const board = [];
        
        // Создаём матрицу 5x5
        for (let i = 0; i < 5; i++) {
            board[i] = [];
            for (let j = 0; j < 5; j++) {
                const cell = cells[i * 5 + j];
                board[i][j] = cell.firstChild ? cell.firstChild.dataset.value : null;
            }
        }

        let totalBonus = 0;
        let comboFound = false;

        // Проверяем строки
        for (let row = 0; row < 5; row++) {
            const rowId = `row-${row}`;
            if (!scoredRows.has(rowId)) {
                const currentRow = board[row];
                if (currentRow.every(cell => cell !== null)) {
                    const { bonus, comboName } = calculateRowBonus(currentRow);
                    totalBonus += bonus;
                    scoredRows.add(rowId);
                    if (bonus > 0) {
                        showBonusMessage(bonus, comboName);
                        comboFound = true;
                    }
                }
            }
        }

        // Проверяем столбцы
        for (let col = 0; col < 5; col++) {
            const colId = `col-${col}`;
            if (!scoredCols.has(colId)) {
                const column = [];
                for (let row = 0; row < 5; row++) {
                    column.push(board[row][col]);
                }
                if (column.every(cell => cell !== null)) {
                    const { bonus, comboName } = calculateRowBonus(column);
                    totalBonus += bonus;
                    scoredCols.add(colId);
                    if (bonus > 0) {
                        showBonusMessage(bonus, comboName);
                        comboFound = true;
                    }
                }
            }
        }

        // Проверяем диагонали
        const diag1 = [], diag2 = [];
        for (let i = 0; i < 5; i++) {
            diag1.push(board[i][i]);
            diag2.push(board[i][4-i]);
        }

        if (!scoredDiagonals.has('diag1') && diag1.every(cell => cell !== null)) {
            const { bonus, comboName } = calculateRowBonus(diag1);
            totalBonus += bonus;
            scoredDiagonals.add('diag1');
            if (bonus > 0) {
                showBonusMessage(bonus, comboName);
                comboFound = true;
            }
        }

        if (!scoredDiagonals.has('diag2') && diag2.every(cell => cell !== null)) {
            const { bonus, comboName } = calculateRowBonus(diag2);
            totalBonus += bonus;
            scoredDiagonals.add('diag2');
            if (bonus > 0) {
                showBonusMessage(bonus, comboName);
                comboFound = true;
            }
        }

        if (totalBonus > 0) {
            score += totalBonus;
            scoreElement.textContent = score;
        }

        // Проверяем, заполнены ли все ячейки
        const allCellsFilled = cells.every(cell => cell.hasChildNodes());
        if (allCellsFilled) {
            setTimeout(() => showGameCompleteModal(), comboFound ? 2000 : 0);
        }
    }

    // Расчёт бонуса для ряда
    function calculateRowBonus(cards) {
        const cardsData = cards.map(card => {
            const value = card.substring(0, card.length - 1);
            const suit = card.slice(-1);
            return {
                value,
                suit,
                points: getCardPoints(card)
            };
        });

        const valueCounts = {};
        cardsData.forEach(card => valueCounts[card.value] = (valueCounts[card.value] || 0) + 1);
        const duplicates = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
        
        const isFlush = new Set(cardsData.map(card => card.suit)).size === 1;
        const isStraight = checkStraight(cardsData.map(card => card.value));
        
        let multiplier = 1;
        let comboName = '';
        let scoringCards = [];
        
        // Определяем комбинацию
        if (isFlush && isStraight && cardsData.some(c => c.value === '10') && 
            cardsData.some(c => c.value === 'A')) {
            multiplier = 10;
            comboName = 'Флеш Рояль';
            scoringCards = [...cardsData];
        } 
        else if (isFlush && isStraight) {
            multiplier = 9;
            comboName = 'Стрит Флеш';
            scoringCards = [...cardsData];
        }
        else if (duplicates[0][1] === 4) {
            multiplier = 8;
            comboName = 'Каре';
            scoringCards = cardsData.filter(card => card.value === duplicates[0][0]);
        }
        else if (duplicates[0][1] === 3 && duplicates[1]?.[1] === 2) {
            multiplier = 7;
            comboName = 'Фулл Хаус';
            scoringCards = [
                ...cardsData.filter(card => card.value === duplicates[0][0]),
                ...cardsData.filter(card => card.value === duplicates[1][0])
            ];
        }
        else if (isFlush) {
            multiplier = 6;
            comboName = 'Флеш';
            scoringCards = [...cardsData];
        }
        else if (isStraight) {
            multiplier = 5;
            comboName = 'Стрит';
            scoringCards = [...cardsData];
        }
        else if (duplicates[0][1] === 3) {
            multiplier = 4;
            comboName = 'Сет';
            scoringCards = cardsData.filter(card => card.value === duplicates[0][0]);
        }
        else if (duplicates[0][1] === 2 && duplicates[1]?.[1] === 2) {
            multiplier = 3;
            comboName = 'Две пары';
            scoringCards = [
                ...cardsData.filter(card => card.value === duplicates[0][0]),
                ...cardsData.filter(card => card.value === duplicates[1][0])
            ];
        }
        else if (duplicates[0][1] === 2) {
            multiplier = 2;
            comboName = 'Пара';
            scoringCards = cardsData.filter(card => card.value === duplicates[0][0]);
        }
        else {
            return { bonus: 0, comboName: '' };
        }
        
        const bonus = scoringCards.reduce((sum, card) => sum + card.points, 0) * multiplier;
        return { bonus, comboName };
    }

    // Проверка на стрит
    function checkStraight(values) {
        const rankValues = values.map(value => {
            if (value === 'A') return 14;
            if (value === 'K') return 13;
            if (value === 'Q') return 12;
            if (value === 'J') return 11;
            return parseInt(value);
        }).sort((a, b) => a - b);
        
        // Специальный случай A-2-3-4-5
        if (rankValues.join(',') === '2,3,4,5,14') return true;
        
        // Обычный стрит
        for (let i = 1; i < rankValues.length; i++) {
            if (rankValues[i] !== rankValues[i-1] + 1) return false;
        }
        return true;
    }

    // Показ сообщения о бонусе
    function showBonusMessage(bonus, comboName) {
        const msg = document.createElement('div');
        msg.className = 'bonus-message';
        
        let comboStyle = '';
        if (multiplier >= 8) comboStyle = 'royal-combo';
        else if (multiplier >= 5) comboStyle = 'rare-combo';
        
        msg.innerHTML = `
            <div class="combo-notification ${comboStyle}">
                <div class="combo-name">${comboName}!</div>
                <div class="combo-points">+${bonus} очков</div>
            </div>
        `;
        
        document.body.appendChild(msg);
        
        setTimeout(() => {
            msg.classList.add('fade-out');
            setTimeout(() => msg.remove(), 1000);
        }, 1500);
    }

    // Показ модального окна завершения игры
    function showGameCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'game-complete-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Ты молодец!</h2>
                <p>Игра завершена. Твой итоговый счёт: ${score}</p>
                <button id="new-game-btn">Новая игра</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('new-game-btn').addEventListener('click', resetGame);
    }

    // Сброс игры
    function resetGame() {
        // Очищаем поле
        document.querySelectorAll('.cell').forEach(cell => cell.innerHTML = '');
        
        // Удаляем все сообщения
        document.querySelectorAll('.bonus-message, .game-complete-modal').forEach(el => el.remove());
        
        // Сбрасываем счёт
        score = 0;
        scoreElement.textContent = score;
        
        // Очищаем историю подсчитанных рядов
        scoredRows.clear();
        scoredCols.clear();
        scoredDiagonals.clear();
        
        // Создаём новую колоду
        createDeck();
        updateSelectionCards();
    }

    // Создаём поле 5x5
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        gameBoard.appendChild(cell);

        cell.addEventListener('click', () => {
            if (selectedCard && !cell.hasChildNodes()) {
                const newCard = selectedCard.cloneNode(true);
                newCard.style.cursor = 'default';
                cell.appendChild(newCard);
                selectedCard = null;
                if (highlightedCell) highlightedCell.classList.remove('highlight');
                updateSelectionCards();
                setTimeout(checkAllCombinations, 300);
            }
        });

        cell.addEventListener('mouseenter', () => {
            if (selectedCard && !cell.hasChildNodes()) {
                if (highlightedCell) highlightedCell.classList.remove('highlight');
                cell.classList.add('highlight');
                highlightedCell = cell;
            }
        });

        cell.addEventListener('mouseleave', () => {
            if (highlightedCell === cell) {
                cell.classList.remove('highlight');
                highlightedCell = null;
            }
        });
    }

    // Инициализация игры
    createDeck();
    updateSelectionCards();
});