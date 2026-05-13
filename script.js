// ============================================
// BROTHERS84 - JEU COMPLET
// 50 Monstres | 30 Niveaux | Inventaire Avancé
// ============================================

try { 
    if(window.Telegram && window.Telegram.WebApp) { 
        window.Telegram.WebApp.ready(); 
        window.Telegram.WebApp.expand(); 
    } 
} catch(e){}

// ============================================
// ÉTAT GLOBAL
// ============================================
let gameState = { 
    screen: 'title', 
    player: null, 
    floor: 1, 
    map: [], 
    playerPos: { x: 3, y: 3, angle: 0 }, 
    inCombat: false, 
    enemy: null, 
    adsWatchedForRevive: 0, 
    audioCtx: null, 
    nextNoteTime: 0, 
    currentStep: 0,
    audioInitialized: false,
    stepsSinceLastCombat: 0,
    minStepsBeforeCombat: 12,
    dungeonTypes: ['Souterrains','Cavernes','Catacombes','Forteresse','Prison','Temple','Enfers','Roy.Ombres','Abysses','Trône Mal']
};

// ============================================
// PUBLICITÉS
// ============================================
let adSDKReady = false;
let adSDKRetries = 0;
const MAX_AD_RETRIES = 15;

function checkAdSDK() {
    if (typeof window.show_10997672 === "function") {
        adSDKReady = true;
        console.log("SDK Pub prêt");
        return true;
    }
    adSDKRetries++;
    if (adSDKRetries < MAX_AD_RETRIES) {
        setTimeout(checkAdSDK, 1500);
    } else {
        console.log("SDK non dispo - Mode test");
    }
    return false;
}
setTimeout(checkAdSDK, 3000);

function showRewardedAd(cb) {
    if (!adSDKReady && typeof window.show_10997672 !== "function") {
        console.log("Simulation pub");
        setTimeout(() => {
            alert("📺 Pub simulée - Récompense accordée!\n(Utilisez Telegram pour les vraies pubs)");
            cb();
        }, 800);
        return;
    }
    try {
        let p = window.show_10997672();
        if(p && typeof p.then === 'function') { 
            p.then(cb).catch(() => { cb(); }); 
        } else { 
            setTimeout(cb, 1500); 
        }
    } catch(e) { 
        alert("Pub indisponible - Récompense accordée");
        cb(); 
    }
}

function showInAppAd() { 
    if(!adSDKReady && typeof window.show_10997672 !== 'function') {
        console.log("InApp simulée");
        return;
    }
    try { 
        window.show_10997672({
            type:'inApp',
            inAppSettings:{ frequency:2, capping:0.1, interval:30, timeout:5, everyPage:false }
        }); 
    } catch(e) { console.log("InApp error:", e); } 
}

// ============================================
// CRÉATION PERSONNAGE
// ============================================
const cStats = { 
    Chevalier:{str:650,agi:220,vit:550,end:450,int:120,mag:60,lck:220,desc:"Guerrier sacré, maître de la défense"}, 
    Barbare:{str:850,agi:160,vit:650,end:550,int:60,mag:30,lck:120,desc:"Berserker sauvage, force brute"}, 
    Elfe:{str:220,agi:650,vit:350,end:250,int:450,mag:550,lck:450,desc:"Archer mystique, maître de la magie"}, 
    Nain:{str:550,agi:120,vit:750,end:650,int:250,mag:120,lck:180,desc:"Forgeur robuste, résistance extrême"}, 
    Espionne:{str:350,agi:850,vit:350,end:350,int:350,mag:250,lck:750,desc:"Assassin furtif, critique élevé"}, 
    Ninja:{str:450,agi:750,vit:450,end:450,int:250,mag:350,lck:650,desc:"Ombre mortelle, vitesse suprême"}, 
    Amazone:{str:550,agi:550,vit:550,end:450,int:250,mag:250,lck:550,desc:"Guerrière équilibrée, polyvalente"} 
};

const classDesc = {
    Chevalier:"🛡️ Guerrier sacré avec haute défense et HP",
    Barbare:"🪓 Force brute, dégâts élevés mais fragile",
    Elfe:"🏹 Maître de la magie et de l'agilité",
    Nain:"⛏️ Résistance extrême, tank naturel",
    Espionne:"🗡️ Critiques élevés, chance suprême",
    Ninja:"🥷 Vitesse et attaques rapides",
    Amazone:"⚔️ Équilibrée, adaptable à tout"
};

function rStat(b) { return Math.floor(b * (0.5 + Math.random())); }

function rollStats(c) { 
    let b = cStats[c]; 
    return { str: rStat(b.str), agi: rStat(b.agi), vit: rStat(b.vit), end: rStat(b.end), int: rStat(b.int), mag: rStat(b.mag), lck: rStat(b.lck) }; 
}

// ============================================
// 50 MONSTRES TERRIFIANTS
// ============================================
const MONSTERS = [
    // Niveaux 1-3 (Souterrains)
    { name: "Rat Géant", prefix: "Rongeur", type: 0, tier: 1, desc: "Un rat muté par la magie noire" },
    { name: "Squelette", prefix: "Décharné", type: 0, tier: 1, desc: "Os animés par une malédiction" },
    { name: "Gobelin", prefix: "Vermine", type: 3, tier: 1, desc: "Créature sournoise et cupide" },
    { name: "Chauve-Souris", prefix: "Vampire", type: 2, tier: 1, desc: "Aspire le sang des vivants" },
    { name: "Slime", prefix: "Acide", type: 3, tier: 1, desc: "Gelée corrosive et vorace" },
    // Niveaux 4-6
    { name: "Loup-Garou", prefix: "Enragé", type: 3, tier: 2, desc: "Bête mi-homme mi-loup" },
    { name: "Zombie", prefix: "Putride", type: 0, tier: 2, desc: "Cadavre réanimé affamé" },
    { name: "Araignée", prefix: "Géante", type: 3, tier: 2, desc: "Toiles mortelles dans l'ombre" },
    { name: "Serpent", prefix: "Venimeux", type: 3, tier: 2, desc: "Crocs empoisonnés mortels" },
    { name: "Fantôme", prefix: "Errant", type: 2, tier: 2, desc: "Âme en peine éternelle" },
    // Niveaux 7-9
    { name: "Orc", prefix: "Sanguinaire", type: 1, tier: 2, desc: "Guerrier brutal des profondeurs" },
    { name: "Goule", prefix: "Dévorante", type: 0, tier: 3, desc: "Mangeuse de chair humaine" },
    { name: "Spectre", prefix: "Hurlant", type: 2, tier: 3, desc: "Cri qui glace le sang" },
    { name: "Troll", prefix: "Des Cavernes", type: 1, tier: 3, desc: "Régénération impossible" },
    { name: "Momie", prefix: "Maudite", type: 0, tier: 3, desc: "Pharaon mort-vivant vengeur" },
    // Niveaux 10-12
    { name: "Vampire", prefix: "Ancien", type: 1, tier: 3, desc: "Seigneur des ténèbres nocturnes" },
    { name: "Gargouille", prefix: "De Pierre", type: 3, tier: 3, desc: "Statue vivante protectrice" },
    { name: "Liche", prefix: "Sombre", type: 4, tier: 4, desc: "Magicien mort-vivant puissant" },
    { name: "Démon", prefix: "Mineur", type: 1, tier: 4, desc: "Serviteur des enfers" },
    { name: "Banshee", prefix: "Reine", type: 2, tier: 4, desc: "Son cri annonce la mort" },
    // Niveaux 13-15
    { name: "Hydre", prefix: "À Trois Têtes", type: 3, tier: 4, desc: "Chaque tête tranchée en repousse" },
    { name: "Chimère", prefix: "Abominable", type: 3, tier: 4, desc: "Fusion de trois bêtes monstrueuses" },
    { name: "Wendigo", prefix: "Glace", type: 2, tier: 4, desc: "Esprit de la faim cannibale" },
    { name: "Nécromancien", prefix: "Renégat", type: 4, tier: 4, desc: "Maître des morts-vivants" },
    { name: "Golem", prefix: "De Fer", type: 1, tier: 4, desc: "Automate indestructible" },
    // Niveaux 16-18
    { name: "Succube", prefix: "Séductrice", type: 1, tier: 5, desc: "Démon femme drainant la vie" },
    { name: "Incube", prefix: "Cauchemar", type: 1, tier: 5, desc: "Démon des rêves terrifiants" },
    { name: "Doppelganger", prefix: "Mille-Faces", type: 2, tier: 5, desc: "Copie parfaite de ses victimes" },
    { name: "Manticore", prefix: "Royal", type: 3, tier: 5, desc: "Lion, scorpion et dragon fusionnés" },
    { name: "Basilic", prefix: "Pétrifiant", type: 3, tier: 5, desc: "Son regard transforme en pierre" },
    // Niveaux 19-21
    { name: "Kraken", prefix: "Des Abysses", type: 3, tier: 5, desc: "Tentacules dévastateurs" },
    { name: "Phoenix", prefix: "De Cendres", type: 1, tier: 5, desc: "Renaît de ses cendres" },
    { name: "Dragon", prefix: "Wyrm", type: 3, tier: 6, desc: "Ancêtre de tous les dragons" },
    { name: "Behemoth", prefix: "Terrestre", type: 1, tier: 6, desc: "Colosse indestructible" },
    { name: "Ifrit", prefix: "De Feu", type: 1, tier: 6, desc: "Génie des flammes éternelles" },
    // Niveaux 22-24
    { name: "Marid", prefix: "Des Eaux", type: 2, tier: 6, desc: "Génie des océans profonds" },
    { name: "Dao", prefix: "De Terre", type: 1, tier: 6, desc: "Génie des montagnes" },
    { name: "Shaitan", prefix: "Du Vent", type: 2, tier: 6, desc: "Génie des tempêtes" },
    { name: "Rakshasa", prefix: "Démon-Tigre", type: 3, tier: 6, desc: "Mangeur d'hommes démoniaque" },
    { name: "Oni", prefix: "Ogre", type: 1, tier: 6, desc: "Démon japonais terrifiant" },
    // Niveaux 25-27
    { name: "Balrog", prefix: "Seigneur", type: 1, tier: 7, desc: "Démon majeur des enfers" },
    { name: "Archonte", prefix: "Corrompu", type: 4, tier: 7, desc: "Ange déchu de puissance divine" },
    { name: "Titan", prefix: "Primordial", type: 1, tier: 7, desc: "Géant avant les dieux" },
    { name: "Leviathan", prefix: "Marin", type: 3, tier: 7, desc: "Monstre des mers infinies" },
    { name: "Ziz", prefix: "Céleste", type: 3, tier: 7, desc: "Oiseau géant obscurcissant le soleil" },
    // Niveaux 28-29
    { name: "Abaddon", prefix: "Destructeur", type: 4, tier: 8, desc: "Ange de l'abîme infernal" },
    { name: "Samael", prefix: "Venom", type: 4, tier: 8, desc: "Archange de la mort" },
    { name: "Azazel", prefix: "Des Déserts", type: 4, tier: 8, desc: "Enseigna la guerre aux hommes" },
    { name: "Belial", prefix: "Menteur", type: 4, tier: 8, desc: "Père de la tromperie" },
    { name: "Malphas", prefix: "Architecte", type: 4, tier: 8, desc: "Bâtisseur de cités maudites" },
    // Niveau 30 - BOSS FINAL
    { name: "Fardoll", prefix: "Le Dévoreur", type: 4, tier: 10, desc: "Seigneur des Ténèbres Éternelles", isBoss: true }
];

