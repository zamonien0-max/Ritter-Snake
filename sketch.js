window.addEventListener("error", e => {
  let d = document.createElement("div");
  d.style.cssText = "position:fixed;left:0;top:0;right:0;background:#900;color:#fff;font:16px monospace;padding:8px;z-index:9999";
  d.textContent = e.message + " (Zeile " + e.lineno + ")";
  document.body.appendChild(d);
});

let selectedFlavor = "knusperflakes";
let levelImagesLoaded = 0;
let iconFile = "icon.svg";   // <- hier deinen Dateinamen eintragen
let iconImage = null;
let totalAssets = 3 + 5;   // 3 Schokoladenbilder + 5 Levelkarten
let loadedAssets = 0;
let loadingStartTime = 0;
const minLoadingTime = 1500;   // Ladebildschirm mindestens 1,5 Sekunden zeigen (in ms)
let transitionCard = -1;            // -1 = kein Übergang aktiv
let transitionStart = 0;
const transitionDuration = 700;     // in Millisekunden
let swipeStartX = 0;
let swipeStartY = 0;
let gameOverTime = 0;
let paused = false;

function fitCanvas() {
  let s = min(windowWidth / 1080, windowHeight / 1920);
  let c = select("canvas");
  c.style("width", 1080 * s + "px");
  c.style("height", 1920 * s + "px");
  c.position((windowWidth - 1080 * s) / 2, (windowHeight - 1920 * s) / 2);
}

function windowResized() {
  fitCanvas();
}

const flavorSettings = {
  marzipan:      { body: "#e5183c", head: "#ff3855", chocolateType: 0, ingredient: "swirls" },
  nuss:          { body: "#6bb53d", head: "#80c94d", chocolateType: 1, ingredient: "nut" },
  alpenmilch:    { body: "#20b0e7", head: "#43c3f0", chocolateType: 1, ingredient: "plain" },
  knusperflakes: { body: "#efbe08", head: "#ffd33b", chocolateType: 1, ingredient: "flakes" },
  erdbeer:       { body: "#e597b6", head: "#f0aec8", chocolateType: 1, ingredient: "strawberry" }
};

// ------------------------------------
// TYPOGRAFIE – FUTURA PT
// ------------------------------------

const gameFont = "futura-pt";

function getPauseButtonBounds() {
  return {
    x: width - 2000,
    y: (headerH - 60) / 2,
    w: 60,
    h: 60
  };
}

function drawPauseButton() {
  let b = getPauseButtonBounds();

  fill("#ffffff");
  noStroke();

  rect(b.x, b.y, 12, b.h, 4);
  rect(b.x + 26, b.y, 12, b.h, 4);
}

function drawText(content, x, y, size, weight = NORMAL, color = "#ffffff", align = CENTER) {
  push();
  textFont(gameFont);
  textStyle(weight);
  textSize(size);
  textAlign(align, CENTER);
  fill(color);
  noStroke();
  text(content, x, y);
  pop();
}

// Levelauswahl
let gameStarted = false;
let levelImages = {};

let levelCards = [
  { name: "Alpenmilch",    flavor: "alpenmilch",    file: "level-alpenmilch.svg" },
  { name: "Erdbeer",       flavor: "erdbeer",       file: "level-erdbeer.svg" },
  { name: "Knusperflakes", flavor: "knusperflakes", file: "level-knusperflakes.svg" },
  { name: "Haselnuss",     flavor: "nuss",          file: "level-haselnuss.svg" },
  { name: "Marzipan",      flavor: "marzipan",      file: "level-marzipan.svg" }
];

let snake = [];
let food;
let particles = [];

let chocolateImages = [];
let imagesLoaded = false;

// Spielfeld-Koordinaten (global, damit alle Zeichenfunktionen darauf zugreifen können)
const cols = 18;
const rows = 32;
const gridSize = 50;
const headerH = 100;

const fieldX = 90;
const fieldY = headerH;
const fieldW = cols * gridSize; // 900 px
const fieldH = rows * gridSize; // 1600 px

let direction;
let nextDirection;

let moveDelay = 5;
let moveCounter = 0;

let snakeLength = 3;
let gameOver = false;
let score = 0;

// ------------------------------------
// SETUP
// ------------------------------------

