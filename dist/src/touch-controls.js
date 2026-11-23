function canSwing(game) {
    return game.state === 'playing' && !game.physics.active && !game.pendingSwing &&
        !game.world.waterMoment && !game.world.pirateMoment && !game.world.adventureMoment;
}

function turnAim(game, radians) {
    if (!canSwing(game) || game.charging) return;
    const angle = Math.atan2(game.direction.z, game.direction.x) + radians;
    game.direction = { x: Math.cos(angle), z: Math.sin(angle) };
    game.aimTarget = null;
}

function setShotPower(ui, percent) {
    const game = ui.game;
    if (!canSwing(game) || game.charging || game.rotating || game.shotInput) return;
    game.onEvent('interact');
    game.beginPower();
    if (!game.charging) return;
    game.power = Math.max(.01, Math.min(1, percent / 100));
    game.shotInput = {type: 'touch-dock'};
    game.lockPower();
    // Solo practice also offers a shot without a timing requirement.
    if (game.charging && game.round.practice && !game.round.cloudId && !ui.cloud?.room) game.shoot();
    if (!game.charging) game.shotInput = null;
    return game.charging ? 'tick' : 'swing';
}

function advanceShot(game) {
    if (!canSwing(game) || game.rotating || (game.shotInput && game.shotInput.type !== 'touch-dock')) return;
    game.onEvent('interact');
    if (game.shotPhase === 'direction') {
        game.shoot();
        game.shotInput = null;
        return 'swing';
    }
    if (game.shotPhase === 'power') {
        game.lockPower();
        if (!game.charging) game.shotInput = null;
        return game.meterStyle() === 'fluid' ? 'swing' : 'tick';
    }
    game.beginPower();
    if (game.charging) {
        game.shotInput = {type: 'touch-dock'};
        return 'tick';
    }
}

function pinchCamera(game, before, after) {
    const [a,b] = before, [c,d] = after;
    const distance = (p,q) => Math.hypot(p.x-q.x, p.y-q.y);
    const oldSpan = distance(a,b), newSpan = distance(c,d);
    if (oldSpan < 5 || newSpan < 5) return;
    const world = game.world;
    world.cameraManualInput?.();
    world.orbit -= (c.x + d.x - a.x - b.x) * .003 * (world.settings?.cameraSensitivity || 1);
    world.pitch = Math.max(.16, Math.min(1.2, world.pitch + (c.y + d.y - a.y - b.y) * .0015));
    const [near, far] = game.mode === 'golf' ? [8, 240] : [10, 34];
    const scale = (oldSpan / newSpan) ** (world.settings?.zoomSensitivity || 1);
    world.zoom = Math.max(near, Math.min(far, world.zoom * scale));
}

function bindCourseGestures(ui) {
    const game = ui.game, canvas = ui.world.canvas;
    const points = new Map();
    let usedTwoFingers = false;
    function clear() {
        const ids = [...points.keys()];
        points.clear();
        usedTwoFingers = false;
        for (const id of ids) {
            if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
        }
    }
    function handle(event) {
        if (event.pointerType === 'mouse') return;
        const id = event.pointerId;
        if (game.state === 'menu') {
            clear();
            return;
        }
        // The desktop canvas uses a primary press to charge. Own touch input before it bubbles.
        event.preventDefault();
        event.stopImmediatePropagation();
        if (game.state !== 'playing' || ui.root.inert || ui.modalRoot.childElementCount) {
            clear();
            return;
        }
        const point = {x: event.clientX, y: event.clientY};
        if (event.type === 'pointerdown') {
            points.set(id, point);
            if (points.size > 1) usedTwoFingers = true;
            canvas.setPointerCapture(id);
            return;
        }
        const last = points.get(id);
        if (!last) return;
        if (event.type === 'pointermove') {
            const before = [...points.values()];
            points.set(id, point);
            if (points.size === 2) pinchCamera(game, before, [...points.values()]);
            else if (points.size === 1 && !usedTwoFingers) turnAim(game, (point.x-last.x) * .004);
        } else {
            points.delete(id);
            if (!points.size) usedTwoFingers = false;
        }
    }
    for (const kind of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) {
        canvas.addEventListener(kind, handle, {capture: true, passive: false});
    }
    window.addEventListener('blur', clear);
    return clear;
}