function getMonsterForFloor(floor) {
    let tier = Math.min(8, Math.floor((floor - 1) / 3) + 1);
    let candidates = MONSTERS.filter(m => m.tier === tier || m.tier === tier - 1);
    if (candidates.length === 0) candidates = MONSTERS.filter(m => m.tier <= tier);
    return candidates[Math.floor(Math.random() * candidates.length)];
}

// ============================================
// GÉNÉRATION DONJON - LABYRINTHES PROGRESSIFS
// ============================================
function generateDungeon(w, h, floor) {
    let complexity = Math.min(1, floor / 30); // 0 à 1
    let map = Array(h).fill(0).map(() => Array(w).fill(1));

    // Zone départ sécurisée (3x3 à 5x5 selon niveau)
    let safeSize = Math.min(5, 3 + Math.floor(floor / 10));
    for(let y = 1; y <= safeSize; y++) {
        for(let x = 1; x <= safeSize; x++) {
            map[y][x] = 0;
        }
    }

    let rooms = [{x: 1, y: 1, w: safeSize - 1, h: safeSize - 1}];
    let numRooms = 6 + Math.floor(complexity * 12); // 6 à 18 salles

    // Générer salles
    for(let i = 0; i < numRooms; i++) {
        let rw = Math.floor(Math.random() * 4) + 2 + Math.floor(complexity * 3);
        let rh = Math.floor(Math.random() * 4) + 2 + Math.floor(complexity * 3);
        let rx = Math.floor(Math.random() * (w - rw - 2)) + 1;
        let ry = Math.floor(Math.random() * (h - rh - 2)) + 1;

        for(let y = ry; y <= ry + rh && y < h - 1; y++) {
            for(let x = rx; x <= rx + rw && x < w - 1; x++) {
                map[y][x] = 0;
            }
        }
        rooms.push({x: rx, y: ry, w: rw, h: rh, id: i});
    }

    // Labyrinthe complexe - connexions multiples
    for(let i = 0; i < rooms.length - 1; i++) {
        let r1 = rooms[i];
        let r2 = rooms[(i + 1) % rooms.length];
        let x1 = r1.x + Math.floor(r1.w / 2);
        let y1 = r1.y + Math.floor(r1.h / 2);
        let x2 = r2.x + Math.floor(r2.w / 2);
        let y2 = r2.y + Math.floor(r2.h / 2);

        // Corridors en L avec embranchements
        let midX = x1 + Math.floor((x2 - x1) * (0.3 + Math.random() * 0.4));

        for(let x = Math.min(x1, midX); x <= Math.max(x1, midX); x++) {
            if(y1 > 0 && y1 < h - 1 && x > 0 && x < w - 1) map[y1][x] = 0;
        }
        for(let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            if(y > 0 && y < h - 1 && midX > 0 && midX < w - 1) map[y][midX] = 0;
        }
        for(let x = Math.min(midX, x2); x <= Math.max(midX, x2); x++) {
            if(y2 > 0 && y2 < h - 1 && x > 0 && x < w - 1) map[y2][x] = 0;
        }
    }

    // Connexions supplémentaires pour labyrinthe complexe
    if(floor > 10) {
        for(let i = 0; i < Math.floor(complexity * 5); i++) {
            let r1 = rooms[Math.floor(Math.random() * rooms.length)];
            let r2 = rooms[Math.floor(Math.random() * rooms.length)];
            if(r1 !== r2) {
                let x1 = r1.x + Math.floor(Math.random() * r1.w);
                let y1 = r1.y + Math.floor(Math.random() * r1.h);
                let x2 = r2.x + Math.floor(Math.random() * r2.w);
                let y2 = r2.y + Math.floor(Math.random() * r2.h);
                let mx = Math.floor((x1 + x2) / 2);
                for(let x = Math.min(x1, mx); x <= Math.max(x1, mx); x++) {
                    if(y1 > 0 && y1 < h - 1 && x > 0 && x < w - 1) map[y1][x] = 0;
                }
                for(let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                    if(y > 0 && y < h - 1 && mx > 0 && mx < w - 1) map[y][mx] = 0;
                }
                for(let x = Math.min(mx, x2); x <= Math.max(mx, x2); x++) {
                    if(y2 > 0 && y2 < h - 1 && x > 0 && x < w - 1) map[y2][x] = 0;
                }
            }
        }
    }

    // Escalier (2) dans la salle la plus éloignée
    let farthest = rooms[rooms.length - 1];
    let stairX = farthest.x + Math.floor(farthest.w / 2);
    let stairY = farthest.y + Math.floor(farthest.h / 2);
    if(stairY > 0 && stairY < h - 1 && stairX > 0 && stairX < w - 1) {
        map[stairY][stairX] = 2;
    }

    // Portes secrètes (3)
    let secretCount = Math.floor(complexity * 4) + 1;
    let secretsPlaced = 0;
    for(let y = 1; y < h - 1 && secretsPlaced < secretCount; y++) {
        for(let x = 1; x < w - 1 && secretsPlaced < secretCount; x++) {
            if(map[y][x] === 1) {
                let neighbors = 0;
                if(map[y][x-1] === 0) neighbors++;
                if(map[y][x+1] === 0) neighbors++;
                if(map[y-1] && map[y-1][x] === 0) neighbors++;
                if(map[y+1] && map[y+1][x] === 0) neighbors++;
                if(neighbors === 2 && Math.random() < 0.3) {
                    map[y][x] = 3;
                    secretsPlaced++;
                }
            }
        }
    }

    // Trésors cachés (4)
    let treasureCount = Math.floor(Math.random() * 3) + 1;
    for(let i = 0; i < treasureCount; i++) {
        let r = rooms[Math.floor(Math.random() * rooms.length)];
        let tx = r.x + Math.floor(Math.random() * r.w);
        let ty = r.y + Math.floor(Math.random() * r.h);
        if(map[ty] && map[ty][tx] === 0) map[ty][tx] = 4;
    }

    return map;
}