function setup() {
  createCanvas(1080, 1920);
  fitCanvas();
  setupTouchInput();

  frameRate(30);
  background("#24264f");
  loadingStartTime = millis();

  // Icon für den Zurück-Button laden
  let iconEl = new Image();
  iconEl.onload = () => { iconImage = iconEl; };
  iconEl.onerror = () => console.error("Bild nicht gefunden: " + iconFile);
  iconEl.src = iconFile;

  // Schokoladenbilder laden
  loadImage("schoki-dunkel.png", img => {
    chocolateImages[0] = img;
    loadedAssets++;
    checkImagesLoaded();
  }, () => loadFail("schoki-dunkel.png"));

  loadImage("schoki-vollmilch.png", img => {
    chocolateImages[1] = img;
    loadedAssets++;
    checkImagesLoaded();
  }, () => loadFail("schoki-vollmilch.png"));

  loadImage("schoki-weiss.png", img => {
    chocolateImages[2] = img;
    loadedAssets++;
    checkImagesLoaded();
  }, () => loadFail("schoki-weiss.png"));

  // Levelkarten laden
  for (let card of levelCards) {
    let el = new Image();
    el.onload = () => {
      levelImages[card.flavor] = el;
      levelImagesLoaded++;
      loadedAssets++;
    };
    el.onerror = () => console.error("Bild nicht gefunden: " + card.file);
    el.src = card.file;
  }
}

function checkImagesLoaded() {
  if (chocolateImages.filter(Boolean).length === 3) {
    imagesLoaded = true;
  }
}

// ------------------------------------
// DRAW
// ------------------------------------

function draw() {
  background("#24264f");

    let stillLoading =
    !imagesLoaded ||
    levelImagesLoaded < levelCards.length ||
    millis() - loadingStartTime < minLoadingTime;

  if (stillLoading) {
    drawLoadingScreen();
    return;
  }

   if (!gameStarted) {
    drawLevelMenu();

    if (transitionCard !== -1 && millis() - transitionStart >= transitionDuration) {
      transitionCard = -1;
      startGame();
    }
    return;
  }

  if (gameOver && gameOverTime === 0) gameOverTime = millis();
 if (!gameOver && !paused) {
  handleControls();
  moveSnake();
}

  drawGameFrame();
  drawFood();
  drawSnake();
  drawChocolateParticles();
  drawScore();

  if (gameOver) {
    drawGameOver();
  }
    drawBackIcon();
    drawPauseButton();
}

// ------------------------------------
// STARTBILDSCHIRM
// ------------------------------------
function drawLoadingScreen() {
  background("#24264f");

  let size = 300;
  let cx = width / 2;
  let cy = height / 2 - 60;

  // Icon in der Mitte
  if (iconImage) {
    drawingContext.drawImage(iconImage, cx - size / 2, cy - size / 2, size, size);
  }

  // Ladebalken
  let barW = 500;
  let barH = 16;
  let barX = cx - barW / 2;
  let barY = cy + size / 2 + 80;

  let timeProgress = constrain((millis() - loadingStartTime) / minLoadingTime, 0, 1);
  let assetProgress = loadedAssets / totalAssets;
  let progress = min(timeProgress, assetProgress);

  noStroke();
  fill("#383a68");
  rect(barX, barY, barW, barH, 8);

  fill("#e5183c");
  rect(barX, barY, barW * progress, barH, 8);
}

function drawLevelMenu() {
  background("#24264f");

  drawText("WÄHLE DEINE SORTE", width / 2, 150, 64, BOLD);

  // Fortschritt der Klick-Animation (0 bis 1)
  let t = 0;
  if (transitionCard !== -1) {
    t = constrain((millis() - transitionStart) / transitionDuration, 0, 1);
  }

  for (let i = 0; i < levelCards.length; i++) {
    let card = levelCards[i];
    let bounds = getCardBounds(i);
    let img = levelImages[card.flavor];

    if (img) {
      let iw = img.naturalWidth || img.width || bounds.w;
      let ih = img.naturalHeight || img.height || bounds.h;

      let scaleFactor = min(bounds.w / iw, bounds.h / ih);
      let imgW = iw * scaleFactor;
      let imgH = ih * scaleFactor;

      let imgX = bounds.x + (bounds.w - imgW) / 2;
      let imgY = bounds.y + (bounds.h - imgH) / 2;

      let s = 1;       // Größe der Karte
      let alpha = 1;   // Deckkraft der Karte

      if (transitionCard !== -1) {
        if (i === transitionCard) {
          // Karte wird kurz eingedrückt und springt zurück
          s = 1 - 0.08 * sin(constrain(t / 0.4, 0, 1) * PI);
        } else {
          // Andere Karten werden blasser
          alpha = 1 - 0.65 * constrain(t / 0.3, 0, 1);
        }
      }

      push();
      drawingContext.globalAlpha = alpha;
      translate(imgX + imgW / 2, imgY + imgH / 2);
      scale(s);
      translate(-(imgX + imgW / 2), -(imgY + imgH / 2));
      drawingContext.drawImage(img, imgX, imgY, imgW, imgH);
      pop();
    }
  }

  // Splitter über den Karten
  drawChocolateParticles();
}


