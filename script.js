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

    if (isSmallLiquidFormat) {
        speed1 = 25.00;
        speed2 = 48.00;
        speed3 = 28.00;
        k_t2 = 0.10;
        k_t3 = 0.73;
    } else if (vol <= 1500) {
        speed2 = speed2 * 0.90;
        speed1 = speed1 * 0.92;
        speed2 = speed2 * 0.92;
        speed3 = speed3 * 0.92;
    }

    speed1 = Math.min(speed1, 100.00);
    speed2 = Math.min(speed2, 100.00);
    speed3 = Math.min(speed3, 100.00);

    const baseDensity = (vol > 1500) ? 0.98 : (isSmallLiquidFormat ? 0.96 : 0.94);
    const densityFactor = baseDensity - (0.04 * vF);
    const tw = Math.round(vol * densityFactor);

    let t2 = Math.round(tw * k_t2);
    let t3 = Math.round(tw * k_t3);

    const baseMultiplier = (vol > 1500) ? 51.5 : 43.5;
    const kinematicsFactor = (speed2 / bottleHeight) * baseMultiplier * nozzleAreaFactor;
    
    let baseLiftSpeed = Math.round(kinematicsFactor * (1.0 + 0.35 * vF));
    baseLiftSpeed = Math.max(baseLiftSpeed, 10);

    let ls1, ls2, ls3;
    let bp, tp, wp;
    let np1, np2, np3;

    if (isSmallLiquidFormat) {
        ls1 = 70;
        ls2 = 75;
        ls3 = 65;
        bp = 35;
        tp = Math.round(bottleHeight - 50);
        wp = Math.round(bottleHeight + 74);
        np1 = bp;
        np2 = Math.round(bp + (tp - bp) * 0.50);
        np3 = Math.round(bp + (tp - bp) * 0.90);
    } else {
        ls2 = baseLiftSpeed;
        ls1 = Math.max(Math.round(ls2 * 0.9), 10);
        ls3 = Math.max(Math.round(ls2 * 0.85), 10);
        bp = 40;
        tp = Math.round(bottleHeight - 10);
        wp = Math.round(bottleHeight + 100);
        np1 = bp;
        np2 = Math.round(bp + (tp - bp) * 0.35);
        np3 = Math.round(bp + (tp - bp) * 0.85);
        if (np3 >= tp) {
            np3 = Math.round(tp - 5);
        }
    }

    ls1 = Math.min(ls1, 100);
    ls2 = Math.min(ls2, 100);
    ls3 = Math.min(ls3, 100);

    let delay = 0.0;
    if (isSmallLiquidFormat) {
        delay = 1.0;
    } else {
        let calculatedDelay = (vol / 5000) * (80 / speed1) * (1.0 - vF);
        delay = parseFloat(Math.max(calculatedDelay, 0.0).toFixed(1));
    }

    const sh_in_c = (vol > 1500) ? 0.5 : 0.0;
    const sh_in_o = (vol > 1500) ? 0.0 : 0.5;
    const sh_out_c = (vol > 1500) ? 0.0 : 0.2;
    const conv_m = (vol > 1500) ? 70.00 : 60.00;
    const conv_l = (vol > 1500) ? 15.00 : 0.00;
    const tr_down = 100;
    const stopConv = (vol <= 1000);

    let prodLabel = "DETAIL 500";
    if (vol > 1500) {
        prodLabel = (visc <= 200) ? "ASPERIN 4K" : "5L GEL";
        if (visc > 100 && visc < 1000) prodLabel = "EVA 5L";
    } else {
        prodLabel = isSmallLiquidFormat ? "AZELIT0,6" : "DETAIL 500";
    }

    const fields = {
        'val_lift_speed_3': ls3,
        'val_nozzle_pos_3': np3,
        'val_lift_speed_2': ls2,
        'val_nozzle_pos_2': np2,
        'val_lift_speed_1': ls1,
        'val_nozzle_pos_1': np1,
        'val_pump_speed_3': speed3.toFixed(2),
        'val_trans_volume_3': t3,
        'val_pump_speed_2': speed2.toFixed(2),
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
// 3. УПРАВЛЕНИЕ ПОЛЯМИ ВВОДА (ЭТИКЕТКА)
// ============================================================

function toggleConeInput() {
    const bottleType = document.getElementById('bottle-type').value;
    const coneBlock = document.getElementById('cone-angle-block');
    const bellyParams = document.getElementById('belly-params');
    const roundParams = document.getElementById('round-bottle-params');
    
    if (bottleType === 'cone') {
        coneBlock.classList.remove('hidden');
    } else {
        coneBlock.classList.add('hidden');
    }
    
    if (bottleType === 'belly') {
        bellyParams.classList.remove('hidden');
    } else {
        bellyParams.classList.add('hidden');
    }
    
    if (bottleType === 'round') {
        roundParams.classList.remove('hidden');
    } else {
        roundParams.classList.add('hidden');
    }
}

// ============================================================
// 4. УПРАВЛЕНИЕ ТИПОМ УКУПОРКИ
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
// 5. МАТЕМАТИЧЕСКАЯ МОДЕЛЬ УКУПОРА KV 30
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
// 6. ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА УКУПОРА
// ============================================================

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
// 7. КОПИРОВАНИЕ ПАРАМЕТРОВ
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
// 8. СБРОС ФОРМЫ УКУПОРА
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
// 9. РАСЧЕТ УГЛА НОЖА (ИНКЛИНОМЕТР)
// ============================================================

function calculateKnifeAngle(bottleType, wallAngle, bellyCurvature, bottleHeight, labelHeight) {
    let knifeAngle = 0;
    let tiltAngle = 0;
    let formula = '';
    let description = '';
    let measurementMethod = '';
    let inclinometerSteps = [];

    switch(bottleType) {
        case 'flat':
            knifeAngle = 0;
            tiltAngle = 0;
            formula = 'α = 0° (параллельно конвейеру)';
            description = 'Нож устанавливается параллельно плоскости конвейера';
            measurementMethod = 'Инклинометр на ноже должен показывать 0°';
            inclinometerSteps = [
                '📐 ШАГ 1: Откалибруйте инклинометр на конвейере (экраном по движению) → ZERO',
                '📐 ШАГ 2: Установите инклинометр на плоскость ножа',
                '📐 ШАГ 3: Поворачивайте нож до показания 0.0°',
                '✅ Результат: Нож параллелен конвейеру'
            ];
            break;

        case 'cone':
            knifeAngle = wallAngle;
            tiltAngle = wallAngle;
            formula = `α = β = ${wallAngle}° (угол стенки флакона)`;
            description = `Нож наклоняется параллельно стенке конуса (${wallAngle}°)`;
            measurementMethod = `Инклинометр на ноже должен показывать ${wallAngle}°`;
            inclinometerSteps = [
                '📐 ШАГ 1: Откалибруйте инклинометр на конвейере (экраном по движению) → ZERO',
                '📐 ШАГ 2: Приложите инклинометр к стенке флакона → зафиксируйте угол β',
                `📐 ШАГ 3: Установите инклинометр на плоскость ножа и выставьте ${wallAngle}°`,
                `✅ Результат: Нож параллелен стенке флакона (${wallAngle}°)`
            ];
            break;

        case 'belly':
            const curvatureRadius = 50 + (1 - bellyCurvature) * 100;
            const halfLabelHeight = labelHeight / 2;
            const tanAngle = curvatureRadius / halfLabelHeight;
            knifeAngle = Math.atan(tanAngle) * (180 / Math.PI);
            knifeAngle = Math.min(knifeAngle, 30);
            const bellyFactor = 0.5 + (bellyCurvature * 0.5);
            tiltAngle = knifeAngle * bellyFactor;
            formula = `α = arctan(R_кривизны / (H_этикетки/2)) = ${knifeAngle.toFixed(1)}°`;
            description = `Нож наклоняется для贴合 пузатой поверхности (${knifeAngle.toFixed(1)}°)`;
            measurementMethod = `Инклинометр на ноже должен показывать ${knifeAngle.toFixed(1)}°`;
            inclinometerSteps = [
                '📐 ШАГ 1: Откалибруйте инклинометр на конвейере (экраном по движению) → ZERO',
                '📐 ШАГ 2: Замерьте кривизну пуза (визуально или шаблоном)',
                `📐 ШАГ 3: Установите инклинометр на плоскость ножа и выставьте ${knifeAngle.toFixed(1)}°`,
                `✅ Результат: Нож贴合 пузатой поверхности (${knifeAngle.toFixed(1)}°)`
            ];
            break;

        case 'round':
            knifeAngle = 0;
            tiltAngle = 0;
            formula = 'α = 0° (перпендикулярно поверхности)';
            description = 'Нож перпендикулярен поверхности круглого флакона';
            measurementMethod = 'Инклинометр на ноже должен показывать 0°';
            inclinometerSteps = [
                '📐 ШАГ 1: Откалибруйте инклинометр на конвейере (экраном по движению) → ZERO',
                '📐 ШАГ 2: Установите инклинометр на плоскость ножа',
                '📐 ШАГ 3: Поворачивайте нож до показания 0.0°',
                '✅ Результат: Нож перпендикулярен поверхности флакона'
            ];
            break;

        default:
            knifeAngle = 0;
            formula = 'α = 0° (стандартный)';
            description = 'Стандартная установка';
            measurementMethod = 'Проверить инклинометром';
            inclinometerSteps = [
                '📐 ШАГ 1: Откалибруйте инклинометр на конвейере → ZERO',
                '📐 ШАГ 2: Установите на нож и выставьте 0°',
                '✅ Результат: Нож настроен'
            ];
    }

    return {
        knifeAngle: knifeAngle,
        knifeAngleDisplay: knifeAngle.toFixed(1),
        tiltAngle: tiltAngle,
        tiltAngleDisplay: tiltAngle.toFixed(1),
        formula: formula,
        description: description,
        measurementMethod: measurementMethod,
        inclinometerSteps: inclinometerSteps,
        recommendation: generateKnifeRecommendation(bottleType, wallAngle, knifeAngle)
    };
}

function generateKnifeRecommendation(bottleType, wallAngle, knifeAngle) {
    switch(bottleType) {
        case 'flat': return 'Установить нож параллельно конвейеру (инклинометр 0°).';
        case 'cone': return `Наклонить нож на ${wallAngle}° параллельно стенке флакона. Контроль инклинометром.`;
        case 'belly': return `Наклонить нож на ${knifeAngle.toFixed(1)}° для贴合 пузатой поверхности. Использовать инклинометр.`;
        case 'round': return 'Установить нож перпендикулярно поверхности. Инклинометр 0°.';
        default: return 'Стандартная установка. Проверить инклинометром.';
    }
}

// ============================================================
// 10. МАТЕМАТИЧЕСКАЯ МОДЕЛЬ ЭТИКЕРОВЩИКА
// ============================================================

function calculateLabelerParams(conveyorSpeedMs, bottleType, labelMaterial, params) {
    const K_mat = (labelMaterial === 'paper') ? 1.04 : 1.0;
    const conveyorSpeedMmin = conveyorSpeedMs * 60;
    const V_disp = conveyorSpeedMmin * K_mat;
    
    const pressureMap = {
        'flat': 1.0,
        'cone': 1.2,
        'belly': 0.8,
        'round': null
    };
    
    let result = {
        conveyorSpeedMs: conveyorSpeedMs,
        conveyorSpeedMmin: conveyorSpeedMmin,
        conveyorSpeedMs_display: conveyorSpeedMs.toFixed(2) + ' м/с',
        conveyorSpeedMmin_display: conveyorSpeedMmin.toFixed(1) + ' м/мин',
        material: labelMaterial,
        K_mat: K_mat,
        bottleType: bottleType,
        V_disp: V_disp,
        V_disp_display: V_disp.toFixed(1) + ' м/мин',
        usedEquipment: '',
        V_belt: null,
        V_belt_display: null,
        V_roller: null,
        V_roller_display: null,
        omega_drive: null,
        omega_drive_display: null,
        omega_bottle: null,
        omega_bottle_display: null,
        P: null,
        P_display: null,
        speedRatio: null,
        D_bottle: null,
        D_drive: null,
        labelLength: null,
        bottleRevolutions: null,
        bottleRevolutions_display: null,
        cycleTime: null,
        cycleTime_display: null,
        slipFactor: null,
        recommendation: '',
        formula: ''
    };
    
    if (bottleType === 'round') {
        const D_bottle = params.bottleDiameter || 75;
        const D_drive = params.driveRollerDiameter || 50;
        const labelLength = params.labelLength || 180;
        
        const V_roller = conveyorSpeedMmin * K_mat * (D_bottle / D_drive);
        const omega_drive = (V_roller * 1000) / (Math.PI * D_drive);
        const omega_bottle = (V_disp * 60) / (Math.PI * D_bottle);
        const bottleRevolutions = labelLength / (Math.PI * D_bottle);
        const labelLength_m = labelLength / 1000;
        const cycleTime = labelLength_m / (V_disp / 60);
        const slipFactor = (labelMaterial === 'paper') ? 1.0 : 0.98;
        const K_pressure_roller = (labelMaterial === 'paper') ? 1.2 : 0.8;
        const P = (V_roller / 10) * K_pressure_roller;
        
        result.usedEquipment = 'обкаточный ремень';
        result.V_roller = V_roller;
        result.V_roller_display = V_roller.toFixed(1) + ' м/мин';
        result.omega_drive = omega_drive;
        result.omega_drive_display = omega_drive.toFixed(0) + ' об/мин';
        result.omega_bottle = omega_bottle;
        result.omega_bottle_display = omega_bottle.toFixed(1) + ' об/мин';
        result.P = P;
        result.P_display = P.toFixed(1);
        result.speedRatio = (D_bottle / D_drive).toFixed(3);
        result.D_bottle = D_bottle;
        result.D_drive = D_drive;
        result.labelLength = labelLength;
        result.bottleRevolutions = bottleRevolutions;
        result.bottleRevolutions_display = bottleRevolutions.toFixed(2) + ' об.';
        result.cycleTime = cycleTime;
        result.cycleTime_display = cycleTime.toFixed(2) + ' сек';
        result.slipFactor = slipFactor;
        result.formula = `V_ремня = ${conveyorSpeedMmin.toFixed(1)} × ${K_mat.toFixed(2)} × (${D_bottle}/${D_drive}) = ${V_roller.toFixed(1)} м/мин`;
        result.recommendation = `Обкаточный ремень: скорость ${V_roller.toFixed(1)} м/мин. Флакон вращается со скоростью ${omega_bottle.toFixed(1)} об/мин. За цикл (${cycleTime.toFixed(2)} сек) флакон делает ${bottleRevolutions.toFixed(2)} оборота.`;
        
    } else {
        const V_belt = conveyorSpeedMmin * K_mat;
        const K_pressure = pressureMap[bottleType] || 1.0;
        const P = (conveyorSpeedMmin / 10) * K_pressure;
        
        result.usedEquipment = 'прижимной ремень';
        result.V_belt = V_belt;
        result.V_belt_display = V_belt.toFixed(1) + ' м/мин';
        result.V_roller = V_belt;
        result.V_roller_display = V_belt.toFixed(1) + ' м/мин (прижимной ремень)';
        result.P = P;
        result.P_display = P.toFixed(1);
        result.speedRatio = '1:1';
        result.formula = `V_ремня = ${conveyorSpeedMmin.toFixed(1)} × ${K_mat.toFixed(2)} = ${V_belt.toFixed(1)} м/мин`;
        
        let typeNote = '';
        if (bottleType === 'flat') typeNote = 'плоский';
        else if (bottleType === 'cone') typeNote = 'конусный';
        else if (bottleType === 'belly') typeNote = 'пузатый';
        
        result.recommendation = `Прижимной ремень для ${typeNote} флакона. Скорость ремня = ${V_belt.toFixed(1)} м/мин.`;
    }
    
    return result;
}

// ============================================================
// 11. ГЕНЕРАЦИЯ ТЕХКАРТЫ (ЭТИКЕТКА) - ОБНОВЛЕННАЯ
// ============================================================

function generateTechCard() {
    const bottleType = document.getElementById('bottle-type').value;
    const labelMaterial = document.getElementById('label-material').value;
    const conveyorSpeed = parseFloat(document.getElementById('conveyor-speed').value) || 0;
    const wallAngle = parseFloat(document.getElementById('bottle-wall-angle').value) || 0;
    const bottleHeight = parseFloat(document.getElementById('bottle-height').value) || 200;
    const labelHeight = parseFloat(document.getElementById('label-height').value) || 100;
    const bellyCurvature = parseFloat(document.getElementById('belly-curvature').value) || 0.5;

    const mechList = document.getElementById('mech-instructions');
    const hermaList = document.getElementById('herma-instructions');
    const resultBlock = document.getElementById('tech-card-result');

    mechList.innerHTML = '';
    hermaList.innerHTML = '';

    // === РАСЧЕТ УГЛА НОЖА (через инклинометр) ===
    const knifeParams = calculateKnifeAngle(bottleType, wallAngle, bellyCurvature, bottleHeight, labelHeight);

    // === Сбор параметров для модели этикеровщика ===
    let extraParams = {};
    if (bottleType === 'round') {
        extraParams.bottleDiameter = parseFloat(document.getElementById('bottle-diameter').value) || 75;
        extraParams.driveRollerDiameter = parseFloat(document.getElementById('roller-diameter').value) || 50;
        extraParams.labelLength = parseFloat(document.getElementById('label-length').value) || 180;
    }
    
    const labelerParams = calculateLabelerParams(conveyorSpeed, bottleType, labelMaterial, extraParams);

    // === МЕХАНИЧЕСКАЯ НАЛАДКА Arsanmak ===
    
    // ---- БЛОК НАСТРОЙКИ УГЛА НОЖА (ИНКЛИНОМЕТР) ----
    mechList.innerHTML += `<li class="text-amber-400 font-bold">📐 НАСТРОЙКА УГЛА НОЖА (ИНКЛИНОМЕТР):</li>`;
    mechList.innerHTML += `<li><b>Тип флакона:</b> ${getBottleTypeName(bottleType)}</li>`;
    mechList.innerHTML += `<li><b>Угол стенки флакона (инклинометр):</b> <span class="text-amber-400 font-bold">${wallAngle.toFixed(1)}°</span></li>`;
    mechList.innerHTML += `<li><b>Расчетный угол ножа:</b> <span class="text-green-400 font-bold">${knifeParams.knifeAngleDisplay}°</span></li>`;
    mechList.innerHTML += `<li><b>Формула:</b> ${knifeParams.formula}</li>`;
    mechList.innerHTML += `<li><b>Метод измерения:</b> ${knifeParams.measurementMethod}</li>`;
    mechList.innerHTML += `<li><b>Рекомендация:</b> ${knifeParams.recommendation}</li>`;
    
    // ---- ПОШАГОВАЯ ИНСТРУКЦИЯ ПО ИНКЛИНОМЕТРУ ----
    mechList.innerHTML += `<li class="text-amber-400 font-bold mt-2">📋 ПОШАГОВАЯ ИНСТРУКЦИЯ (ИНКЛИНОМЕТР):</li>`;
    knifeParams.inclinometerSteps.forEach(step => {
        mechList.innerHTML += `<li class="text-zinc-300">${step}</li>`;
    });
    
    // ---- НАСТРОЙКА ОСНАСТКИ ----
    mechList.innerHTML += `<li class="text-amber-400 font-bold mt-2">🔧 НАСТРОЙКА ОСНАСТКИ:</li>`;
    
    if (bottleType === 'round') {
        mechList.innerHTML += `<li><b>Тип оснастки:</b> ОБКАТОЧНЫЙ РЕМЕНЬ (широкий ремень)</li>`;
        mechList.innerHTML += `<li><b>Назначение:</b> Вращает флакон вокруг своей оси во время выдачи этикетки</li>`;
        mechList.innerHTML += `<li><b>Прижимной ремень:</b> ДЕМОНТИРОВАН</li>`;
        mechList.innerHTML += `<li><b>Диаметр флакона:</b> ${labelerParams.D_bottle} мм</li>`;
        mechList.innerHTML += `<li><b>Диаметр приводного ролика:</b> ${labelerParams.D_drive} мм</li>`;
        mechList.innerHTML += `<li><b>Длина этикетки:</b> ${labelerParams.labelLength} мм</li>`;
        mechList.innerHTML += `<li><b>Скорость обкаточного ремня:</b> <span class="text-green-400 font-bold">${labelerParams.V_roller_display}</span></li>`;
        mechList.innerHTML += `<li><b>Скорость выдачи этикетки:</b> <span class="text-green-400 font-bold">${labelerParams.V_disp_display}</span></li>`;
        mechList.innerHTML += `<li><b>Формула расчета:</b> ${labelerParams.formula}</li>`;
        mechList.innerHTML += `<li><b>Соотношение скоростей:</b> V_ремня / V_конв = ${labelerParams.speedRatio}</li>`;
        mechList.innerHTML += `<li><b>Частота вращения флакона:</b> ${labelerParams.omega_bottle_display}</li>`;
        mechList.innerHTML += `<li><b>Частота вращения привода:</b> ${labelerParams.omega_drive_display}</li>`;
        mechList.innerHTML += `<li><b>Обороты флакона за цикл:</b> ${labelerParams.bottleRevolutions_display}</li>`;
        mechList.innerHTML += `<li><b>Время цикла наклейки:</b> ${labelerParams.cycleTime_display}</li>`;
        mechList.innerHTML += `<li><b>Проверка:</b> Замерьте скорость ремня тахометром. Целевое значение: <span class="text-green-400 font-bold">${labelerParams.V_roller_display}</span></li>`;
        mechList.innerHTML += `<li><b>Визуальный контроль:</b> Флакон должен равномерно вращаться без проскальзывания</li>`;
    } else {
        mechList.innerHTML += `<li><b>Тип оснастки:</b> ПРИЖИМНОЙ РЕМЕНЬ</li>`;
        mechList.innerHTML += `<li><b>Скорость ремня:</b> <span class="text-green-400 font-bold">${labelerParams.V_roller_display}</span></li>`;
        mechList.innerHTML += `<li><b>Формула:</b> ${labelerParams.formula}</li>`;
        mechList.innerHTML += `<li><b>Рекомендация:</b> ${labelerParams.recommendation}</li>`;
        
        if (bottleType === 'flat') {
            mechList.innerHTML += `<li><b>Углы аппликаторов:</b> Сбросьте наклон на 0° (инклинометр)</li>`;
        } else if (bottleType === 'cone') {
            mechList.innerHTML += `<li><b>Углы аппликаторов:</b> Наклоните на ${wallAngle}° (инклинометр)</li>`;
            mechList.innerHTML += `<li><b>Наклон лопаток:</b> Параллельно конусу (${wallAngle}°)</li>`;
        } else if (bottleType === 'belly') {
            mechList.innerHTML += `<li><b>Позиционирование ножа:</b> Зазор не более 2 мм</li>`;
        }
    }

    // ---- НАСТРОЙКА HERMA ----
    hermaList.innerHTML += `<li><b>Тип датчика:</b> Самообучаемый щелевой датчик (контактный)</li>`;
    hermaList.innerHTML += `<li><b>ШАГ 1:</b> <span class="text-amber-400 font-bold">ЗАЖМИТЕ</span> кнопку обучения и <span class="text-amber-400 font-bold">УДЕРЖИВАЙТЕ</span> до <span class="text-green-400 font-bold">МОРГАНИЯ</span> индикатора</li>`;
    hermaList.innerHTML += `<li><b>ШАГ 2:</b> Нажмите <span class="text-amber-400 font-bold">"ВЫДАЧА ЭТИКЕТКИ"</span> и выдайте <span class="text-green-400 font-bold">3-4 этикетки</span></li>`;
    hermaList.innerHTML += `<li><b>ШАГ 3:</b> Датчик <span class="text-green-400 font-bold">САМООБУЧИЛСЯ</span> — индикатор горит постоянно</li>`;
    hermaList.innerHTML += `<li><b>Проверка:</b> Подайте 2-3 этикетки для контроля срабатывания</li>`;
    
    const materialName = (labelMaterial === 'pp') ? 'ПП' : 'Бумага';
    hermaList.innerHTML += `<li class="text-green-400"><b>Уставка Dispensing Speed:</b> <span class="underline font-bold">${labelerParams.V_disp_display}</span> (коэффициент материала: ${labelerParams.K_mat.toFixed(2)})</li>`;
    
    if (labelMaterial === 'pp') {
        hermaList.innerHTML += `<li><b>Для ПП:</b> Минимальное натяжение подложки. Вылет этикетки: 1.0-1.5 мм</li>`;
    } else {
        hermaList.innerHTML += `<li><b>Для бумаги:</b> Стандартное натяжение. Вылет этикетки: 2.5-3.0 мм</li>`;
    }
    
    hermaList.innerHTML += `<li><b>Обслуживание:</b> При пропусках — повторите самообучение</li>`;

    resultBlock.classList.remove('hidden');
    resultBlock.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// 12. ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ
// ============================================================

function getBottleTypeName(type) {
    const names = {
        'flat': 'Прямой плоский',
        'cone': 'Конусный',
        'belly': 'Пузатый сферический',
        'round': 'Круглый'
    };
    return names[type] || type;
}

// ============================================================
// 13. НАСТРОЙКА УГЛА НОЖА (ИНКЛИНОМЕТР) - ИНТЕРФЕЙС
// ============================================================

function updateBottleTypeDisplay() {
    const select = document.getElementById('bottle-type');
    const display = document.getElementById('display-bottle-type');
    if (select && display) {
        const types = {
            'flat': 'Прямой плоский',
            'cone': 'Конусный',
            'belly': 'Пузатый сферический',
            'round': 'Круглый'
        };
        display.textContent = types[select.value] || select.value;
    }
}

function calculateTargetAngle() {
    const bottleType = document.getElementById('bottle-type').value;
    const wallAngle = parseFloat(document.getElementById('bottle-wall-angle').value) || 0;
    const bottleHeight = parseFloat(document.getElementById('bottle-height').value) || 200;
    const labelHeight = parseFloat(document.getElementById('label-height').value) || 100;
    const bellyCurvature = parseFloat(document.getElementById('belly-curvature').value) || 0.5;
    
    let targetAngle = 0;
    
    switch(bottleType) {
        case 'flat':
            targetAngle = 0;
            break;
        case 'cone':
            targetAngle = wallAngle;
            break;
        case 'belly':
            const curvatureRadius = 50 + (1 - bellyCurvature) * 100;
            const halfLabelHeight = labelHeight / 2;
            const tanAngle = curvatureRadius / halfLabelHeight;
            let calculatedAngle = Math.atan(tanAngle) * (180 / Math.PI);
            targetAngle = Math.min(calculatedAngle, 30);
            break;
        case 'round':
            targetAngle = 0;
            break;
        default:
            targetAngle = 0;
    }
    
    const targetDisplay = document.getElementById('target-knife-angle');
    if (targetDisplay) {
        targetDisplay.textContent = targetAngle.toFixed(1) + '°';
    }
    
    return targetAngle;
}

function checkKnifeAngles() {
    updateBottleTypeDisplay();
    
    const targetAngle = calculateTargetAngle();
    const currentAngle = parseFloat(document.getElementById('current-knife-angle').value) || 0;
    const currentEdge = parseFloat(document.getElementById('current-edge-angle').value) || 0;
    
    const diff = targetAngle - currentAngle;
    const tolerance = 0.5;
    const hintText = document.getElementById('knife-adjustment-text');
    const hintBlock = document.getElementById('knife-adjustment-hint');
    
    if (Math.abs(diff) <= tolerance) {
        hintText.textContent = '✅ Угол настроен правильно!';
        hintText.className = 'text-green-400 font-bold text-sm block mt-1';
        hintBlock.className = 'bg-zinc-950 border border-green-700 rounded-lg p-2 text-center';
    } else if (diff > 0) {
        hintText.textContent = `⚠️ Поверните нож ВПРАВО на ${diff.toFixed(1)}° (увеличьте угол)`;
        hintText.className = 'text-amber-400 font-bold text-sm block mt-1';
        hintBlock.className = 'bg-zinc-950 border border-amber-700 rounded-lg p-2 text-center';
    } else {
        hintText.textContent = `⚠️ Поверните нож ВЛЕВО на ${Math.abs(diff).toFixed(1)}° (уменьшите угол)`;
        hintText.className = 'text-amber-400 font-bold text-sm block mt-1';
        hintBlock.className = 'bg-zinc-950 border border-amber-700 rounded-lg p-2 text-center';
    }
    
    const edgeHintText = document.getElementById('edge-adjustment-text');
    const edgeHintBlock = document.getElementById('edge-adjustment-hint');
    
    if (Math.abs(currentEdge) <= tolerance) {
        edgeHintText.textContent = '✅ Нож параллелен движению!';
        edgeHintText.className = 'text-green-400 font-bold text-sm block mt-1';
        edgeHintBlock.className = 'bg-zinc-950 border border-green-700 rounded-lg p-2 text-center';
    } else if (currentEdge > 0) {
        edgeHintText.textContent = `⚠️ Поверните нож ВПРАВО на ${currentEdge.toFixed(1)}° (относительно движения)`;
        edgeHintText.className = 'text-amber-400 font-bold text-sm block mt-1';
        edgeHintBlock.className = 'bg-zinc-950 border border-amber-700 rounded-lg p-2 text-center';
    } else {
        edgeHintText.textContent = `⚠️ Поверните нож ВЛЕВО на ${Math.abs(currentEdge).toFixed(1)}° (относительно движения)`;
        edgeHintText.className = 'text-amber-400 font-bold text-sm block mt-1';
        edgeHintBlock.className = 'bg-zinc-950 border border-amber-700 rounded-lg p-2 text-center';
    }
    
    document.getElementById('target-knife-angle').textContent = targetAngle.toFixed(1) + '°';
}

function resetInclinometerFields() {
    document.getElementById('bottle-wall-angle').value = '0.0';
    document.getElementById('current-knife-angle').value = '0.0';
    document.getElementById('current-edge-angle').value = '0.0';
    
    const hintText = document.getElementById('knife-adjustment-text');
    const hintBlock = document.getElementById('knife-adjustment-hint');
    hintText.textContent = '✅ Угол настроен правильно!';
    hintText.className = 'text-green-400 font-bold text-sm block mt-1';
    hintBlock.className = 'bg-zinc-950 border border-green-700 rounded-lg p-2 text-center';
    
    const edgeHintText = document.getElementById('edge-adjustment-text');
    const edgeHintBlock = document.getElementById('edge-adjustment-hint');
    edgeHintText.textContent = '✅ Нож параллелен движению!';
    edgeHintText.className = 'text-green-400 font-bold text-sm block mt-1';
    edgeHintBlock.className = 'bg-zinc-950 border border-green-700 rounded-lg p-2 text-center';
    
    calculateTargetAngle();
    updateBottleTypeDisplay();
}

function setupInclinometerListeners() {
    const fields = ['bottle-wall-angle', 'current-knife-angle', 'current-edge-angle', 'bottle-type', 'bottle-height', 'label-height', 'belly-curvature'];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', function() {
                if (['bottle-wall-angle', 'current-knife-angle', 'current-edge-angle'].includes(id)) {
                    checkKnifeAngles();
                } else {
                    calculateTargetAngle();
                    updateBottleTypeDisplay();
                }
            });
            el.addEventListener('change', function() {
                if (['bottle-wall-angle', 'current-knife-angle', 'current-edge-angle'].includes(id)) {
                    checkKnifeAngles();
                }
            });
        }
    });
}

// ============================================================
// 14. ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================

window.onload = function() {
    runUniversalCalculation();
    switchTab('filling');
    toggleConeInput();
    
    updateBottleTypeDisplay();
    calculateTargetAngle();
    setupInclinometerListeners();
    
    console.log('✅ Delta PLC Mobile Assistant загружен');
};