// ============================================
// AUDIO / MUSIQUE
// ============================================
function initAudio() {
    if(!gameState.audioCtx) {
        gameState.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(gameState.audioCtx.state === 'suspended') {
        gameState.audioCtx.resume().then(() => { console.log("Audio ON"); });
    }
    if(gameState.nextNoteTime < gameState.audioCtx.currentTime) {
        gameState.nextNoteTime = gameState.audioCtx.currentTime + 0.1;
    }
    gameState.audioInitialized = true;
}

function playNote(freq, time, dur, type='square', vol=0.05) {
    if(!gameState.audioCtx || freq === 0) return;
    let ctx = gameState.audioCtx;
    let osc = ctx.createOscillator();
    let gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur);
}

const N = { 
    C2:65.4, D2:73.4, E2:82.4, F2:87.3, G2:98, A2:110, B2:123.5,
    C3:130.8, D3:146.8, E3:164.8, F3:174.6, G3:196, A3:220, B3:246.9,
    C4:261.6, D4:293.7, E4:329.6, F4:349.2, G4:392, A4:440, B4:493.9,
    C5:523.3, D5:587.3, E5:659.3, F5:698.5, G5:784, R:0 
};

const mels = [
    [N.E4,N.G4,N.B4,N.E5,N.R,N.B4,N.G4,N.E4,N.F4,N.A4,N.C5,N.F5,N.R,N.C5,N.A4,N.F4],
    [N.C4,N.E4,N.G4,N.C5,N.R,N.G4,N.E4,N.C4,N.D4,N.F4,N.A4,N.D5,N.R,N.A4,N.F4,N.D4],
    [N.A3,N.C4,N.E4,N.A4,N.R,N.E4,N.C4,N.A3,N.C4,N.E4,N.A4,N.C5,N.R,N.A4,N.E4,N.C4],
    [N.F3,N.A3,N.C4,N.F4,N.R,N.C4,N.A3,N.F3,N.G3,N.B3,N.D4,N.G4,N.R,N.D4,N.B3,N.G3],
    [N.D3,N.F3,N.A3,N.D4,N.R,N.A3,N.F3,N.D3,N.E3,N.G3,N.B3,N.E4,N.R,N.B3,N.G3,N.E3],
    [N.C3,N.E3,N.G3,N.C4,N.R,N.G3,N.E3,N.C3,N.D3,N.F3,N.A3,N.D4,N.R,N.A3,N.F3,N.D3]
];

const bas = [
    [N.E2,N.R,N.B2,N.R,N.E2,N.R,N.B2,N.R,N.F2,N.R,N.C3,N.R,N.F2,N.R,N.G2,N.R],
    [N.C3,N.R,N.G2,N.R,N.C3,N.R,N.G2,N.R,N.F2,N.R,N.C3,N.R,N.F2,N.R,N.G2,N.R],
    [N.A2,N.R,N.E2,N.R,N.A2,N.R,N.E2,N.R,N.F2,N.R,N.C3,N.R,N.G2,N.R,N.A2,N.R],
    [N.F2,N.R,N.C3,N.R,N.F2,N.R,N.C3,N.R,N.G2,N.R,N.D3,N.R,N.G2,N.R,N.A2,N.R],
    [N.D2,N.R,N.A2,N.R,N.D2,N.R,N.A2,N.R,N.E2,N.R,N.B2,N.R,N.E2,N.R,N.F2,N.R],
    [N.C2,N.R,N.G2,N.R,N.C2,N.R,N.G2,N.R,N.D2,N.R,N.A2,N.R,N.D2,N.R,N.E2,N.R]
];

function scheduleMusic() {
    if(!gameState.audioCtx || gameState.screen !== 'game') return;
    let ctx = gameState.audioCtx;
    while(gameState.nextNoteTime < ctx.currentTime + 0.3) {
        let idx = Math.min(Math.floor((gameState.floor - 1) / 5), mels.length - 1);
        let step = gameState.currentStep % 16;
        let bpm = gameState.inCombat ? 170 : 85;
        let stepDur = (60 / bpm) / 2;

        if(mels[idx][step] !== N.R) playNote(mels[idx][step], gameState.nextNoteTime, stepDur * 1.5, 'square', 0.035);
        if(bas[idx][step] !== N.R) playNote(bas[idx][step], gameState.nextNoteTime, stepDur * 2.5, 'triangle', 0.07);
        if(step % 4 === 0) playNote(55, gameState.nextNoteTime, stepDur * 0.3, 'sawtooth', 0.025);

        gameState.nextNoteTime += stepDur;
        gameState.currentStep++;
    }
}
setInterval(scheduleMusic, 50);

// ============================================
// RAYCASTING 3D FAUSSE 3D AVEC TEXTURES
// ============================================
const canvas = document.getElementById('dungeon-canvas');
const ctx = canvas.getContext('2d');
const RW = 320, RH = 200;
const offCanvas = document.createElement('canvas');
offCanvas.width = RW; offCanvas.height = RH;
const offCtx = offCanvas.getContext('2d');
const imgData = offCtx.createImageData(RW, RH);
const buf = imgData.data;

function getWallTexture(wx, wy, type, side) {
    let brickX = Math.floor(wx * 8) % 2;
    let brickY = Math.floor(wy * 8) % 2;
    let mortar = (brickX === 0 || brickY === 0) ? 0.6 : 1;
    let noise = (Math.sin(wx * 50) + Math.cos(wy * 50)) * 0.1;

    if(type === 1) {
        let r = Math.min(255, (160 + noise * 40) * mortar);
        let g = Math.min(255, (130 + noise * 30) * mortar);
        let b = Math.min(255, (100 + noise * 20) * mortar);
        return {r, g, b};
    } else if(type === 2) {
        let pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
        return {
            r: Math.min(255, 40 + wx * 100 * pulse),
            g: Math.min(255, 40 + wy * 50),
            b: Math.min(255, 200 + wx * 55 * pulse)
        };
    } else if(type === 3) {
        let wood = Math.sin(wx * 6) * 0.3 + 0.7;
        return {
            r: Math.min(255, 140 * wood),
            g: Math.min(255, 90 * wood),
            b: Math.min(255, 50 * wood)
        };
    } else if(type === 4) {
        return {
            r: Math.min(255, 200 + noise * 50),
            g: Math.min(255, 170 + noise * 30),
            b: Math.min(255, 50 + noise * 20)
        };
    }
    return {r: 100, g: 100, b: 100};
}

function getFloorTexture(fx, fy, floor) {
    let checker = (Math.floor(fx * 2) + Math.floor(fy * 2)) % 2;
    let age = floor / 30;
    let base = checker === 0 ? 50 + age * 30 : 35 + age * 20;
    let crack = Math.sin(fx * 30) * Math.cos(fy * 30) > 0.8 ? 0.7 : 1;
    return {
        r: base * crack,
        g: (base * 0.7) * crack,
        b: (base * 0.5) * crack
    };
}

function getCeilingTexture(cx, cy, floor) {
    let dist = Math.sqrt((cx - 0.5)**2 + (cy - 0.5)**2);
    let height = 20 + (floor / 30) * 15;
    let base = height - dist * 30;
    return {
        r: Math.max(5, base * 0.5),
        g: Math.max(5, base * 0.3),
        b: Math.max(10, base * 0.8)
    };
}