function createCardParticles(b) {
  let style = flavorSettings[selectedFlavor];
  let chocolateColor = style.chocolateType === 0 ? "#39221b" : "#a96b43";

  let ingredientColors = {
    marzipan: ["#f7d4aa", "#ffe8c9"],
    nuss: ["#e7c79a", "#a56b3d"],
    alpenmilch: [],
    knusperflakes: ["#ffd84a", "#fff0a0"],
    erdbeer: ["#c94265", "#f18aaa"]
  };
  let colors = ingredientColors[selectedFlavor];

  let kind = selectedFlavor === "knusperflakes"
    ? "flake"
    : selectedFlavor === "erdbeer"
      ? "strawberry"
      : selectedFlavor === "nuss"
        ? "nut"
        : "marzipan";

  let cx = b.x + b.w / 2;
  let cy = b.y + b.h / 2;

  for (let i = 0; i < 20; i++) {
    let isIngredient = colors.length > 0 && i % 3 === 0;

    // Zufällige Richtung in alle Himmelsrichtungen
    let angle = random(TWO_PI);
    let speed = random(4, 10);

    particles.push({
      // Start verteilt über die Karte, nicht nur an einem Punkt
      x: cx + random(-b.w * 0.35, b.w * 0.35),
      y: cy + random(-b.h * 0.35, b.h * 0.35),
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - 2,   // leichter Schwung nach oben
      size: random(10, 22),
      life: 255,
      color: isIngredient ? random(colors) : chocolateColor,
      gravity: 0.25,
      kind: isIngredient ? kind : "chocolate",
      rotation: random(TWO_PI),
      spin: random(-0.15, 0.15)
    });
  }
}

function getCardBounds(index) {
  let margin = 60;   // Abstand Karte bis Rand
  let gap = 30;      // Abstand zwischen den Karten (horizontal und vertikal)

  // Quadratische Karten, passend zur Breite
  let size = (width - 2 * margin - gap) / 2;   // = 465

  let startX = margin;
  let startY = 280;

  let col = index % 2;
  let row = Math.floor(index / 2);

  let x = startX + col * (size + gap);
  let y = startY + row * (size + gap);

  // Letzte Karte mittig unten
  if (index === 4) {
    x = (width - size) / 2;
  }

  return { x: x, y: y, w: size, h: size };
}

// Wird bei Mausklick UND Touch benutzt
function handleTap(px, py) {
  if (!imagesLoaded) return;

  // Im Menü: Sorte auswählen und starten
  if (!gameStarted) {
    if (transitionCard !== -1) return;   // während der Animation keine weiteren Klicks

    for (let i = 0; i < levelCards.length; i++) {
      if (hitTest(px, py, getCardBounds(i))) {
        selectedFlavor = levelCards[i].flavor;
        transitionCard = i;
        transitionStart = millis();
        createCardParticles(getCardBounds(i));
        return;
      }
    }
    return;
  }

  // Im Spiel: Icon führt zurück zur Sortenauswahl
  if (hitTest(px, py, getIconBounds())) {
    backToMenu();
    return;
  }

  if (hitTest(px, py, getPauseButtonBounds())) {
  paused = !paused;
  return;
}

    // Game Over: Button zur Sortenauswahl, sonst Tippen = Neustart
  if (gameOver) {
    if (hitTest(px, py, getMenuButtonBounds())) {
      backToMenu();
    } else if (millis() - gameOverTime > 700) {
      restartGame();
    }
  }
}


