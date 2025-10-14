* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    overflow: hidden;
    background-color: #1a1a1a;
}

#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

#gameCanvas {
    display: block;
    background-color: #2a2a2a;
}

#ui {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

#ui > * {
    pointer-events: auto;
}

/* Top Left - Stats */
#top-left {
    position: absolute;
    top: 20px;
    left: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 15px;
    border-radius: 10px;
    color: white;
    min-width: 200px;
}

#health-container {
    margin-bottom: 10px;
    position: relative;
}

#health-bar {
    width: 100%;
    height: 25px;
    background-color: #333;
    border-radius: 5px;
    overflow: hidden;
    position: relative;
}

#health-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #ff4444, #ff6666);
    transition: width 0.3s;
}

#health-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    font-size: 14px;
    text-shadow: 1px 1px 2px black;
    z-index: 1;
}

.resource {
    margin: 8px 0;
    font-size: 16px;
    font-weight: bold;
}

/* Top Right - Wave Info */
#top-right {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 15px;
    border-radius: 10px;
    color: white;
    text-align: right;
}

#wave-info {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #ffd700;
}

#timer-container {
    font-size: 18px;
}

#timer {
    font-weight: bold;
    color: #66ff66;
}

/* Bottom Right - Start Wave Button */
#bottom-right {
    position: absolute;
    bottom: 30px;
    right: 30px;
}

.game-btn {
    padding: 15px 30px;
    font-size: 18px;
    font-weight: bold;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.game-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
}

.game-btn:active {
    transform: translateY(0);
}

#start-wave-btn {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

/* Build Mode Indicator */
#build-mode-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(0, 0, 0, 0.9);
    padding: 20px 40px;
    border-radius: 10px;
    color: white;
    text-align: center;
    border: 3px solid #ffd700;
}

#build-mode-indicator span {
    font-size: 24px;
    font-weight: bold;
    color: #ffd700;
}

#build-mode-indicator p {
    margin: 10px 0 5px 0;
    font-size: 16px;
}

/* Order Station */
#order-station {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

#order-station-content {
    background-color: #2a2a2a;
    padding: 30px;
    border-radius: 15px;
    max-width: 600px;
    width: 90%;
    color: white;
}

#order-station-content h2 {
    font-size: 28px;
    margin-bottom: 10px;
    color: #ffd700;
}

#order-station-content > p {
    margin-bottom: 20px;
    color: #aaa;
}

#shop-items {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-bottom: 20px;
}

.shop-item {
    background-color: #3a3a3a;
    padding: 20px;
    border-radius: 10px;
    border: 2px solid #555;
}

.shop-item h3 {
    font-size: 20px;
    margin-bottom: 8px;
    color: #66ff66;
}

.shop-item p {
    margin: 5px 0;
    color: #ccc;
}

.shop-item .price {
    font-weight: bold;
    color: #ffd700;
    font-size: 18px;
}

.buy-btn {
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.2s;
}

.buy-btn:hover {
    transform: scale(1.05);
}

.buy-btn:disabled {
    background: #555;
    cursor: not-allowed;
    opacity: 0.5;
}

.owned {
    display: inline-block;
    margin-left: 10px;
    color: #66ff66;
    font-weight: bold;
}

#close-shop-btn {
    width: 100%;
    background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
}

/* Game Over */
#game-over {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.95);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 200;
}

#game-over-content {
    text-align: center;
    color: white;
}

#game-over-content h1 {
    font-size: 60px;
    color: #ff4444;
    margin-bottom: 20px;
    text-shadow: 3px 3px 10px rgba(0, 0, 0, 0.8);
}

#game-over-content p {
    font-size: 24px;
    margin-bottom: 30px;
}

#play-again-btn {
    font-size: 20px;
}

/* Hidden class */
.hidden {
    display: none !important;
}
