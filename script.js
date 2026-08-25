// ============================================================
// 1. ОСНОВНАЯ ФУНКЦИЯ РАСЧЕТА ДЛЯ НАЛИВА (Delta PLC)
// ============================================================

function runUniversalCalculation() {
    const line = document.getElementById('lineSelect').value;
    const rawHeight = document.getElementById('bottleHeightInput').value;
    const rawVol = document.getElementById('volumeInput').value;
    const rawVisc = document.getElementById('viscosityInput').value;

    const bottleHeight = rawHeight ? parseFloat(rawHeight) : 245;
    const vol = rawVol ? parseFloat(rawVol) : 600;
    const visc = rawVisc ? parseFloat(rawVisc) : 0;
    
    if (bottleHeight <= 0 || vol <= 0 || visc < 0) return;

    let lineNum = "1.1";
    if (line === "LINE_1_2") lineNum = "1.2";
    if (line === "LINE_1_3") lineNum = "1.3";
    if (line === "LINE_1_4") lineNum = "1.4";
    if (line === "LINE_1_5") lineNum = "1.5";
    if (line === "LINE_1_6") lineNum = "1.6";

    const isWideNozzle = (line === "LINE_1_4" || line === "LINE_1_6");
    const nozzleAreaFactor = isWideNozzle ? 1.0 : 1.89;

    const vF = Math.min(visc / 8000, 1.0);

    let speed1 = 40 + 5 * vF;
    let speed2 = 70 + 5 * vF;
    let speed3 = 40 + 5 * vF;

    if (!isWideNozzle && visc > 3000) {
        speed1 = 20 + 25 * vF;
        speed2 = 45 + 25 * vF;
        speed3 = 20 + 25 * vF;
    }

    if (visc < 800) {
        const liquidDamping = 0.85 + (0.15 * (visc / 800));
        speed1 = speed1 * liquidDamping;
        speed3 = speed3 * liquidDamping;
    }

    let k_t2 = 0.20, k_t3 = 0.85;
    let isSmallLiquidFormat = (vol <= 1000 && visc < 500 && !isWideNozzle);

    // === БАЗОВЫЕ ПЕРЕМЕННЫЕ ===
    let ls1 = 0, ls2 = 0, ls3 = 0;
    let bp = 0, tp = 0, wp = 0;
    let np1 = 0, np2 = 0, np3 = 0;
    let sh_in_c = 0, sh_in_o = 0, sh_out_c = 0;
    let conv_m = 60.00, conv_l = 0.00;
    let tr_down = 100;
    let delay = 0.0;

    // === 7. РАСЧЕТ ДЛЯ МАЛОГО ФОРМАТА (≤ 1000 мл, вязкость < 500) ===
    if (isSmallLiquidFormat) {
        speed1 = 25.00;
        speed2 = 48.00;
        speed3 = 28.00;
        k_t2 = 0.10;
        k_t3 = 0.73;
        
        ls1 = 70;
        ls2 = 75;
        ls3 = 65;
        bp = 35;
        tp = Math.round(bottleHeight - 30);
        wp = Math.round(bottleHeight + 74);
        
        // === ПОЛОЖЕНИЯ СОПЕЛ: 1-е = 40, 2-е = 20% от высоты, 3-е = 80% от высоты ===
        np1 = 40;
        np2 = Math.round(bottleHeight * 0.20);
        np3 = Math.round(bottleHeight * 0.80);
        
        conv_m = 60.00;
        conv_l = 0.00;
        sh_in_c = 0.0;
        sh_in_o = 0.5;
        sh_out_c = 0.2;
        delay = 1.0;

    // === 8. СПЕЦИАЛЬНЫЕ НАСТРОЙКИ ДЛЯ ЛИНИИ 1.6 ===
    } else if (line === "LINE_1_6") {
        
        // === 8a. ОБЪЕМ 5000 мл, ВЯЗКОСТЬ ≤ 100 (фиксированные настройки) ===
        if (vol >= 4500 && vol <= 5500 && visc <= 100) {
            speed1 = 60.00;
            speed2 = 80.00;
            speed3 = 40.00;
            
            k_t2 = 0.16;
            k_t3 = 0.98;
            
            ls1 = 10;
            ls2 = 15;
            ls3 = 10;
            
            // === ФИКСИРОВАННЫЕ ПОЛОЖЕНИЯ ДЛЯ 5000 мл ===
            bp = 30;
            tp = 200;
            wp = 345;
            np1 = 30;
            np2 = 80;
            np3 = 192;
            
            conv_m = 80.00;
            conv_l = 25.00;
            sh_in_c = 0.0;
            sh_in_o = 1.0;
            sh_out_c = 0.0;
            tr_down = 100;
            delay = 2.5;
        
        // === 8b. ОБЪЕМ 1000 мл, ВЯЗКОСТЬ 0 ===
        } else if (vol >= 900 && vol <= 1100 && visc === 0) {
            speed1 = 30.00;
            speed2 = 55.00;
            speed3 = 18.00;
            
            k_t2 = 0.245;
            k_t3 = 0.888;
            
            ls1 = 30;
            ls2 = 50;
            ls3 = 30;
            
            // === ПОЛОЖЕНИЯ СОПЕЛ: 1-е = 40, 2-е = 20% от высоты, 3-е = 80% от высоты ===
            bp = 40;
            tp = Math.round(bottleHeight - 30);
            wp = Math.round(bottleHeight + 100);
            np1 = 40;
            np2 = Math.round(bottleHeight * 0.20);
            np3 = Math.round(bottleHeight * 0.80);
            
            conv_m = 60.00;
            conv_l = 0.00;
            sh_in_c = 0.0;
            sh_in_o = 0.5;
            sh_out_c = 0.2;
            tr_down = 100;
            delay = 1.0;
        
        // === 8c. ОСТАЛЬНЫЕ СЛУЧАИ ДЛЯ ЛИНИИ 1.6 ===
        } else {
            // Скорости насоса по стандартной формуле
            speed1 = 40 + 5 * vF;
            speed2 = 70 + 5 * vF;
            speed3 = 40 + 5 * vF;
            
            if (visc < 800) {
                const liquidDamping = 0.85 + (0.15 * (visc / 800));
                speed1 = speed1 * liquidDamping;
                speed3 = speed3 * liquidDamping;
            }
            
            speed1 = Math.min(speed1, 100.00);
            speed2 = Math.min(speed2, 100.00);
            speed3 = Math.min(speed3, 100.00);
            
            // Скорости подъема с учетом высоты, объема и вязкости
            const heightFactor = bottleHeight / 230;
            const volumeFactor = 1000 / vol;
            const viscosityFactor = 1 + (1 - vF) * 0.5;
            
            const baseLiftSpeed = Math.round(30 * heightFactor * volumeFactor * viscosityFactor);
            
            ls1 = Math.max(Math.round(baseLiftSpeed * 0.6), 10);
            ls2 = Math.max(Math.round(baseLiftSpeed * 1.0), 10);
            ls3 = Math.max(Math.round(baseLiftSpeed * 0.6), 10);
            
            ls1 = Math.min(ls1, 100);
            ls2 = Math.min(ls2, 100);
            ls3 = Math.min(ls3, 100);
            
            // === ПОЛОЖЕНИЯ СОПЕЛ: 1-е = 40, 2-е = 20% от высоты, 3-е = 80% от высоты ===
            bp = 40;
            tp = Math.round(bottleHeight - 30);
            wp = Math.round(bottleHeight + 100);
            np1 = 40;
            np2 = Math.round(bottleHeight * 0.20);
            np3 = Math.round(bottleHeight * 0.80);
            
            conv_m = 70.00;
            conv_l = 15.00;
            sh_in_c = 0.5;
            sh_in_o = 0.0;
            sh_out_c = 0.0;
            
            let calculatedDelay = (vol / 5000) * (80 / speed1) * (1.0 - vF);
            delay = parseFloat(Math.max(calculatedDelay, 1.0).toFixed(1));
            tr_down = 100;
        }

    // === 9. РАСЧЕТ ДЛЯ СРЕДНЕГО ФОРМАТА (1000-1500 мл) ===
    } else if (vol <= 1500) {
        speed2 = speed2 * 0.90;
        speed1 = speed1 * 0.92;
        speed2 = speed2 * 0.92;
        speed3 = speed3 * 0.92;
        
        const baseMultiplier = 43.5;
        const kinematicsFactor = (speed2 / bottleHeight) * baseMultiplier * nozzleAreaFactor;
        let baseLiftSpeed = Math.round(kinematicsFactor * (1.0 + 0.35 * vF));
        baseLiftSpeed = Math.max(baseLiftSpeed, 15);
        
        ls2 = baseLiftSpeed;
        ls1 = Math.max(Math.round(ls2 * 0.9), 15);
        ls3 = Math.max(Math.round(ls2 * 0.85), 15);
        
        // === ПОЛОЖЕНИЯ СОПЕЛ: 1-е = 40, 2-е = 20% от высоты, 3-е = 80% от высоты ===
        bp = 40;
        tp = Math.round(bottleHeight - 30);
        wp = Math.round(bottleHeight + 100);
        np1 = 40;
        np2 = Math.round(bottleHeight * 0.20);
        np3 = Math.round(bottleHeight * 0.80);
        
        conv_m = 60.00;
        conv_l = 0.00;
        sh_in_c = 0.0;
        sh_in_o = 0.5;
        sh_out_c = 0.2;
        
        let calculatedDelay = (vol / 5000) * (80 / speed1) * (1.0 - vF);
        delay = parseFloat(Math.max(calculatedDelay, 1.0).toFixed(1));

    // === 10. РАСЧЕТ ДЛЯ БОЛЬШОГО ФОРМАТА (> 1500 мл) ===
    } else {
        let baseMultiplier;
        if (vol > 3000) {
            baseMultiplier = 65.0;
        } else {
            baseMultiplier = 51.5;
        }
        
        const kinematicsFactor = (speed2 / bottleHeight) * baseMultiplier * nozzleAreaFactor;
        let baseLiftSpeed = Math.round(kinematicsFactor * (1.0 + 0.35 * vF));
        baseLiftSpeed = Math.max(baseLiftSpeed, 15);
        
        ls2 = baseLiftSpeed;
        ls1 = Math.max(Math.round(ls2 * 0.9), 15);
        ls3 = Math.max(Math.round(ls2 * 0.85), 15);
        
        // === ПОЛОЖЕНИЯ СОПЕЛ: 1-е = 40, 2-е = 20% от высоты, 3-е = 80% от высоты ===
        bp = 40;
        tp = Math.round(bottleHeight - 30);
        wp = Math.round(bottleHeight + 100);
        np1 = 40;
        np2 = Math.round(bottleHeight * 0.20);
        np3 = Math.round(bottleHeight * 0.80);
        
        conv_m = 70.00;
        conv_l = 15.00;
        sh_in_c = 0.5;
        sh_in_o = 0.0;
        sh_out_c = 0.0;
        
        let calculatedDelay = (vol / 5000) * (80 / speed1) * (1.0 - vF);
        delay = parseFloat(Math.max(calculatedDelay, 1.0).toFixed(1));
    }

    // === ОГРАНИЧЕНИЕ СКОРОСТЕЙ ===
    speed1 = Math.min(speed1, 100.00);
    speed2 = Math.min(speed2, 100.00);
    speed3 = Math.min(speed3, 100.00);
    ls1 = Math.min(ls1, 100);
    ls2 = Math.min(ls2, 100);
    ls3 = Math.min(ls3, 100);

    // === 11. РАСЧЕТ ВЕСА ===
    let baseDensity;
    if (vol > 1500) {
        baseDensity = (line === "LINE_1_6" && vol >= 4500 && vol <= 5500 && visc <= 100) ? 1.02 : 0.98;
    } else if (line === "LINE_1_6" && vol >= 900 && vol <= 1100 && visc === 0) {
        baseDensity = 0.98;
    } else {
        baseDensity = isSmallLiquidFormat ? 0.96 : 0.94;
    }
    const densityFactor = baseDensity - (0.04 * vF);
    const tw = Math.round(vol * densityFactor);

    let t2 = Math.round(tw * k_t2);
    let t3 = Math.round(tw * k_t3);

    // === 12. НАЗВАНИЕ ПРОДУКТА (РЕЦЕПТ № X.X) ===
    const prodLabel = "РЕЦЕПТ № " + lineNum;

    // === 13. БЛОКИРОВКА КОНВЕЙЕРА ===
    const stopConv = (vol <= 1000);

    // === 14. ФОРМИРОВАНИЕ ЗНАЧЕНИЯ ДЛЯ 2-Й СКОРОСТИ НАСОСА ===
    let pumpSpeed2Display;
    if (visc > 1000) {
        const topPourSpeed = speed2 * 0.88;
        pumpSpeed2Display = "(ВЕРХН.) " + topPourSpeed.toFixed(2) + "  (ДОН.) " + speed2.toFixed(2);
    } else {
        pumpSpeed2Display = speed2.toFixed(2);
    }

    // === 15. ВЫВОД ПАРАМЕТРОВ ===
    const fields = {
        'val_lift_speed_3': ls3,
        'val_nozzle_pos_3': np3,
        'val_lift_speed_2': ls2,
        'val_nozzle_pos_2': np2,
        'val_lift_speed_1': ls1,
        'val_nozzle_pos_1': np1,
        'val_pump_speed_3': speed3.toFixed(2),
        'val_trans_volume_3': t3,
        'val_pump_speed_2': pumpSpeed2Display,
        'val_trans_volume_2': t2,
        'val_pump_speed_1': speed1.toFixed(2),
        'val_wait_point': wp,
        'val_top_pour': tp,
        'val_bottom_pos': bp,
        'val_total_weight': tw,
        'val_shiber_close_in': sh_in_c.toFixed(1),
        'val_shiber_open_in': sh_in_o.toFixed(1),
        'val_shiber_close_out': sh_out_c.toFixed(1),
        'val_traverse_down_speed': tr_down,
        'val_conveyor_main_speed': conv_m.toFixed(2),
        'val_conveyor_low_speed': conv_l.toFixed(2),
        'val_line_num': lineNum,
        'val_product_label': prodLabel,
        'sub_nozzle_lift_delay': delay.toFixed(1) + " сек"
    };

    for (let [id, val] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    const badge = document.getElementById('sub_conveyor_stop_badge');
    if (badge) {
        badge.textContent = stopConv ? "ЗАПУСТИТЬ (ОСТАНОВ АКТИВЕН)" : "ОСТАНОВИТЬ (ХОД НЕПРЕРЫВЕН)";
        badge.className = stopConv ? "status-badge badge-top-active" : "status-badge badge-stop-disabled";
    }

    const noticeEl = document.getElementById('viscosityNotice');
    if (noticeEl) {
        noticeEl.style.display = visc > 1000 ? 'block' : 'none';
    }
}

// ============================================================
// 2. ЛОГИКА ВКЛАДОК НАВИГАЦИИ
// ============================================================

function switchTab(tabName) {
    const fillingContent = document.getElementById('content-filling');
    const labelingContent = document.getElementById('content-labeling');
    const cappingContent = document.getElementById('content-capping');
    const btnFilling = document.getElementById('btn-tab-filling');
    const btnLabeling = document.getElementById('btn-tab-labeling');
    const btnCapping = document.getElementById('btn-tab-capping');

    fillingContent.classList.add('hidden');
    labelingContent.classList.add('hidden');
    cappingContent.classList.add('hidden');
    
    btnFilling.className = "flex-1 bg-zinc-900 text-zinc-400 font-bold py-2 rounded text-xs uppercase tracking-wider transition border border-zinc-800 cursor-pointer";
    btnLabeling.className = "flex-1 bg-zinc-900 text-zinc-400 font-bold py-2 rounded text-xs uppercase tracking-wider transition border border-zinc-800 cursor-pointer";
    btnCapping.className = "flex-1 bg-zinc-900 text-zinc-400 font-bold py-2 rounded text-xs uppercase tracking-wider transition border border-zinc-800 cursor-pointer";

    if (tabName === 'filling') {
        fillingContent.classList.remove('hidden');
        btnFilling.className = "flex-1 bg-amber-600 text-black font-black py-2 rounded text-xs uppercase tracking-wider transition cursor-pointer";
    } else if (tabName === 'labeling') {
        labelingContent.classList.remove('hidden');
        btnLabeling.className = "flex-1 bg-amber-600 text-black font-black py-2 rounded text-xs uppercase tracking-wider transition cursor-pointer";
    } else if (tabName === 'capping') {
        cappingContent.classList.remove('hidden');
        btnCapping.className = "flex-1 bg-amber-600 text-black font-black py-2 rounded text-xs uppercase tracking-wider transition cursor-pointer";
    }
}

// ============================================================
// 3. КАЛЬКУЛЯТОР ЭТИКЕТОВЩИКА
// ============================================================

// Коэффициенты для пересчета скорости в частоту (универсальные для всех линий)
const LABELER_COEFFICIENTS = {
    conveyor: 2.86,
    press: 4.55,
    roller: 2.14
};

// Максимальные значения
const LABELER_MAX = {
    conveyor: { freq: 60, speed: 21.0 },
    press: { freq: 90, speed: 20.0 },
    roller: { freq: 60, speed: 28.0 }
};

function calculateLabelerFrequencies() {
    const speedInput = document.getElementById('conveyor-speed-input');
    const speed = parseFloat(speedInput.value) || 0;
    
    if (speed <= 0) {
        document.getElementById('labeler-conveyor-freq').textContent = '—';
        document.getElementById('labeler-press-freq').textContent = '—';
        document.getElementById('labeler-roller-freq').textContent = '—';
        
        document.getElementById('labeler-conveyor-bar').style.width = '0%';
        document.getElementById('labeler-press-bar').style.width = '0%';
        document.getElementById('labeler-roller-bar').style.width = '0%';
        return;
    }
    
    const conveyorFreq = speed * LABELER_COEFFICIENTS.conveyor;
    const pressFreq = speed * LABELER_COEFFICIENTS.press;
    const rollerFreq = speed * LABELER_COEFFICIENTS.roller;
    
    document.getElementById('labeler-conveyor-freq').textContent = conveyorFreq.toFixed(1);
    document.getElementById('labeler-press-freq').textContent = pressFreq.toFixed(1);
    document.getElementById('labeler-roller-freq').textContent = rollerFreq.toFixed(1);
    
    const conveyorPercent = Math.min((conveyorFreq / LABELER_MAX.conveyor.freq) * 100, 100);
    const pressPercent = Math.min((pressFreq / LABELER_MAX.press.freq) * 100, 100);
    const rollerPercent = Math.min((rollerFreq / LABELER_MAX.roller.freq) * 100, 100);
    
    updateProgressBar('labeler-conveyor-bar', conveyorPercent, LABELER_MAX.conveyor.freq, conveyorFreq);
    updateProgressBar('labeler-press-bar', pressPercent, LABELER_MAX.press.freq, pressFreq);
    updateProgressBar('labeler-roller-bar', rollerPercent, LABELER_MAX.roller.freq, rollerFreq);
}

function updateProgressBar(barId, percent, maxFreq, currentFreq) {
    const bar = document.getElementById(barId);
    bar.style.width = Math.min(percent, 100) + '%';
    
    const ratio = currentFreq / maxFreq;
    if (ratio >= 0.95) {
        bar.className = 'h-1.5 rounded-full transition-all duration-300 bg-red-500';
    } else if (ratio >= 0.80) {
        bar.className = 'h-1.5 rounded-full transition-all duration-300 bg-yellow-500';
    } else {
        bar.className = 'h-1.5 rounded-full transition-all duration-300 bg-green-500';
    }
}

function resetLabelerForm() {
    document.getElementById('conveyor-speed-input').value = '14.0';
    document.getElementById('labelerLineSelect').value = 'LINE_1_3';
    calculateLabelerFrequencies();
}

// ============================================================
// 4. НАСТРОЙКА УГЛА НОЖА (ИНКЛИНОМЕТР)
// ============================================================

function updateKnifeInstructions() {
    const bottleType = document.getElementById('knife-bottle-type').value;
    const wallAngle = parseFloat(document.getElementById('knife-wall-angle').value) || 0;
    const roundingAngle = parseFloat(document.getElementById('knife-rounding-angle').value) || 0;
    
    const container = document.getElementById('knife-instructions');
    const recommendationBlock = document.getElementById('knife-recommendation');
    const recommendationText = document.getElementById('knife-recommendation-text');
    
    // Показываем/скрываем поле скругления (только для пузатых и круглых)
    const roundingBlock = document.getElementById('knife-rounding-block');
    const hasRounding = (bottleType === 'belly' || bottleType === 'round');
    if (hasRounding) {
        roundingBlock.classList.remove('hidden');
    } else {
        roundingBlock.classList.add('hidden');
    }
    
    let html = '';
    
    // === ПОПЕРЕЧНАЯ КАЛИБРОВКА (для ВСЕХ флаконов) ===
    html += `<div class="knife-section-title">📐 ПОПЕРЕЧНАЯ КАЛИБРОВКА (угол стенки)</div>`;
    
    html += `<div class="step-item">
        <span class="step-number">1</span>
        <span class="step-text"><strong>Инклинометр на конвейере поперек движения</strong> → <span class="step-highlight">ОБНУЛИТЬ</span> (конвейер остановлен)</span>
    </div>`;
    
    // Шаг 2: замер угла стенки (для ВСЕХ флаконов)
    html += `<div class="step-item step-active">
        <span class="step-number">2</span>
        <span class="step-text"><strong>Флакон под прижимом</strong> → замер наклона стенки по центру: <span class="step-highlight">${wallAngle.toFixed(1)}°</span></span>
    </div>`;
    
    if (wallAngle === 0) {
        html += `<div class="step-item step-done">
            <span class="step-number">💡</span>
            <span class="step-text">Угол стенки = 0° — флакон перпендикулярен конвейеру. Настройка не требуется.</span>
        </div>`;
    }
    
    html += `<div class="step-item">
        <span class="step-number">3</span>
        <span class="step-text"><strong>Перенести угол ${wallAngle.toFixed(1)}°</strong> на соответствующий нож</span>
    </div>`;
    
    html += `<div class="step-item">
        <span class="step-number">4</span>
        <span class="step-text"><strong>Повторить процедуру</strong> для <span class="step-highlight">противоположной стороны</span></span>
    </div>`;
    
    // === ПРОДОЛЬНАЯ КАЛИБРОВКА (для ВСЕХ флаконов) ===
    html += `<div class="knife-section-title">➡️ ПРОДОЛЬНАЯ КАЛИБРОВКА (параллельность конвейеру)</div>`;
    
    html += `<div class="step-item">
        <span class="step-number">5</span>
        <span class="step-text"><strong>Инклинометр вдоль движения конвейера</strong> → <span class="step-highlight">ОБНУЛИТЬ</span></span>
    </div>`;
    
    html += `<div class="step-item">
        <span class="step-number">6</span>
        <span class="step-text"><strong>Инклинометр к торцу ножа</strong> → выставить <span class="step-highlight">0°</span></span>
    </div>`;
    
    html += `<div class="step-item">
        <span class="step-number">7</span>
        <span class="step-text"><strong>Повторить процедуру</strong> для <span class="step-highlight">противоположной стороны</span></span>
    </div>`;
    
    // === СКРУГЛЕНИЕ (только для пузатых и круглых) ===
    if (hasRounding) {
        html += `<div class="knife-section-title">🔄 СКРУГЛЕНИЕ (для флаконов со скруглением)</div>`;
        
        html += `<div class="step-item step-active">
            <span class="step-number">8</span>
            <span class="step-text"><strong>Замер угла скругления транспортиром</strong> → <span class="step-highlight">${roundingAngle.toFixed(1)}°</span> → перенести на <strong>поворот ножа</strong></span>
        </div>`;
        
        html += `<div class="step-item">
            <span class="step-number">9</span>
            <span class="step-text"><strong>Расстояние от ножа до флакона</strong> в самой широкой части <span class="step-highlight">≤ 5 мм</span> (по горизонтали)</span>
        </div>`;
        
        html += `<div class="step-item">
            <span class="step-number">10</span>
            <span class="step-text"><strong>Вылет (язык) этикетки</strong> = расстояние между ножом и <span class="step-highlight">самой узкой частью стенки</span> флакона (на обеих сторонах)</span>
        </div>`;
        html += `<div class="step-item" style="border-left-color: #06b6d4; background-color: rgba(6, 182, 212, 0.05);">
            <span class="step-number" style="color: #06b6d4;">💡</span>
            <span class="step-text" style="color: #67e8f9;">Чтобы передний край этикетки ложился строго в нужное место с учетом скругления</span>
        </div>`;
    }
    
    // === РЕКОМЕНДАЦИЯ ===
    let recommendation = '';
    
    if (wallAngle > 0) {
        recommendation = `Установите нож под углом ${wallAngle.toFixed(1)}° (поперечная калибровка) и 0° (продольная калибровка)`;
        if (hasRounding && roundingAngle > 0) {
            recommendation += `, поворот ножа на ${roundingAngle.toFixed(1)}° для скругления`;
        }
    } else if (hasRounding && roundingAngle > 0) {
        recommendation = `Поворот ножа на ${roundingAngle.toFixed(1)}° для скругления. Зазор ≤ 5 мм.`;
    } else {
        recommendation = 'Нож параллелен конвейеру в двух плоскостях. Настройка выполнена!';
    }
    
    recommendationText.textContent = recommendation;
    recommendationBlock.classList.add('show');
    
    container.innerHTML = html;
}

function checkKnifeAngles() {
    updateKnifeInstructions();
}

function resetKnifeForm() {
    document.getElementById('knife-bottle-type').value = 'flat';
    document.getElementById('knife-wall-angle').value = '0.0';
    document.getElementById('knife-rounding-angle').value = '0.0';
    updateKnifeInstructions();
}

// ============================================================
// 5. УПРАВЛЕНИЕ ТИПОМ УКУПОРКИ
// ============================================================

let selectedCapType = 'cap';

function selectCappingType(type) {
    selectedCapType = type;
    const btnCap = document.getElementById('cap-type-cap');
    const btnTrigger = document.getElementById('cap-type-trigger');
    
    if (type === 'cap') {
        btnCap.className = "flex-1 py-2 rounded text-xs font-bold uppercase tracking-wider transition border-2 btn-cap-active cursor-pointer";
        btnTrigger.className = "flex-1 py-2 rounded text-xs font-bold uppercase tracking-wider transition border-2 bg-zinc-800 border-zinc-600 text-zinc-400 cursor-pointer";
    } else {
        btnTrigger.className = "flex-1 py-2 rounded text-xs font-bold uppercase tracking-wider transition border-2 btn-trigger-active cursor-pointer";
        btnCap.className = "flex-1 py-2 rounded text-xs font-bold uppercase tracking-wider transition border-2 bg-zinc-800 border-zinc-600 text-zinc-400 cursor-pointer";
    }
}

// ============================================================
// 6. МАТЕМАТИЧЕСКАЯ МОДЕЛЬ УКУПОРА KV 30
// ============================================================

function calculateCappingParams() {
    const capType = selectedCapType;
    const D_cap = parseFloat(document.getElementById('cap-diameter').value) || 30;
    const H_bottle = parseFloat(document.getElementById('capping-bottle-height').value) || 200;
    const H_cap = parseFloat(document.getElementById('cap-height').value) || 15;
    const V_conv_ms = parseFloat(document.getElementById('capping-conveyor-speed').value) || 0.20;
    const material = document.getElementById('cap-material').value;
    
    const V_conv_mmin = V_conv_ms * 60;
    
    const materialFactors = {
        'pet': { spindle: 1.0, time: 1.0, capper: 1.0, pressure: 3.0 },
        'metal': { spindle: 0.82, time: 1.33, capper: 0.82, pressure: 3.5 },
        'cork': { spindle: 1.16, time: 0.67, capper: 1.16, pressure: 2.5 },
        'aluminum': { spindle: 0.89, time: 1.17, capper: 0.89, pressure: 3.0 }
    };
    
    const mf = materialFactors[material] || materialFactors.pet;
    
    let sizeFactor = 1.0;
    if (D_cap < 25) sizeFactor = 1.1;
    else if (D_cap > 35) sizeFactor = 0.9;
    
    const baseSpindle = 73.00;
    const baseTime = 0.30;
    const baseCapper = 73.00;
    const baseSingle = 0.50;
    
    const V_spindle = baseSpindle * mf.spindle * sizeFactor;
    const T_3balls = baseTime * mf.time / sizeFactor;
    const V_capper = baseCapper * mf.capper * sizeFactor;
    const T_single = baseSingle * mf.time / sizeFactor;
    const P_capper = mf.pressure;
    
    let useCapper = true;
    if (capType === 'trigger') {
        useCapper = false;
    }
    
    const T_sensor_delay = 0.73;
    const T_delay = 0.00;
    
    let T_total;
    if (useCapper) {
        T_total = T_3balls + T_delay + T_single;
    } else {
        T_total = T_3balls;
    }
    const productivity = 3600 / T_total;
    
    displayCappingResult({
        capType: capType,
        material: material,
        D_cap: D_cap,
        H_bottle: H_bottle,
        H_cap: H_cap,
        V_conv_ms: V_conv_ms,
        V_conv_mmin: V_conv_mmin,
        V_spindle: V_spindle,
        T_3balls: T_3balls,
        V_capper: V_capper,
        T_single: T_single,
        P_capper: P_capper,
        useCapper: useCapper,
        T_sensor_delay: T_sensor_delay,
        T_delay: T_delay,
        T_total: T_total,
        productivity: productivity
    });
}

// ============================================================
// 7. ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА УКУПОРА// ============================================================

function displayCappingResult(params) {
    const resultBlock = document.getElementById('capping-result');
    const paramsList = document.getElementById('capping-params-list');
    const pneumaticList = document.getElementById('capping-pneumatic-list');
    const mechanicalList = document.getElementById('capping-mechanical-list');
    const performanceList = document.getElementById('capping-performance-list');
    const stepsList = document.getElementById('capping-steps-list');
    
    paramsList.innerHTML = '';
    pneumaticList.innerHTML = '';
    mechanicalList.innerHTML = '';
    performanceList.innerHTML = '';
    stepsList.innerHTML = '';
    
    const typeLabel = params.capType === 'cap' ? '🏷 Крышка' : '🔫 Триггер';
    const materialLabels = {
        'pet': 'ПЭТ (пластик)',
        'metal': 'Металл',
        'cork': 'Пробка',
        'aluminum': 'Алюминий'
    };
    
    paramsList.innerHTML += `<li><span class="text-zinc-500">CONVEYOR SPEED:</span> <span class="text-green-400 font-bold">${params.V_conv_mmin.toFixed(2)}</span> м/мин</li>`;
    paramsList.innerHTML += `<li><span class="text-zinc-500">SIDE BELTS SPEED (3 BALL):</span> <span class="text-green-400 font-bold">${params.V_spindle.toFixed(2)}</span> Гц/%</li>`;
    
    if (params.useCapper) {
        paramsList.innerHTML += `<li><span class="text-zinc-500">SIDE BELTS SPEED (SINGLE CAPPING):</span> <span class="text-green-400 font-bold">${params.V_capper.toFixed(2)}</span> Гц/%</li>`;
        paramsList.innerHTML += `<li><span class="text-zinc-500">CAP CLOSING TIME (3 BALLS):</span> <span class="text-green-400 font-bold">${params.T_3balls.toFixed(2)}</span> сек</li>`;
        paramsList.innerHTML += `<li><span class="text-zinc-500">CAP CLOSING TIME (SINGLE CAPPING):</span> <span class="text-green-400 font-bold">${params.T_single.toFixed(2)}</span> сек</li>`;
    } else {
        paramsList.innerHTML += `<li><span class="text-zinc-500">SIDE BELTS SPEED (SINGLE CAPPING):</span> <span class="text-red-400">❌ НЕ ИСПОЛЬЗУЕТСЯ</span></li>`;
        paramsList.innerHTML += `<li><span class="text-zinc-500">CAP CLOSING TIME (3 BALLS):</span> <span class="text-green-400 font-bold">${params.T_3balls.toFixed(2)}</span> сек</li>`;
        paramsList.innerHTML += `<li><span class="text-zinc-500">CAP CLOSING TIME (SINGLE CAPPING):</span> <span class="text-red-400">❌ НЕ ИСПОЛЬЗУЕТСЯ</span></li>`;
    }
    
    paramsList.innerHTML += `<li><span class="text-zinc-500">CAP CLOSING SENSOR DELAY:</span> <span class="text-green-400 font-bold">${params.T_sensor_delay.toFixed(2)}</span> сек</li>`;
    paramsList.innerHTML += `<li><span class="text-zinc-500">CAP CLOSING DELAY:</span> <span class="text-green-400 font-bold">${params.T_delay.toFixed(2)}</span> сек</li>`;
    
    pneumaticList.innerHTML += `<li><span class="text-zinc-500">Давление на входе:</span> <span class="text-amber-400 font-bold">5.0</span> бар (проверить манометром)</li>`;
    if (params.useCapper) {
        pneumaticList.innerHTML += `<li><span class="text-zinc-500">Давление добивалки:</span> <span class="text-amber-400 font-bold">${params.P_capper.toFixed(1)}</span> бар</li>`;
        pneumaticList.innerHTML += `<li><span class="text-zinc-500">Фильтр-влагоотделитель:</span> <span class="text-amber-400">слить конденсат</span></li>`;
        pneumaticList.innerHTML += `<li><span class="text-zinc-500">Маслораспылитель:</span> <span class="text-amber-400">проверить уровень (ISO VG 32)</span></li>`;
    } else {
        pneumaticList.innerHTML += `<li><span class="text-zinc-500">Добивалка:</span> <span class="text-red-400">❌ НЕ ИСПОЛЬЗУЕТСЯ (триггер)</span></li>`;
    }
    
    mechanicalList.innerHTML += `<li><span class="text-zinc-500">Зазор ролик-крышка:</span> <span class="text-amber-400 font-bold">0.5-1.0</span> мм (щуп)</li>`;
    mechanicalList.innerHTML += `<li><span class="text-zinc-500">Шпиндель 1 (полиур.):</span> <span class="text-amber-400">чистый, эластичный</span></li>`;
    mechanicalList.innerHTML += `<li><span class="text-zinc-500">Шпиндель 2 (полиур.):</span> <span class="text-amber-400">чистый, эластичный</span></li>`;
    mechanicalList.innerHTML += `<li><span class="text-zinc-500">Шпиндель 3 (металл.):</span> <span class="text-amber-400">гладкий, без задиров</span></li>`;
    mechanicalList.innerHTML += `<li><span class="text-zinc-500">Ремень:</span> <span class="text-amber-400">натянут (прогиб 5-10 мм)</span></li>`;
    
    if (params.useCapper) {
        mechanicalList.innerHTML += `<li><span class="text-zinc-500">Добивалка:</span> <span class="text-amber-400">ход свободный, зазор до крышки 0.5 мм</span></li>`;
    } else {
        mechanicalList.innerHTML += `<li><span class="text-zinc-500">Добивалка:</span> <span class="text-red-400">❌ НЕ ИСПОЛЬЗУЕТСЯ</span></li>`;
    }
    
    performanceList.innerHTML += `<li><span class="text-zinc-500">Тип укупорки:</span> <span class="text-amber-400 font-bold">${typeLabel}</span></li>`;
    performanceList.innerHTML += `<li><span class="text-zinc-500">Материал:</span> <span class="text-amber-400 font-bold">${materialLabels[params.material]}</span></li>`;
    performanceList.innerHTML += `<li><span class="text-zinc-500">Скорость конвейера:</span> <span class="text-green-400 font-bold">${params.V_conv_ms.toFixed(2)}</span> м/с (${params.V_conv_mmin.toFixed(1)} м/мин)</li>`;
    performanceList.innerHTML += `<li><span class="text-zinc-500">Полное время цикла:</span> <span class="text-green-400 font-bold">${params.T_total.toFixed(2)}</span> сек</li>`;
    performanceList.innerHTML += `<li><span class="text-zinc-500">Производительность:</span> <span class="text-green-400 font-bold">${params.productivity.toFixed(0)}</span> бут/час</li>`;
    
    stepsList.innerHTML += `<li class="text-amber-400">📋 ПОШАГОВАЯ ИНСТРУКЦИЯ ПЕРЕНАЛАДКИ:</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 1:</span> Проверить пневматику — давление 5.0 бар, фильтр осушен</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 2:</span> Проверить механику — ролики чистые, ремень натянут</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 3:</span> Ввести параметры в панель Delta (см. таблицу выше)</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 4:</span> Нажать <span class="text-amber-400">"ОТПРАВКА РЕЦЕПТА"</span> на панели</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 5:</span> Запустить тестовую партию <span class="text-amber-400">5-10 флаконов</span></li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 6:</span> Проверить качество закрутки (момент, внешний вид)</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 7:</span> При необходимости — <span class="text-amber-400">скорректировать</span> параметры</li>`;
    stepsList.innerHTML += `<li><span class="text-zinc-500">ШАГ 8:</span> Зафиксировать настройки — записать в протокол</li>`;
    
    resultBlock.classList.remove('hidden');
    resultBlock.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// 8. КОПИРОВАНИЕ ПАРАМЕТРОВ
// ============================================================

function copyCappingParams() {
    const paramsList = document.getElementById('capping-params-list');
    const text = paramsList.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Скопировано!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        alert('Не удалось скопировать. Скопируйте вручную.');
    });
}

// ============================================================
// 9. СБРОС ФОРМЫ УКУПОРА
// ============================================================

function resetCappingForm() {
    document.getElementById('cap-diameter').value = '30';
    document.getElementById('capping-bottle-height').value = '200';
    document.getElementById('cap-height').value = '15';
    document.getElementById('capping-conveyor-speed').value = '0.20';
    document.getElementById('cap-material').value = 'pet';
    document.getElementById('capping-result').classList.add('hidden');
    selectCappingType('cap');
}

// ============================================================
// 10. ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================

window.onload = function() {
    runUniversalCalculation();
    switchTab('filling');
    calculateLabelerFrequencies();
    updateKnifeInstructions();
    
    console.log('✅ Delta PLC Mobile Assistant загружен');
};