function setupTouchInput() {
  let c = document.querySelector("canvas");
  c.style.touchAction = "none";

  // Bildschirm-Koordinaten in Canvas-Koordinaten umrechnen
  function toCanvas(e) {
    let r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (width / r.width),
      y: (e.clientY - r.top) * (height / r.height)
    };
  }

  c.addEventListener("pointerdown", e => {
    e.preventDefault();
    let p = toCanvas(e);
    swipeStartX = p.x;
    swipeStartY = p.y;
    handleTap(p.x, p.y);
  });

  c.addEventListener("pointermove", e => {
    e.preventDefault();
    if (e.buttons === 0) return;                       // Finger/Maus nicht gedrückt
    if (!gameStarted || gameOver || !direction) return;

    let p = toCanvas(e);
    let dx = p.x - swipeStartX;
    let dy = p.y - swipeStartY;

    if (max(abs(dx), abs(dy)) > 40) {
      if (abs(dx) > abs(dy)) {
        if (dx > 0 && direction.x !== -1) nextDirection = createVector(1, 0);
        else if (dx < 0 && direction.x !== 1) nextDirection = createVector(-1, 0);
      } else {
        if (dy > 0 && direction.y !== -1) nextDirection = createVector(0, 1);
        else if (dy < 0 && direction.y !== 1) nextDirection = createVector(0, -1);
      }
      swipeStartX = p.x;
      swipeStartY = p.y;
    }
  });
}

function drawGameFrame() {
  const style = flavorSettings[selectedFlavor];

  // Nur Header
  noStroke();
  fill(style.body);
  rect(0, 0, width, headerH);
}

function drawScore() {
  // Der obere Balken ist Teil derselben farbigen Außenfläche.
  drawText("Punkte: " + score, 30, headerH / 2, 48, BOLD, "#ffffff", LEFT);
  if (paused) {
  drawText(
    "PAUSE",
    width / 2,
    headerH / 2,
    42,
    BOLD,
    "#ffffff"
  );
}

function drawGameOver() {
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, 0, width, height);

  drawText("GAME OVER", width / 2, height / 2 - 70, 64, BOLD);
  drawText("Punkte: " + score, width / 2, height / 2, 32, NORMAL);
  drawText("TIPPE ZUM NEUSTARTEN", width / 2, height / 2 + 70, 26, NORMAL);

  // Button: Zur Sortenauswahl
  let b = getMenuButtonBounds();
  noStroke();
  fill("#e5183c");
  rect(b.x, b.y, b.w, b.h, 30);
  drawText("ZUR SORTENAUSWAHL", b.x + b.w / 2, b.y + b.h / 2, 34, BOLD, "#ffffff");
}

function getMenuButtonBounds() {
  let w = 600;
  let h = 100;
  return { x: (width - w) / 2, y: height / 2 + 140, w: w, h: h };
}

function getIconBounds() {
  let size = 90;
  let margin = 30;
  return { x: width - size - margin, y: (headerH - size) / 2, w: size, h: size };
}

function drawBackIcon() {
  let b = getIconBounds();

  if (iconImage) {
    drawingContext.drawImage(iconImage, b.x, b.y, b.w, b.h);
  } else {
    // Ersatz-Symbol, solange das Icon nicht geladen ist
    noStroke();
    fill("#383a68");
    rect(b.x, b.y, b.w, b.h, 20);
    drawText("←", b.x + b.w / 2, b.y + b.h / 2, 48, BOLD);
  }
}

function hitTest(px, py, b) {
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
}

function backToMenu() {
  gameStarted = false;
  gameOver = false;
  gameOverTime = 0;
  particles = [];
}

// ------------------------------------
// BEWEGUNG
// ------------------------------------

function handleControls() {
  if (gameOver) return;

  if (keyIsDown(UP_ARROW) && direction.y !== 1) {
    nextDirection = createVector(0, -1);
  } else if (keyIsDown(DOWN_ARROW) && direction.y !== -1) {
    nextDirection = createVector(0, 1);
  } else if (keyIsDown(LEFT_ARROW) && direction.x !== 1) {
    nextDirection = createVector(-1, 0);
  } else if (keyIsDown(RIGHT_ARROW) && direction.x !== -1) {
    nextDirection = createVector(1, 0);
  }
}

function moveSnake() {
  if (gameOver) return;

  moveCounter++;
  if (moveCounter < moveDelay) return;
  moveCounter = 0;

  direction = nextDirection.copy();

  let head = snake[0];
  let newHead = createVector(head.x + direction.x, head.y + direction.y);

  // Wand
  if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
    gameOver = true;
    return;
  }

  // Selbstberührung
  let eating = food && newHead.x === food.x && newHead.y === food.y;
  let bodyToCheck = eating ? snake : snake.slice(0, -1);

  for (let segment of bodyToCheck) {
    if (newHead.x === segment.x && newHead.y === segment.y) {
      gameOver = true;
      return;
    }
  }

  snake.unshift(newHead);

  if (eating) {
    createChocolateParticles(food.x, food.y, food.type);
    snakeLength++;
    score++;
    spawnFood();
  }

  while (snake.length > snakeLength) {
    snake.pop();
  }
}