function castRays() {
    if(!gameState.player || gameState.map.length === 0) return;
    const cw = canvas.width, ch = canvas.height;
    const px = gameState.playerPos.x, py = gameState.playerPos.y, pa = gameState.playerPos.angle;
    const fov = Math.PI / 3, mapH = gameState.map.length, mapW = gameState.map[0].length;

    for(let i = 0; i < RW; i++) {
        let rayA = (pa - fov/2) + (i/RW) * fov;
        let sin = Math.sin(rayA), cos = Math.cos(rayA);
        let mapX = Math.floor(px), mapY = Math.floor(py);
        let deltaDistX = Math.abs(1/cos), deltaDistY = Math.abs(1/sin);
        let stepX, stepY, sideDistX, sideDistY;

        if(cos < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
        else { stepX = 1; sideDistX = (mapX + 1 - px) * deltaDistX; }
        if(sin < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
        else { stepY = 1; sideDistY = (mapY + 1 - py) * deltaDistY; }

        let hit = false, side = 0, hitT = 0, dist = 0;
        while(!hit && dist < 25) {
            if(sideDistX < sideDistY) {
                sideDistX += deltaDistX; mapX += stepX; side = 0;
            } else {
                sideDistY += deltaDistY; mapY += stepY; side = 1;
            }
            if(mapY < 0 || mapY >= mapH || mapX < 0 || mapX >= mapW) { hit = true; hitT = 1; dist = 25; }
            else if(gameState.map[mapY][mapX] > 0) {
                hit = true; hitT = gameState.map[mapY][mapX];
                dist = side === 0 ? (mapX - px + (1-stepX)/2)/cos : (mapY - py + (1-stepY)/2)/sin;
            }
        }

        dist = Math.max(0.1, dist) * Math.cos(rayA - pa);
        let wH = RH / dist;
        let yS = Math.floor(RH/2 - wH/2), yE = Math.floor(RH/2 + wH/2);
        let wallX = side === 0 ? py + dist*sin : px + dist*cos;
        wallX -= Math.floor(wallX);
        let fog = Math.max(0.15, 1 - dist/18);

        for(let y = 0; y < RH; y++) {
            let idx = (y * RW + i) * 4;
            if(y < yS) {
                let cd = (RH/2)/(RH/2 - y);
                let cx = px + cos*cd*Math.cos(rayA-pa);
                let cy = py + sin*cd*Math.cos(rayA-pa);
                let ct = getCeilingTexture(cx%1, cy%1, gameState.floor);
                let cfog = Math.max(0.2, 1 - cd/8);
                buf[idx] = ct.r*cfog; buf[idx+1] = ct.g*cfog; buf[idx+2] = ct.b*cfog;
            } else if(y > yE) {
                let fd = (RH/2)/(y - RH/2);
                let fx = px + cos*fd*Math.cos(rayA-pa);
                let fy = py + sin*fd*Math.cos(rayA-pa);
                let ft = getFloorTexture(fx%1, fy%1, gameState.floor);
                let ffog = Math.max(0.2, 1 - fd/10);
                buf[idx] = ft.r*ffog; buf[idx+1] = ft.g*ffog; buf[idx+2] = ft.b*ffog;
            } else {
                let wy = (y - yS)/wH;
                let tex = getWallTexture(wallX, wy, hitT, side);
                let shade = side === 1 ? 0.65 : 1.0;
                buf[idx] = Math.min(255, tex.r*fog*shade);
                buf[idx+1] = Math.min(255, tex.g*fog*shade);
                buf[idx+2] = Math.min(255, tex.b*fog*shade);
            }
            buf[idx+3] = 255;
        }
    }
    offCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(offCanvas, 0, 0, cw, ch);
}

// ============================================
// MINIMAP
// ============================================
function drawMinimap() {
    const mc = document.getElementById('minimap-canvas');
    const mctx = mc.getContext('2d');
    const mcw = mc.width, mch = mc.height;
    mctx.fillStyle = '#000'; mctx.fillRect(0, 0, mcw, mch);

    const cs = Math.min(mcw/gameState.map[0].length, mch/gameState.map.length);
    const ox = (mcw - gameState.map[0].length*cs)/2;
    const oy = (mch - gameState.map.length*cs)/2;

    for(let y = 0; y < gameState.map.length; y++) {
        for(let x = 0; x < gameState.map[0].length; x++) {
            let v = gameState.map[y][x];
            if(v === 0) { mctx.fillStyle = '#1a1a2e'; mctx.fillRect(ox+x*cs, oy+y*cs, cs-0.5, cs-0.5); }
            else if(v === 1) { mctx.fillStyle = '#444'; mctx.fillRect(ox+x*cs, oy+y*cs, cs-0.5, cs-0.5); }
            else if(v === 2) { mctx.fillStyle = '#4444FF'; mctx.fillRect(ox+x*cs, oy+y*cs, cs-0.5, cs-0.5); }
            else if(v === 3) { mctx.fillStyle = '#AA6600'; mctx.fillRect(ox+x*cs, oy+y*cs, cs-0.5, cs-0.5); }
            else if(v === 4) { mctx.fillStyle = '#FFD700'; mctx.fillRect(ox+x*cs, oy+y*cs, cs-0.5, cs-0.5); }
        }
    }

    mctx.fillStyle = '#0F0';
    mctx.beginPath();
    mctx.arc(ox+gameState.playerPos.x*cs, oy+gameState.playerPos.y*cs, cs*0.6, 0, Math.PI*2);
    mctx.fill();

    mctx.strokeStyle = '#0F0'; mctx.lineWidth = 2;
    mctx.beginPath();
    mctx.moveTo(ox+gameState.playerPos.x*cs, oy+gameState.playerPos.y*cs);
    mctx.lineTo(ox+gameState.playerPos.x*cs+Math.cos(gameState.playerPos.angle)*cs*3, oy+gameState.playerPos.y*cs+Math.sin(gameState.playerPos.angle)*cs*3);
    mctx.stroke();
}

// ============================================
// MONSTRES VISUELS - 50 TYPES PROCÉDURAUX
// ============================================
function spawnEnemy() {
    let fm = 1 + (gameState.floor * 0.35);
    let template = getMonsterForFloor(gameState.floor);
    let name = template.prefix + " " + template.name;
    if(template.isBoss) name = "★ " + template.name + " ★";

    gameState.enemy = {
        name: name,
        template: template,
        hpMax: Math.floor((120 + Math.random()*280) * fm * (template.tier * 0.3 + 0.7)),
        mpMax: 100,
        str: Math.floor((30 + Math.random()*70) * fm * (template.tier * 0.2 + 0.8)),
        agi: Math.floor((25 + Math.random()*50) * fm),
        xpReward: Math.floor((100 + Math.random()*150) * fm * template.tier),
        type: template.type,
        tier: template.tier
    };
    gameState.enemy.hp = gameState.enemy.hpMax;
    gameState.enemy.mp = gameState.enemy.mpMax;
    gameState.enemy.atb = 0;

    document.getElementById('enemy-name-display').innerText = name;
    drawEnemy();
}

function drawEnemy() {
    let ec = document.getElementById('enemy-canvas');
    let ectx = ec.getContext('2d');
    let w = 180, h = 180;
    ectx.clearRect(0, 0, w, h);

    let template = gameState.enemy ? gameState.enemy.template : MONSTERS[0];
    let time = Date.now() / 1000;
    let breathe = Math.sin(time * 2) * 4;
    let pulse = Math.sin(time * 3) * 0.3 + 0.7;

    // Fond
    ectx.fillStyle = '#080808';
    ectx.fillRect(0, 0, w, h);

    // Aura selon tier
    let auraColors = ['#444','#664','#844','#a44','#c44','#e44','#f44','#f0f','#f8f'];
    let aura = auraColors[Math.min(template.tier - 1, auraColors.length - 1)];
    let grad = ectx.createRadialGradient(w/2, h/2, 20, w/2, h/2, 80);
    grad.addColorStop(0, aura + '40');
    grad.addColorStop(0.5, aura + '20');
    grad.addColorStop(1, 'transparent');
    ectx.fillStyle = grad;
    ectx.fillRect(0, 0, w, h);

    // Type visuel
    let type = template.type;

    if(type === 0) { // SQUELETTE / MOMIE / MORT-VIVANT
        // Crâne
        ectx.fillStyle = '#d4d4d4';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 - 25 + breathe, 28, 32, 0, 0, Math.PI*2);
        ectx.fill();
        // Yeux vides + rouge
        ectx.fillStyle = '#111';
        ectx.beginPath(); ectx.arc(w/2 - 12, h/2 - 30 + breathe, 7, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.arc(w/2 + 12, h/2 - 30 + breathe, 7, 0, Math.PI*2); ectx.fill();
        ectx.fillStyle = `rgba(255,0,0,${0.6 + Math.sin(time*4)*0.4})`;
        ectx.beginPath(); ectx.arc(w/2 - 12, h/2 - 30 + breathe, 4, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.arc(w/2 + 12, h/2 - 30 + breathe, 4, 0, Math.PI*2); ectx.fill();
        // Mâchoire
        ectx.strokeStyle = '#bbb'; ectx.lineWidth = 2;
        for(let i = 0; i < 6; i++) {
            ectx.beginPath();
            ectx.moveTo(w/2 - 15 + i*6, h/2 - 8 + breathe);
            ectx.lineTo(w/2 - 15 + i*6, h/2 + 3 + breathe);
            ectx.stroke();
        }
        // Corps squelettique
        ectx.strokeStyle = '#ccc'; ectx.lineWidth = 3;
        for(let i = 0; i < 4; i++) {
            ectx.beginPath();
            ectx.arc(w/2, h/2 + 35 + i*10 + breathe, 22 - i*3, 0, Math.PI, false);
            ectx.stroke();
        }
        // Bras os
        ectx.strokeStyle = '#ddd'; ectx.lineWidth = 4;
        ectx.beginPath(); ectx.moveTo(w/2 - 25, h/2 + 20 + breathe); ectx.lineTo(w/2 - 45, h/2 + 50 + breathe); ectx.stroke();
        ectx.beginPath(); ectx.moveTo(w/2 + 25, h/2 + 20 + breathe); ectx.lineTo(w/2 + 45, h/2 + 50 + breathe); ectx.stroke();
    }
    else if(type === 1) { // DÉMON / VAMPIRE / ORC
        // Cornes
        ectx.fillStyle = '#222';
        ectx.beginPath();
        ectx.moveTo(w/2 - 18, h/2 - 35 + breathe);
        ectx.lineTo(w/2 - 30, h/2 - 65 + breathe);
        ectx.lineTo(w/2 - 5, h/2 - 40 + breathe);
        ectx.fill();
        ectx.beginPath();
        ectx.moveTo(w/2 + 18, h/2 - 35 + breathe);
        ectx.lineTo(w/2 + 30, h/2 - 65 + breathe);
        ectx.lineTo(w/2 + 5, h/2 - 40 + breathe);
        ectx.fill();
        // Visage rouge sombre
        ectx.fillStyle = '#8B0000';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 - 12 + breathe, 30, 35, 0, 0, Math.PI*2);
        ectx.fill();
        // Texture peau démoniaque
        ectx.fillStyle = 'rgba(139,0,0,0.3)';
        for(let i = 0; i < 8; i++) {
            ectx.beginPath();
            ectx.arc(w/2 + (Math.random()-0.5)*40, h/2 - 12 + (Math.random()-0.5)*30 + breathe, 3, 0, Math.PI*2);
            ectx.fill();
        }
        // Yeux jaunes terrifiants
        ectx.fillStyle = `rgba(255,215,0,${pulse})`;
        ectx.beginPath(); ectx.ellipse(w/2 - 14, h/2 - 18 + breathe, 10, 6, -0.2, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.ellipse(w/2 + 14, h/2 - 18 + breathe, 10, 6, 0.2, 0, Math.PI*2); ectx.fill();
        // Pupilles verticales
        ectx.fillStyle = '#000';
        ectx.beginPath(); ectx.ellipse(w/2 - 14, h/2 - 18 + breathe, 2, 7, 0, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.ellipse(w/2 + 14, h/2 - 18 + breathe, 2, 7, 0, 0, Math.PI*2); ectx.fill();
        // Bouche avec crocs
        ectx.fillStyle = '#000';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 + 8 + breathe, 18, 10, 0, 0, Math.PI*2);
        ectx.fill();
        ectx.fillStyle = '#fff';
        for(let i = 0; i < 4; i++) {
            ectx.beginPath();
            ectx.moveTo(w/2 - 12 + i*8, h/2 + 4 + breathe);
            ectx.lineTo(w/2 - 9 + i*8, h/2 + 18 + breathe);
            ectx.lineTo(w/2 - 6 + i*8, h/2 + 4 + breathe);
            ectx.fill();
        }
        // Moustaches/Barbe démoniaque
        ectx.strokeStyle = '#333'; ectx.lineWidth = 2;
        for(let i = 0; i < 5; i++) {
            ectx.beginPath();
            ectx.moveTo(w/2 - 10 + i*5, h/2 + 15 + breathe);
            ectx.lineTo(w/2 - 12 + i*5, h/2 + 30 + breathe);
            ectx.stroke();
        }
    }
    else if(type === 2) { // SPECTRE / BANSHEE / FANTÔME
        // Forme fantomatique ondulante
        ectx.fillStyle = `rgba(180,220,255,${0.25 + Math.sin(time)*0.1})`;
        ectx.beginPath();
        let points = [];
        for(let a = 0; a < Math.PI*2; a += 0.3) {
            let r = 35 + Math.sin(a*3 + time*2) * 8 + Math.sin(time*4) * 5;
            points.push({x: w/2 + Math.cos(a)*r, y: h/2 - 10 + Math.sin(a)*r*1.2 + breathe});
        }
        ectx.moveTo(points[0].x, points[0].y);
        for(let p of points) ectx.lineTo(p.x, p.y);
        ectx.closePath();
        ectx.fill();

        // Visage spectral
        ectx.fillStyle = `rgba(220,240,255,${0.5 + Math.sin(time*2)*0.2})`;
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 - 18 + breathe, 22, 28, 0, 0, Math.PI*2);
        ectx.fill();

        // Yeux noirs profonds
        ectx.fillStyle = '#000';
        ectx.beginPath(); ectx.arc(w/2 - 10, h/2 - 22 + breathe, 6, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.arc(w/2 + 10, h/2 - 22 + breathe, 6, 0, Math.PI*2); ectx.fill();

        // Larmes de sang
        ectx.strokeStyle = `rgba(200,0,0,${0.6 + Math.sin(time*3)*0.3})`;
        ectx.lineWidth = 2;
        ectx.beginPath(); ectx.moveTo(w/2 - 10, h/2 - 16 + breathe); ectx.lineTo(w/2 - 12, h/2 + 8 + breathe); ectx.stroke();
        ectx.beginPath(); ectx.moveTo(w/2 + 10, h/2 - 16 + breathe); ectx.lineTo(w/2 + 12, h/2 + 8 + breathe); ectx.stroke();

        // Bouche hurlante
        ectx.fillStyle = '#000';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 + 5 + breathe, 14, 10, 0, 0, Math.PI*2);
        ectx.fill();
        // Dents spectrales
        ectx.fillStyle = `rgba(255,255,255,${0.7 + Math.sin(time*5)*0.3})`;
        for(let i = 0; i < 5; i++) {
            ectx.beginPath();
            ectx.moveTo(w/2 - 10 + i*5, h/2 + 2 + breathe);
            ectx.lineTo(w/2 - 8 + i*5, h/2 - 5 + breathe);
            ectx.lineTo(w/2 - 6 + i*5, h/2 + 2 + breathe);
            ectx.fill();
        }
    }
    else if(type === 3) { // BÊTE / LÉZARD / LOUP
        // Tête reptilienne/bête
        ectx.fillStyle = '#3d6b1a';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 - 12 + breathe, 32, 28, 0, 0, Math.PI*2);
        ectx.fill();

        // Écailles texturées
        ectx.strokeStyle = '#2a4d12';
        ectx.lineWidth = 1;
        for(let row = 0; row < 5; row++) {
            for(let col = 0; col < 6; col++) {
                let sx = w/2 - 22 + col * 9;
                let sy = h/2 - 28 + row * 10 + breathe;
                ectx.beginPath();
                ectx.arc(sx, sy, 5, 0, Math.PI, true);
                ectx.stroke();
            }
        }

        // Yeux reptiliens dorés
        ectx.fillStyle = `rgba(255,215,0,${pulse})`;
        ectx.beginPath(); ectx.ellipse(w/2 - 16, h/2 - 18 + breathe, 12, 7, -0.3, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.ellipse(w/2 + 16, h/2 - 18 + breathe, 12, 7, 0.3, 0, Math.PI*2); ectx.fill();

        ectx.fillStyle = '#000';
        ectx.beginPath(); ectx.ellipse(w/2 - 16, h/2 - 18 + breathe, 4, 8, -0.3, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.ellipse(w/2 + 16, h/2 - 18 + breathe, 4, 8, 0.3, 0, Math.PI*2); ectx.fill();

        // Mâchoire avec rangées de dents
        ectx.fillStyle = '#1a3009';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 + 12 + breathe, 22, 14, 0, 0, Math.PI*2);
        ectx.fill();
        ectx.fillStyle = '#fff';
        for(let i = 0; i < 7; i++) {
            ectx.beginPath();
            ectx.moveTo(w/2 - 18 + i*6, h/2 + 6 + breathe);
            ectx.lineTo(w/2 - 15 + i*6, h/2 + 20 + breathe);
            ectx.lineTo(w/2 - 12 + i*6, h/2 + 6 + breathe);
            ectx.fill();
        }
        // Langue
        ectx.fillStyle = `rgba(220,50,50,${0.7 + Math.sin(time*4)*0.3})`;
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 + 18 + breathe, 8, 4 + Math.sin(time*4)*2, 0, 0, Math.PI*2);
        ectx.fill();
    }
    else { // LICHE / ARCHONTE / BOSS MAGIQUE
        // Couronne/corne majestueuse
        ectx.fillStyle = '#FFD700';
        for(let i = 0; i < 7; i++) {
            let cx = w/2 - 24 + i * 8;
            let spike = 15 + Math.sin(i) * 10;
            ectx.beginPath();
            ectx.moveTo(cx - 3, h/2 - 38 + breathe);
            ectx.lineTo(cx, h/2 - 38 - spike + breathe);
            ectx.lineTo(cx + 3, h/2 - 38 + breathe);
            ectx.fill();
        }
        ectx.fillStyle = '#B8860B';
        ectx.fillRect(w/2 - 28, h/2 - 38 + breathe, 56, 6);

        // Visage décomposé majestueux
        ectx.fillStyle = '#5a4a3a';
        ectx.beginPath();
        ectx.ellipse(w/2, h/2 - 8 + breathe, 28, 33, 0, 0, Math.PI*2);
        ectx.fill();

        // Chair putride
        ectx.fillStyle = '#6b8e23';
        ectx.beginPath(); ectx.arc(w/2 - 18, h/2 - 5 + breathe, 9, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.arc(w/2 + 22, h/2 + 5 + breathe, 7, 0, Math.PI*2); ectx.fill();
        ectx.fillStyle = '#8fbc8f';
        ectx.beginPath(); ectx.arc(w/2, h/2 + 15 + breathe, 5, 0, Math.PI*2); ectx.fill();

        // Yeux magiques pulsants
        let eyeGlow = `rgba(0,255,150,${0.7 + Math.sin(time*4)*0.3})`;
        ectx.fillStyle = eyeGlow;
        ectx.shadowColor = '#00FF96';
        ectx.shadowBlur = 15;
        ectx.beginPath(); ectx.arc(w/2 - 12, h/2 - 18 + breathe, 8, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.arc(w/2 + 12, h/2 - 18 + breathe, 8, 0, Math.PI*2); ectx.fill();
        ectx.shadowBlur = 0;

        ectx.fillStyle = '#000';
        ectx.beginPath(); ectx.arc(w/2 - 12, h/2 - 18 + breathe, 3, 0, Math.PI*2); ectx.fill();
        ectx.beginPath(); ectx.arc(w/2 + 12, h/2 - 18 + breathe, 3, 0, Math.PI*2); ectx.fill();

        // Barbe/mâchoire
        ectx.fillStyle = '#2f4f4f';
        ectx.beginPath();
        ectx.moveTo(w/2 - 18, h/2 + 12 + breathe);
        ectx.lineTo(w/2, h/2 + 50 + breathe);
        ectx.lineTo(w/2 + 18, h/2 + 12 + breathe);
        ectx.fill();

        // Orbe magique flottant
        ectx.fillStyle = `rgba(100,0,255,${0.3 + Math.sin(time*2)*0.2})`;
        ectx.beginPath();
        ectx.arc(w/2 + 35, h/2 - 30 + breathe + Math.sin(time*2)*5, 10, 0, Math.PI*2);
        ectx.fill();
    }

    // Bordure pulsante selon tier
    ectx.strokeStyle = aura;
    ectx.lineWidth = 2 + Math.sin(time*3);
    ectx.strokeRect(2, 2, w-4, h-4);
}

// ============================================
// COMBAT
// ============================================
let cLoop = null;
let enemyAnimFrame = null;

function startCombat() {
    gameState.inCombat = true;
    gameState.stepsSinceLastCombat = 0;
    document.getElementById('combat-ui').classList.remove('hidden');
    spawnEnemy();
    initAudio();
    showInAppAd();

    function animateEnemy() {
        if(!gameState.inCombat) return;
        drawEnemy();
        enemyAnimFrame = requestAnimationFrame(animateEnemy);
    }
    animateEnemy();

    cLoop = setInterval(() => {
        if(!gameState.inCombat) return;

        gameState.player.atb += (gameState.player.agi + gameState.player.vit) / 1000;
        document.getElementById('player-atb-bar').style.width = Math.min(100, gameState.player.atb) + '%';

        gameState.enemy.atb += gameState.enemy.agi / 500;
        document.getElementById('enemy-atb-bar').style.width = Math.min(100, gameState.enemy.atb) + '%';

        if(gameState.enemy.atb >= 100) {
            gameState.enemy.atb = 0;
            let dmg = Math.floor(gameState.enemy.str * (0.5 + Math.random()*0.5));
            gameState.player.hp -= dmg;
            showFx('blood');
            if(gameState.player.hp <= 0) gameOver();
        }

        let canAct = gameState.player.atb >= 100;
        document.getElementById('btn-attack').style.boxShadow = canAct ? "0 0 15px #FFF" : "none";
        document.getElementById('btn-attack').style.opacity = canAct ? "1" : "0.4";
        document.getElementById('btn-magic').style.opacity = (canAct && gameState.player.mp >= 20) ? "1" : "0.4";

        updateUI();
    }, 50);
}

function pAtk() {
    if(gameState.player.atb < 100 || !gameState.inCombat) return;
    gameState.player.atb = 0;
    let dmg = Math.floor(gameState.player.str * (0.5 + Math.random()*0.5));
    gameState.enemy.hp -= dmg;
    showFx('blood');
    if(gameState.enemy.hp <= 0) winCombat();
}

function winCombat() {
    gameState.inCombat = false;
    clearInterval(cLoop);
    if(enemyAnimFrame) cancelAnimationFrame(enemyAnimFrame);
    document.getElementById('combat-ui').classList.add('hidden');
    gameState.player.xp += gameState.enemy.xpReward;
    let xN = gameState.player.level * 1000;
    if(gameState.player.xp >= xN) {
        gameState.player.level++;
        gameState.player.xp -= xN;
        gameState.player.hpMax += 50;
        gameState.player.mpMax += 25;
        showLevelUp();
        if(gameState.player.level % 3 === 0 && Math.random() < 0.6) {
            setTimeout(() => alert("🎆 NOUVEAU SORT DÉBLOQUÉ!"), 500);
        }
    }
    if(Math.random() < 0.4) genLoot();
    updateUI();
}

function showLevelUp() {
    let el = document.getElementById('levelup-effect');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 1500);
}

function genLoot() {
    let types = ["Épée","Casque","Armure","Bottes","Anneau","Amulette","Bouclier","Gants","Ceinture","Jambières"];
    let prefixes = ["Feu","Glace","Foudre","Ombre","Sang","Lumière","Dragon","Ancien","Maudit","Divin"];
    let stats = ['str','agi','vit','end','int','mag','lck'];
    let statNames = {str:'FOR',agi:'AGI',vit:'VIT',end:'END',int:'INT',mag:'MAG',lck:'CHA'};
    let slotMap = {
        'Épée':'weapon','Casque':'head','Armure':'torso','Bottes':'feet',
        'Anneau':'waist','Amulette':'waist','Bouclier':'shield','Gants':'hands','Ceinture':'waist','Jambières':'legs'
    };

    let itemType = types[Math.floor(Math.random()*types.length)];
    let prefix = prefixes[Math.floor(Math.random()*prefixes.length)];
    let stat = stats[Math.floor(Math.random()*stats.length)];
    let value = Math.floor(Math.random()*40*gameState.floor) + 15;

    let item = {
        name: prefix + " " + itemType,
        type: itemType,
        slot: slotMap[itemType] || 'weapon',
        stat: stat,
        statName: statNames[stat],
        value: value,
        equipped: false
    };

    gameState.player.inventory.push(item);
    alert("💎 BUTIN: " + item.name + "\n" + item.statName + " +" + item.value);
}

function castSpell() {
    if(gameState.player.atb < 100 || !gameState.inCombat || gameState.player.mp < 20) return;
    gameState.player.atb = 0;
    gameState.player.mp -= 20;
    let dmg = Math.floor(gameState.player.mag * (1 + Math.random()));
    gameState.enemy.hp -= dmg;
    showFx('magic');
    if(gameState.enemy.hp <= 0) winCombat();
}

function showFx(id) {
    if(id === 'blood') {
        let el = document.getElementById('blood-splatter');
        el.classList.remove('hidden');
        el.classList.add('active');
        setTimeout(() => {
            el.classList.remove('active');
            el.classList.add('hidden');
        }, 500);
    } else {
        let el = document.getElementById('magic-effect');
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 300);
    }
}

function gameOver() {
    gameState.inCombat = false;
    clearInterval(cLoop);
    if(enemyAnimFrame) cancelAnimationFrame(enemyAnimFrame);
    document.getElementById('go-floor').innerText = gameState.floor;
    switchScreen('gameover-screen');
    gameState.adsWatchedForRevive = 0;
    updateGOBtn();
}

function updateGOBtn() {
    document.getElementById('btn-new-chance').innerText = `📺 New Chance (${gameState.adsWatchedForRevive}/10)`;
}

// ============================================
// INVENTAIRE AVEC PERSONNAGE DESSINÉ
// ============================================
function drawInventoryCharacter() {
    let c = document.getElementById('inv-char-canvas');
    let ctx = c.getContext('2d');
    let w = 200, h = 280;
    ctx.clearRect(0, 0, w, h);

    if(!gameState.player) return;
    let p = gameState.player;
    let time = Date.now() / 1000;
    let breathe = Math.sin(time) * 2;

    // Fond
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, w, h);

    // Aura selon classe
    let classColors = {
        Chevalier:'#4a90e2', Barbare:'#e74c3c', Elfe:'#2ecc71',
        Nain:'#f39c12', Espionne:'#9b59b6', Ninja:'#333', Amazone:'#e91e63'
    };
    let color = classColors[p.className] || '#fff';
    let grad = ctx.createRadialGradient(w/2, h/2, 30, w/2, h/2, 90);
    grad.addColorStop(0, color + '20');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Silhouette personnage
    let cx = w/2, cy = h/2 + 20;

    // Jambes
    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 18, cy + 30 + breathe, 14, 50);
    ctx.fillRect(cx + 4, cy + 30 + breathe, 14, 50);

    // Bottes
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - 20, cy + 75 + breathe, 18, 12);
    ctx.fillRect(cx + 2, cy + 75 + breathe, 18, 12);

    // Torse
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(cx - 25, cy - 20 + breathe);
    ctx.lineTo(cx + 25, cy - 20 + breathe);
    ctx.lineTo(cx + 20, cy + 35 + breathe);
    ctx.lineTo(cx - 20, cy + 35 + breathe);
    ctx.closePath();
    ctx.fill();

    // Ceinture
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cx - 18, cy + 25 + breathe, 36, 8);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx - 4, cy + 24 + breathe, 8, 10);

    // Bras
    ctx.fillStyle = '#555';
    ctx.fillRect(cx - 32, cy - 15 + breathe, 12, 45);
    ctx.fillRect(cx + 20, cy - 15 + breathe, 12, 45);

    // Mains
    ctx.fillStyle = '#666';
    ctx.beginPath(); ctx.arc(cx - 26, cy + 32 + breathe, 7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 26, cy + 32 + breathe, 7, 0, Math.PI*2); ctx.fill();

    // Tête
    ctx.fillStyle = '#8B7355';
    ctx.beginPath();
    ctx.arc(cx, cy - 35 + breathe, 22, 0, Math.PI*2);
    ctx.fill();

    // Visage détaillé
    // Yeux
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 8, cy - 38 + breathe, 5, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8, cy - 38 + breathe, 5, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - 8, cy - 38 + breathe, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 8, cy - 38 + breathe, 2.5, 0, Math.PI*2); ctx.fill();

    // Nez
    ctx.fillStyle = '#7a6348';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 32 + breathe);
    ctx.lineTo(cx - 3, cy - 25 + breathe);
    ctx.lineTo(cx + 3, cy - 25 + breathe);
    ctx.fill();

    // Bouche
    ctx.strokeStyle = '#7a6348';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 22 + breathe, 6, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Cheveux selon classe
    let hairColors = {
        Chevalier:'#DAA520', Barbare:'#8B0000', Elfe:'#FFD700',
        Nain:'#FF4500', Espionne:'#333', Ninja:'#000', Amazone:'#DC143C'
    };
    ctx.fillStyle = hairColors[p.className] || '#8B7355';
    ctx.beginPath();
    ctx.arc(cx, cy - 42 + breathe, 24, Math.PI, Math.PI*2);
    ctx.fill();

    // Casque si équipé
    if(p.equipment && p.equipment.head) {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy - 35 + breathe, 26, Math.PI*1.2, Math.PI*1.8);
        ctx.stroke();
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(cx - 3, cy - 62 + breathe, 6, 15);
    }

    // Arme si équipée
    if(p.equipment && p.equipment.weapon) {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx + 32, cy - 5 + breathe);
        ctx.lineTo(cx + 55, cy - 30 + breathe);
        ctx.stroke();
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(cx + 28, cy - 8 + breathe, 10, 20);
    }

    // Bouclier si équipé
    if(p.equipment && p.equipment.shield) {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(cx - 30, cy + 5 + breathe, 12, 18, -0.2, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#A0522D';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx - 30, cy + 5 + breathe, 12, 18, -0.2, 0, Math.PI*2);
        ctx.stroke();
    }

    // Armure si équipée
    if(p.equipment && p.equipment.torso) {
        ctx.strokeStyle = '#A0A0A0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy - 15 + breathe);
        ctx.lineTo(cx + 20, cy - 15 + breathe);
        ctx.lineTo(cx + 15, cy + 30 + breathe);
        ctx.lineTo(cx - 15, cy + 30 + breathe);
        ctx.closePath();
        ctx.stroke();
    }
}