function shotView(game) {
    const fluid = game.meterStyle() === 'fluid';
    if (!canSwing(game)) return {phase: 'moving', action: 'Ball in play'};
    if (game.shotPhase === 'power') return {phase: 'power', action: fluid ? 'Release to swing' : 'Release to lock'};
    if (game.shotPhase === 'direction') return {phase: 'direction', action: 'Swing'};
    return {phase: fluid ? 'flow' : 'ready', action: 'Hold for power'};
}

const touchHelp = `<section class="controls-guide ios-help"><h2>Touch controls</h2>
    <p><b>Aim.</b> Drag left or right across the fairway. The arrows beside the swing button turn your aim one degree at a time.</p>
    <p><b>Classic swing.</b> Hold the yellow button to charge. Lift your finger at the strength you want, then tap Swing when the marker reaches the center.</p>
    <p><b>Flow swing.</b> Start holding when the direction marker reaches the center. Release at the power you want.</p>
    <p><b>Set power.</b> Tap Set power, move the slider, then press the yellow button. In Classic rounds, tap Swing to time your direction. Choose Use meter to switch back.</p>
    <p><b>Camera.</b> Slide two fingers together to look around. Pinch to zoom. Recenter brings the view back behind your ball.</p>
    <p><b>Club &amp; shot.</b> Tap your club name to change clubs, adjust spin or switch meters. Pause opens the round menu.</p>
    <button class="button yellow wide" data-action="close-modal">Done</button></section>`;

function roundToolbar(hud, tutorial) {
    const oldTools = hud.querySelector('.ph-tools');
    if (!oldTools || tutorial) return;
    const bar = document.createElement('div');
    bar.className = 'touch-toolbar';
    const menu = document.createElement('details');
    menu.className = 'touch-tools';
    const title = document.createElement('summary');
    title.textContent = 'Tools';
    title.setAttribute('aria-label', 'Round tools');
    menu.append(title);
    const panel = document.createElement('div');
    panel.className = 'touch-tools-panel';
    menu.append(panel);
    const pause = oldTools.querySelector('[data-action="pause"]');
    bar.append(menu);
    if (pause) {
        pause.addEventListener('click', () => { menu.open = false; });
        bar.append(pause);
    }
    const camera = hud.querySelector('.camera-controls');
    const skip = camera?.querySelector('#camera-skip');
    if (skip) bar.prepend(skip);
    for (const group of [oldTools, camera, hud.querySelector('.course-weather')]) {
        if (group) panel.append(group);
    }
    hud.append(bar);
}