function keyPressed() {
  // Im Menü keine Tastensteuerung
  if (!gameStarted) return false;

  // Neustart mit Enter ODER Leertaste
  if (gameOver) {
    if (keyCode === ENTER || key === "Enter" || key === " ") {
      restartGame();
    }
    return false;
  }

  if (keyCode === UP_ARROW && direction.y !== 1) {
    nextDirection = createVector(0, -1);
  } else if (keyCode === DOWN_ARROW && direction.y !== -1) {
    nextDirection = createVector(0, 1);
  } else if (keyCode === LEFT_ARROW && direction.x !== 1) {
    nextDirection = createVector(-1, 0);
  } else if (keyCode === RIGHT_ARROW && direction.x !== -1) {
    nextDirection = createVector(1, 0);
  }

  return false;
}

// ------------------------------------
// SCHOKOLADEN-PARTIKEL ERZEUGEN
// ------------------------------------

function createChocolateParticles(gridX, gridY, type) {
  let centerX = fieldX + gridX * gridSize + gridSize / 2;
  let centerY = fieldY + gridY * gridSize + gridSize / 2;

  let chocolateColor = type === 0 ? "#39221b" : "#a96b43";

  for (let i = 0; i < 14; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 6);

    particles.push({
      x: centerX,
      y: centerY,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - 1,
      size: random(4, 10),
      life: 255,
      color: chocolateColor,
      gravity: 0.12,
      kind: "chocolate",
      rotation: random(TWO_PI),
      spin: random(-0.12, 0.12)
    });
  }

  let ingredientColors = {
    marzipan: ["#f7d4aa", "#ffe8c9"],
    nuss: ["#e7c79a", "#a56b3d"],
    alpenmilch: [],
    knusperflakes: ["#ffd84a", "#fff0a0"],
    erdbeer: ["#c94265", "#f18aaa"]
  };

  let colors = ingredientColors[selectedFlavor];

  for (let i = 0; i < 8 && colors.length > 0; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 2);

    let kind = selectedFlavor === "knusperflakes"
      ? "flake"
      : selectedFlavor === "erdbeer"
        ? "strawberry"
        : selectedFlavor === "nuss"
          ? "nut"
          : "marzipan";

    particles.push({
      x: centerX,
      y: centerY,
      vx: cos(angle) * speed,
      vy: sin(angle) * speed - 1,
      size: random(5, 10),
      life: 255,
      color: random(colors),
      gravity: 0.12,
      kind: kind,
      rotation: random(TWO_PI),
      spin: random(-0.15, 0.15)
    });
  }
}

// ------------------------------------
// SCHOKOLADEN-PARTIKEL ZEICHNEN
// ------------------------------------