function updateInventoryUI() {
    let p = gameState.player;
    if(!p) return;

    drawInventoryCharacter();

    // Stats de base
    let baseStats = cStats[p.className];
    document.getElementById('inv-str').innerText = p.str;
    document.getElementById('inv-str-base').innerText = '(base ' + Math.floor(baseStats.str * 0.5) + '-' + baseStats.str + ')';
    document.getElementById('inv-agi').innerText = p.agi;
    document.getElementById('inv-agi-base').innerText = '(base ' + Math.floor(baseStats.agi * 0.5) + '-' + baseStats.agi + ')';
    document.getElementById('inv-vit').innerText = p.vit;
    document.getElementById('inv-vit-base').innerText = '(base ' + Math.floor(baseStats.vit * 0.5) + '-' + baseStats.vit + ')';
    document.getElementById('inv-end').innerText = p.end;
    document.getElementById('inv-end-base').innerText = '(base ' + Math.floor(baseStats.end * 0.5) + '-' + baseStats.end + ')';
    document.getElementById('inv-int').innerText = p.int;
    document.getElementById('inv-int-base').innerText = '(base ' + Math.floor(baseStats.int * 0.5) + '-' + baseStats.int + ')';
    document.getElementById('inv-mag').innerText = p.mag;
    document.getElementById('inv-mag-base').innerText = '(base ' + Math.floor(baseStats.mag * 0.5) + '-' + baseStats.mag + ')';
    document.getElementById('inv-lck').innerText = p.lck;
    document.getElementById('inv-lck-base').innerText = '(base ' + Math.floor(baseStats.lck * 0.5) + '-' + baseStats.lck + ')';

    let power = p.str + p.agi + p.vit + p.end + p.int + p.mag + p.lck;
    document.getElementById('inv-power').innerText = power;

    // Équipement actuel
    let slots = ['head','torso','hands','waist','legs','feet','weapon','shield'];
    slots.forEach(slot => {
        let item = p.equipment[slot];
        let slotEl = document.getElementById('slot-' + slot);
        let itemEl = document.getElementById('equip-' + slot);
        if(item) {
            itemEl.innerText = item.name;
            slotEl.classList.add('occupied');
        } else {
            itemEl.innerText = '';
            slotEl.classList.remove('occupied');
        }
    });

    // Liste d'inventaire
    let list = document.getElementById('inv-list');
    list.innerHTML = '';
    p.inventory.forEach((it, idx) => {
        let div = document.createElement('div');
        div.className = 'inv-item' + (it.equipped ? ' equipped' : '');
        div.innerHTML = `
            <span class="inv-item-name">${it.name}</span>
            <span class="inv-item-stats">${it.statName} +${it.value}</span>
            <span class="inv-item-action">${it.equipped ? '✓ Équipé' : '⚔ Équiper'}</span>
        `;
        div.onclick = () => equipItem(idx);
        list.appendChild(div);
    });
}