export function installTouchControls(ui) {
    const game = ui.game;
    ui.root.dataset.touchControls = 'true';
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/touch.css';
    document.head.append(style);
    const clearGestures = bindCourseGestures(ui);
    ui.shotPanelCollapsed = true;
    const dock = document.createElement('section');
    dock.className = 'touch-dock';
    dock.setAttribute('aria-label', 'Shot controls');
    dock.innerHTML = `
        <div class="touch-readout">
          <button class="touch-club" type="button" aria-controls="shot-options" aria-expanded="false"></button>
          <button type="button" class="touch-mode" aria-pressed="false" aria-controls="touch-shot-power">Set power</button>
          <span class="touch-score"></span>
        </div>
        <div class="touch-meter"><span class="touch-meter-label"></span>
          <input class="touch-power" id="touch-shot-power" type="range" aria-label="Shot power" min="1" max="100" value="50" hidden>
          <span class="touch-track" aria-hidden="true"><i class="touch-marker"></i></span></div>
        <div class="touch-actions">
          <button type="button" class="touch-fine" data-turn="-1" aria-label="Aim left one degree">‹</button>
          <button type="button" class="touch-fine" data-turn="1" aria-label="Aim right one degree">›</button>
          <button type="button" class="touch-swing" aria-describedby="touch-instruction"></button>
        </div>
        <span id="touch-instruction" class="touch-sr"></span>
        <span class="touch-sr touch-announcement" role="status" aria-live="polite"></span>`;
    const club = dock.querySelector('.touch-club'), score = dock.querySelector('.touch-score');
    const swing = dock.querySelector('.touch-swing'), arrows = [...dock.querySelectorAll('[data-turn]')];
    const hint = dock.querySelector('#touch-instruction'), readout = dock.querySelector('.touch-meter-label');
    const track = dock.querySelector('.touch-track'), marker = dock.querySelector('.touch-marker');
    const announcement = dock.querySelector('.touch-announcement');
    const modeButton = dock.querySelector('.touch-mode'), powerSlider = dock.querySelector('.touch-power');
    let presetRound = null;
    const instructions = {
        preset: 'Adjust the Shot power slider, then press the yellow button.',
        ready: 'Hold to charge and lift your finger to lock power.',
        flow: 'Start holding when the direction marker is centered.',
        power: 'Lift your finger at your desired shot strength.',
        direction: 'Tap when the direction marker is centered.',
        moving: 'Wait for your ball to stop.'
    };
    let lastPhase, lastMeterValue, lastHole;
    function setText(node, value) { if (node.textContent !== value) node.textContent = value; }
    function syncMeter() {
        if (!dock.isConnected) return;
        const preset = Boolean(game.round && presetRound === game.round);
        ui.root.dataset.touchPowerMode = preset ? 'preset' : 'meter';
        const practice = game.round?.practice && !game.round.cloudId && !ui.cloud?.room;
        const {phase, action} = preset && canSwing(game) && !game.charging
            ? {phase: 'preset', action: practice || game.meterStyle() === 'fluid' ? 'Swing' : 'Lock power'} : shotView(game);
        if (lastPhase !== phase) {
            lastPhase = phase;
            lastMeterValue = null;
            dock.dataset.phase = phase;
            marker.style.left = '';
            track.hidden = ['ready', 'moving', 'preset'].includes(phase);
            powerSlider.hidden = phase !== 'preset';
            modeButton.disabled = game.charging || phase === 'moving';
            modeButton.setAttribute('aria-pressed', String(Boolean(preset)));
            setText(modeButton, preset ? 'Use meter' : 'Set power');
            setText(swing, action);
            setText(hint, instructions[phase]);
            swing.disabled = phase === 'moving';
            club.disabled = game.charging || swing.disabled || ui.tutorialActive;
            for (const arrow of arrows) arrow.disabled = game.charging || swing.disabled;
            setText(announcement, phase === 'moving' ? 'Ball in play.' : `${action}. ${instructions[phase]}`);
        }
        if (phase === 'preset') {
            setText(readout, `Power · ${powerSlider.value}%`);
            return;
        }
        if (phase === 'power') {
            const value = Math.round(game.power * 100);
            if (lastMeterValue === value) return;
            lastMeterValue = value;
            setText(readout, `Power · ${value}%`);
            marker.style.transform = `scaleX(${value / 100})`;
        } else if (phase === 'direction' || phase === 'flow') {
            const value = Math.round((game.displayedAccuracy ?? game.accuracy) * 100);
            if (lastMeterValue === value) return;
            lastMeterValue = value;
            setText(readout, Math.abs(value) <= 16 ? 'Direction · Center' : value < 0 ? 'Direction · Left' : 'Direction · Right');
            marker.style.transform = '';
            marker.style.left = `${(value + 100) / 2}%`;
        } else {
            setText(readout, phase === 'ready' ? 'Drag to aim · Tap an arrow for fine aim' : 'Following your shot');
        }
    }
    function mount() {
        const hud = ui.root.querySelector('.play-hud');
        if (!hud) {
            dock.remove();
            clearGestures();
            return;
        }
        if (lastHole !== game.hole) {
            lastHole = game.hole;
            clearGestures();
        }
        roundToolbar(hud, ui.tutorialActive);
        hud.append(dock);
        const name = hud.querySelector('.club-current strong')?.textContent || 'Putter';
        setText(club, `${name} ▴`);
        club.setAttribute('aria-label', `Club and shot options, ${name}`);
        club.setAttribute('aria-expanded', String(!ui.shotPanelCollapsed));
        const status = game.hole.space ? `Journey ${game.physics.reached || 0}/8` : `Hole ${game.index+1} · Par ${game.hole.par}`;
        setText(score, `${status} · ${game.strokes} ${game.strokes === 1 ? 'shot' : 'shots'}`);
        lastPhase = null;
        syncMeter();
    }
    club.addEventListener('click', () => ui.action('toggle-shot-panel', {}));
    for (const arrow of arrows) {
        arrow.addEventListener('click', () => {
            const direction = Number(arrow.dataset.turn);
            turnAim(game, direction * Math.PI / 180);
            const bearing = (Math.round(Math.atan2(game.direction.x, -game.direction.z) * 180 / Math.PI) + 360) % 360;
            setText(announcement, `Aim ${bearing} degrees.`);
        });
    }
    powerSlider.addEventListener('input', () => {
        powerSlider.setAttribute('aria-valuetext', powerSlider.value + ' percent');
        syncMeter();
    });
    modeButton.addEventListener('click', () => {
        if (!game.round || game.charging || !canSwing(game)) return;
        presetRound = presetRound === game.round ? null : game.round;
        syncMeter();
        if (presetRound) powerSlider.focus({preventScroll: true});
    });

    let held = null;
    function activate() {
        if (swing.disabled || ui.root.inert || ui.modalRoot.childElementCount) return;
        const feedback = dock.dataset.phase === 'preset'
            ? setShotPower(ui, Number(powerSlider.value)) : advanceShot(game);
        if (feedback) window.webkit?.messageHandlers?.golfFeedback?.postMessage(feedback);
        syncMeter();
    }
    function cancelHold() {
        if (held !== null && game.shotInput?.type === 'touch-dock') game.cancelShot();
        held = null;
        syncMeter();
    }
    swing.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0 || held !== null) return;
        event.preventDefault();
        swing.setPointerCapture(event.pointerId);
        held = event.pointerId;
        if (['ready', 'flow'].includes(dock.dataset.phase)) activate();
    });
    swing.addEventListener('pointerup', event => {
        if (event.pointerId !== held) return;
        held = null;
        if (['power', 'direction', 'preset'].includes(dock.dataset.phase)) activate();
    });
    for (const type of ['pointercancel', 'lostpointercapture']) {
        swing.addEventListener(type, event => { if (event.pointerId === held) cancelHold(); });
    }
    // A screen reader or keyboard can activate the same steps without holding.
    swing.addEventListener('click', event => { if (event.detail === 0) activate(); });
    const pause = ui.pause.bind(ui);
    ui.pause = paused => {
        if (paused) {
            const menu = ui.root.querySelector('.touch-tools');
            if (menu) menu.open = false;
            cancelHold();
        }
        return pause(paused);
    };
    const render = ui.render.bind(ui);
    ui.render = () => { render(); mount(); };
    const tickMeters = ui.tickMeters.bind(ui);
    ui.tickMeters = () => { tickMeters(); syncMeter(); };
    const action = ui.action.bind(ui);
    ui.action = (name, data) => {
        if (name === 'help') {
            ui.pauseForDialog();
            ui.modal(touchHelp);
            return;
        }
        return action(name, data);
    };
    function suspend() {
        clearGestures();
        cancelHold();
        if (game.state === 'playing') game.pause();
        ui.progress.save();
    }
    window.addEventListener('polygolf-suspend', suspend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
}