function drawChocolateParticles() {
  noStroke();

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.98;
    p.rotation += p.spin;
    p.life -= 7;

    push();
    translate(p.x, p.y);
    rotate(p.rotation);
    fill(p.color, p.life);

    if (p.kind === "flake") {
      quad(
        -p.size, -p.size * 0.25,
        p.size * 0.7, -p.size * 0.5,
        p.size, p.size * 0.25,
        -p.size * 0.5, p.size * 0.6
      );
    } else if (p.kind === "nut") {
      ellipse(0, 0, p.size * 1.2, p.size * 0.8);
    } else if (p.kind === "strawberry") {
      ellipse(0, 0, p.size, p.size * 0.8);
    } else if (p.kind === "marzipan") {
      ellipse(0, 0, p.size * 1.2, p.size * 0.7);
    } else {
      rect(-p.size / 2, -p.size / 2, p.size, p.size, 2);
    }

    pop();

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ------------------------------------
// SCHLANGE ZEICHNEN
// ------------------------------------

function drawSnake() {
  noStroke();

  const style = flavorSettings[selectedFlavor];

  for (let i = snake.length - 1; i >= 1; i--) {
    let segment = snake[i];
    let x = fieldX + segment.x * gridSize;
    let y = fieldY + segment.y * gridSize;

    fill(style.body);
    rect(x + 3, y + 3, gridSize - 6, gridSize - 6, 10);

    drawSnakeIngredients(x, y, segment, i, style.ingredient);
  }

  let head = snake[0];
  let hx = fieldX + head.x * gridSize;
  let hy = fieldY + head.y * gridSize;

  fill(style.head);
  rect(hx + 2, hy + 2, gridSize - 4, gridSize - 4, 12);

  let dx = direction.x;
  let dy = direction.y;

  fill("#ffffff");

  if (dx > 0) {
    circle(hx + 39, hy + 18, 8);
    circle(hx + 39, hy + 42, 8);
  } else if (dx < 0) {
    circle(hx + 21, hy + 18, 8);
    circle(hx + 21, hy + 42, 8);
  } else if (dy > 0) {
    circle(hx + 18, hy + 39, 8);
    circle(hx + 42, hy + 39, 8);
  } else {
    circle(hx + 18, hy + 21, 8);
    circle(hx + 42, hy + 21, 8);
  }
}

function drawSnakeIngredients(x, y, segment, index, ingredient) {
  let seed = segment.x * 37 + segment.y * 61 + index * 17;

  let a = ((seed % 19) + 19) % 19;
  let b = (((seed * 3) % 17) + 17) % 17;

  push();

  if (ingredient === "swirls") {
    noFill();
    stroke("#f5d9a6");
    strokeCap(ROUND);
    strokeJoin(ROUND);

    let cx = x + gridSize / 2;
    let cy = y + gridSize / 2;
    let turns = 1.35;
    let maxRadius = gridSize * 0.34;

    strokeWeight(3);

    beginShape();
    for (let t = 0; t <= TWO_PI * turns; t += 0.04) {
      let progress = t / (TWO_PI * turns);
      let radius = maxRadius * (1 - progress * 0.88);

      vertex(cx + cos(t - HALF_PI) * radius, cy + sin(t - HALF_PI) * radius);
    }
    endShape();

  } else if (ingredient === "nut") {
    noStroke();
    fill("#e7c79a");
    ellipse(x + 15 + a, y + 16 + b % 7, 9, 6);
    ellipse(x + 35 - a % 8, y + 39 - b % 7, 7, 5);

    fill("#a56b3d");
    circle(x + 41 - a % 9, y + 16 + b % 8, 4);

  } else if (ingredient === "flakes") {
    noStroke();
    fill("#fff0a0");

    push();
    translate(x + 17 + a % 10, y + 17 + b % 8);
    rotate(0.5);
    quad(-5, -2, 4, -4, 6, 2, -3, 4);
    pop();

    push();
    translate(x + 38 - a % 9, y + 39 - b % 8);
    rotate(-0.6);
    quad(-4, -3, 5, -2, 3, 4, -5, 2);
    pop();

  } else if (ingredient === "strawberry") {
    noStroke();
    fill("#c94265");
    ellipse(x + 16 + a % 9, y + 17 + b % 7, 8, 6);
    ellipse(x + 38 - a % 9, y + 38 - b % 8, 7, 6);

    fill("#ffd6e2");
    circle(x + 29 + a % 7, y + 13 + b % 8, 4);
  }

  pop();
}

// ------------------------------------
// SCHOKOLADE
// ------------------------------------

function drawFood() {
  if (!food) return;

  let chocolate = chocolateImages[food.type];
  if (!chocolate) return;

  image(
    chocolate,
    fieldX + food.x * gridSize + 3,
    fieldY + food.y * gridSize + 3,
    gridSize - 2,
    gridSize - 2
  );
}

function spawnFood() {
  let candidates = [];

  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      let occupied = snake.some(s => s.x === x && s.y === y);
      if (!occupied) {
        candidates.push(createVector(x, y));
      }
    }
  }

  if (candidates.length > 0) {
    food = random(candidates);
    food.type = flavorSettings[selectedFlavor].chocolateType;
  } else {
    food = null;
    gameOver = true;
  }
}

// ------------------------------------
// START / NEUSTART
// ------------------------------------

function restartGame() {
  snake = [
    createVector(8, 16),
    createVector(7, 16),
    createVector(6, 16)
  ];

  direction = createVector(1, 0);
  nextDirection = createVector(1, 0);

  snakeLength = 3;
  score = 0;
  gameOver = false;
  gameOverTime = 0;
  moveCounter = 0;
  particles = [];

  spawnFood();
}

function startGame() {
  let keep = particles;   // Splitter aus dem Menü behalten
  gameStarted = true;
  restartGame();
  particles = keep;
}