function equipItem(idx) {
    let p = gameState.player;
    let item = p.inventory[idx];
    if(!item) return;

    // Déséquiper l'ancien item du même slot
    let current = p.equipment[item.slot];
    if(current) {
        p[current.stat] -= current.value;
        current.equipped = false;
    }

    // Équiper le nouveau
    p.equipment[item.slot] = item;
    p[item.stat] += item.value;
    item.equipped = true;

    updateInventoryUI();
    updateUI();
}

// ============================================
// CONTRÔLES
// ============================================
const keys = {};

window.addEventListener('keydown', e => {
    keys[e.key] = true;
    initAudio();
});
window.addEventListener('keyup', e => keys[e.key] = false);

function setupDpad() {
    let m = {'d-up':'ArrowUp','d-down':'ArrowDown','d-left':'ArrowLeft','d-right':'ArrowRight'};
    Object.keys(m).forEach(id => {
        let b = document.getElementById(id);
        if(!b) return;

        b.addEventListener('touchstart', e => {
            e.preventDefault();
            keys[m[id]] = true;
            initAudio();
            b.classList.add('active');
        }, {passive:false});

        b.addEventListener('touchend', e => {
            e.preventDefault();
            keys[m[id]] = false;
            b.classList.remove('active');
        });

        b.addEventListener('mousedown', () => {
            keys[m[id]] = true;
            initAudio();
            b.classList.add('active');
        });

        b.addEventListener('mouseup', () => {
            keys[m[id]] = false;
            b.classList.remove('active');
        });

        b.addEventListener('mouseleave', () => {
            keys[m[id]] = false;
            b.classList.remove('active');
        });
    });
}

// ============================================
// MOUVEMENT AVEC RENCONTRES ÉQUILIBRÉES
// ============================================
function movePlayer() {
    if(gameState.screen === 'game' && !gameState.inCombat) {
        let sp = 0.06, rt = 0.05;
        let nx = gameState.playerPos.x, ny = gameState.playerPos.y;
        let moved = false;

        if(keys['ArrowUp']) {
            nx += Math.cos(gameState.playerPos.angle) * sp;
            ny += Math.sin(gameState.playerPos.angle) * sp;
        }
        if(keys['ArrowDown']) {
            nx -= Math.cos(gameState.playerPos.angle) * sp;
            ny -= Math.sin(gameState.playerPos.angle) * sp;
        }
        if(keys['ArrowLeft']) gameState.playerPos.angle -= rt;
        if(keys['ArrowRight']) gameState.playerPos.angle += rt;

        let mx = Math.floor(nx), my = Math.floor(ny);

        if(my >= 0 && my < gameState.map.length && mx >= 0 && mx < gameState.map[0].length) {
            let tile = gameState.map[my][mx];
            if(tile === 0) {
                gameState.playerPos.x = nx;
                gameState.playerPos.y = ny;
                moved = true;
            } else if(tile === 2) {
                nextFloor();
                moved = true;
            } else if(tile === 3) {
                gameState.map[my][mx] = 0;
                gameState.playerPos.x = nx;
                gameState.playerPos.y = ny;
                moved = true;
                alert("🔓 Porte secrète découverte!");
            } else if(tile === 4) {
                gameState.map[my][mx] = 0;
                gameState.playerPos.x = nx;
                gameState.playerPos.y = ny;
                moved = true;
                genLoot();
            }
        }

        if(moved) {
            gameState.stepsSinceLastCombat++;
            if(gameState.stepsSinceLastCombat >= gameState.minStepsBeforeCombat) {
                let extra = gameState.stepsSinceLastCombat - gameState.minStepsBeforeCombat;
                let chance = Math.min(0.06, 0.008 + extra * 0.002);
                if(Math.random() < chance) startCombat();
            }
        }
    }
}

// ============================================
// GAME LOOP
// ============================================
let lastFrameTime = 0;

function gameLoop(time) {
    if(time - lastFrameTime >= 33) {
        movePlayer();
        if(gameState.screen === 'game') {
            castRays();
            drawMinimap();
        }
        lastFrameTime = time;
    }
    requestAnimationFrame(gameLoop);
}

function nextFloor() {
    if(gameState.floor >= 30) {
        // Victoire!
        document.getElementById('vic-level').innerText = gameState.player.level;
        switchScreen('victory-screen');
        return;
    }

    gameState.floor++;
    gameState.map = generateDungeon(22, 22, gameState.floor);
    gameState.playerPos = {x: 3, y: 3, angle: 0};
    gameState.stepsSinceLastCombat = 0;

    // Animation transition
    let trans = document.getElementById('level-transition');
    document.getElementById('transition-floor').innerText = gameState.floor;
    let typeIdx = Math.min(Math.floor((gameState.floor - 1) / 3), gameState.dungeonTypes.length - 1);
    document.getElementById('transition-sub').innerText = gameState.dungeonTypes[typeIdx] + "...";
    document.getElementById('dungeon-type').innerText = gameState.dungeonTypes[typeIdx];
    trans.classList.remove('hidden');
    setTimeout(() => trans.classList.add('hidden'), 2000);

    initAudio();
    updateUI();
}

// ============================================
// NAVIGATION
// ============================================
function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    let el = document.getElementById(id);
    if(el) el.classList.add('active');
    gameState.screen = id.replace('-screen', '');
}

// ============================================
// UI PRINCIPALE
// ============================================
function updateUI() {
    if(!gameState.player) return;
    let p = gameState.player;

    document.getElementById('ui-class').innerText = p.className;
    document.getElementById('ui-name').innerText = p.name;
    document.getElementById('ui-level').innerText = p.level;
    document.getElementById('ui-xp').innerText = p.xp + "/" + (p.level * 1000);
    document.getElementById('ui-str').innerText = p.str;
    document.getElementById('ui-agi').innerText = p.agi;
    document.getElementById('ui-vit').innerText = p.vit;
    document.getElementById('ui-end').innerText = p.end;
    document.getElementById('ui-int').innerText = p.int;
    document.getElementById('ui-mag').innerText = p.mag;
    document.getElementById('ui-lck').innerText = p.lck;
    document.getElementById('ui-floor').innerText = gameState.floor;

    let hpPct = Math.max(0, (p.hp / p.hpMax) * 100);
    let mpPct = Math.max(0, (p.mp / p.mpMax) * 100);
    document.getElementById('ui-hp-bar').style.width = hpPct + '%';
    document.getElementById('ui-hp-text').innerText = `HP: ${Math.max(0,p.hp)}/${p.hpMax}`;
    document.getElementById('ui-mp-bar').style.width = mpPct + '%';
    document.getElementById('ui-mp-text').innerText = `MP: ${Math.max(0,p.mp)}/${p.mpMax}`;

    if(gameState.enemy && gameState.inCombat) {
        let eHpPct = Math.max(0, (gameState.enemy.hp / gameState.enemy.hpMax) * 100);
        document.getElementById('enemy-hp-bar').style.width = eHpPct + '%';
        document.getElementById('enemy-hp-text').innerText = `${gameState.enemy.name} HP: ${Math.max(0,gameState.enemy.hp)}`;
    }
}

function updateCreationUI() {
    if(!gameState.player) return;
    let p = gameState.player;
    document.getElementById('stats-display').innerHTML = `
        <div class="stats-grid">
            <span>💪${p.str}</span><span>⚡${p.agi}</span><span>❤️${p.vit}</span>
            <span>🛡️${p.end}</span><span>📖${p.int}</span><span>✨${p.mag}</span><span>🍀${p.lck}</span>
        </div>`;
    document.getElementById('class-desc').innerText = classDesc[p.className] || "";
    document.getElementById('char-portrait').style.background = `linear-gradient(${Math.random()*360}deg, ${classColors[p.className] || '#333'}22, #000)`;
}

// ============================================
// ÉVÉNEMENTS
// ============================================
document.getElementById('btn-new').onclick = () => {
    let cls = document.getElementById('char-class').value;
    let name = document.getElementById('char-name').value || "Héros";
    gameState.player = {
        className: cls, name: name, level: 1, xp: 0,
        hpMax: 1000, mpMax: 500, hp: 1000, mp: 500, atb: 0,
        inventory: [], equipment: {}, spells: [],
        ...rollStats(cls)
    };
    updateCreationUI();
    switchScreen('creation-screen');
    initAudio();
};

document.getElementById('char-class').onchange = () => {
    if(gameState.player) document.getElementById('btn-new').click();
};

document.getElementById('btn-roll').onclick = () => {
    showRewardedAd(() => {
        if(gameState.player) {
            Object.assign(gameState.player, rollStats(gameState.player.className));
            updateCreationUI();
        }
    });
};

document.getElementById('btn-start-game').onclick = () => {
    gameState.floor = 1;
    gameState.map = generateDungeon(22, 22, 1);
    gameState.playerPos = {x: 3, y: 3, angle: 0};
    gameState.stepsSinceLastCombat = 0;
    initAudio();
    switchScreen('game-screen');
    updateUI();
};

document.getElementById('btn-attack').onclick = pAtk;
document.getElementById('btn-magic').onclick = castSpell;

document.getElementById('btn-inventory').onclick = () => {
    if(gameState.inCombat) return;
    switchScreen('inventory-screen');
    updateInventoryUI();
};

document.getElementById('btn-close-inv').onclick = () => switchScreen('game-screen');

document.getElementById('btn-restore').onclick = () => {
    if(gameState.inCombat) return;
    showRewardedAd(() => {
        if(gameState.player) {
            gameState.player.hp = Math.min(gameState.player.hpMax, gameState.player.hp + Math.floor(gameState.player.hpMax * 0.3));
            updateUI();
        }
    });
};

document.getElementById('btn-new-chance').onclick = () => {
    showRewardedAd(() => {
        gameState.adsWatchedForRevive++;
        updateGOBtn();
        if(gameState.adsWatchedForRevive >= 10) {
            if(gameState.player) {
                gameState.player.hp = gameState.player.hpMax;
                gameState.player.mp = gameState.player.mpMax;
            }
            switchScreen('game-screen');
            updateUI();
        }
    });
};

document.getElementById('btn-save').onclick = () => {
    let saveData = {
        player: gameState.player,
        floor: gameState.floor,
        playerPos: gameState.playerPos,
        map: gameState.map,
        stepsSinceLastCombat: gameState.stepsSinceLastCombat
    };
    localStorage.setItem('b84_save', JSON.stringify(saveData));
    alert("💾 Partie sauvegardée!");
};

document.getElementById('btn-load').onclick =
document.getElementById('btn-load-game').onclick = () => {
    let s = localStorage.getItem('b84_save');
    if(s) {
        let saveData = JSON.parse(s);
        gameState.player = saveData.player;
        gameState.floor = saveData.floor;
        gameState.playerPos = saveData.playerPos;
        gameState.map = saveData.map;
        gameState.stepsSinceLastCombat = saveData.stepsSinceLastCombat || 0;
        switchScreen('game-screen');
        initAudio();
        updateUI();
    } else {
        alert("❌ Aucune sauvegarde.");
    }
};

document.getElementById('btn-restart').onclick = () => {
    switchScreen('title-screen');
};

// ============================================
// INIT
// ============================================
setupDpad();
requestAnimationFrame(gameLoop);

document.body.addEventListener('click', initAudio, {once:true});
document.body.addEventListener('touchstart', initAudio, {once:true});

console.log("🎮 Brothers84 v2.0 chargé");
