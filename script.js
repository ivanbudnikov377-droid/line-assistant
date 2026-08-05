function runUniversalCalculation() {
    const line = document.getElementById('lineSelect').value;
    const rawHeight = document.getElementById('bottleHeightInput').value;
    const rawVol = document.getElementById('volumeInput').value;
    const rawVisc = document.getElementById('viscosityInput').value;

    // Перевод в числа строго на старте функции
    const bottleHeight = rawHeight ? parseFloat(rawHeight) : 245;
    const vol = rawVol ? parseFloat(rawVol) : 600;
    const visc = rawVisc ? parseFloat(rawVisc) : 0;
    
    if (bottleHeight <= 0 || vol <= 0 || visc < 0) return;

    // 1. Определение номера линии
    let lineNum = "1.1";
    if (line === "LINE_1_2") lineNum = "1.2";
    if (line === "LINE_1_3") lineNum = "1.3";
    if (line === "LINE_1_4") lineNum = "1.4";
    if (line === "LINE_1_5") lineNum = "1.5";
    if (line === "LINE_1_6") lineNum = "1.6";

    // 2. Учет ФИЗИЧЕСКОГО СЕЧЕНИЯ СОПЕЛ
    const isWideNozzle = (line === "LINE_1_4" || line === "LINE_1_6");
    const nozzleAreaFactor = isWideNozzle ? 1.0 : 1.89; 

    // 3. Базовые константы механики ПЛК (Физический ноль и зазоры оборудования)
    const bp = 40; 
    let tp = Math.round(bottleHeight - 10);   
    let wp = Math.round(bottleHeight + 100);    

    // 4. Нормализация коэффициента вязкости по шкале от 0 до 8000 ед.
    const vF = Math.min(visc / 8000, 1.0);
    const currentTransitionPercent = 0.30 - (0.15 * vF); 

    // 5. Математический расчет скоростей насоса
    let speed1 = 40 + 5 * vF;
    let speed2 = 70 + 5 * vF;
    let speed3 = 40 + 5 * vF;

    // Специфическая корректировка для мелкого кластера линий на ультра-вязком геле (свыше 3000 ед)
    if (!isWideNozzle && visc > 3000) {
        speed1 = 20 + 25 * vF; speed2 = 45 + 25 * vF; speed3 = 20 + 25 * vF;
    }

    // Дополнительное удушение 1 и 3 скоростей для очень жидких сред (вязкость < 800 ед.)
    if (visc < 800) {
        const liquidDamping = 0.85 + (0.15 * (visc / 800));
        speed1 = speed1 * liquidDamping; speed3 = speed3 * liquidDamping;
    }

    // Если это Азелит или малый объем жидкого продукта (до 1л), применяем уставки 25/50/25 и фазы мастера
    let k_t2 = 0.20, k_t3 = 0.85;
    let isSmallLiquidFormat = (vol <= 1000 && visc < 500 && !isWideNozzle);

    if (isSmallLiquidFormat) {
        speed1 = 25.00; speed2 = 50.00; speed3 = 25.00;
        k_t2 = 0.15; k_t3 = 0.95; 
    } else if (vol <= 1000) {
        speed2 = speed2 * 0.90;
        speed1 = speed1 * 0.92; speed2 = speed2 * 0.92; speed3 = speed3 * 0.92;
    }

    // Ограничение верхнего предела частотников насоса ПЛК (макс 100.00%)
    speed1 = Math.min(speed1, 100.00); speed2 = Math.min(speed2, 100.00); speed3 = Math.min(speed3, 100.00);

    // 6. МАТЕМАТИЧЕСКИЙ РАСЧЕТ ВЕСОВОГО КОНТРОЛЯ И ФАЗ ПОРШНЯ
    const baseDensity = (vol > 1500) ? 0.98 : (isSmallLiquidFormat ? 0.895 : 0.94);
    const densityFactor = baseDensity - (0.04 * vF);
    const tw = Math.round(vol * densityFactor);

    t2 = Math.round(tw * k_t2); 
    t3 = Math.round(tw * k_t3); 

    // 7. ЧИСТЫЙ ГИДРАВЛИЧЕСКИЙ РАСЧЕТ СКОРОСТИ ТРАВЕРСЫ (ls1, ls2, ls3)
    const baseMultiplier = (vol > 1500) ? 51.5 : 43.5;
    const kinematicsFactor = (speed2 / bottleHeight) * baseMultiplier * nozzleAreaFactor; 
    
    let baseLiftSpeed = Math.round(kinematicsFactor * (1.0 + 0.35 * vF));
    baseLiftSpeed = Math.max(baseLiftSpeed, 10); 

    // Полное жесткое принуждение операторского скоростного эталона для малой жидкой тары
    if (isSmallLiquidFormat) {
        ls1 = 70; 
        ls2 = 75; 
        ls3 = 65;
        wp = 297; 
        tp = 215; 
    } else {
        ls2 = baseLiftSpeed;                                 
        ls1 = Math.max(Math.round(ls2 * 0.9), 10); 
        ls3 = Math.max(Math.round(ls2 * 0.85), 10); 
    }

    ls1 = Math.min(ls1, 100); ls2 = Math.min(ls2, 100); ls3 = Math.min(ls3, 100);

    // 8. РАСЧЕТ ДАТЧИКОВ ПОЗИЦИОНИРОВАНИЯ СОПЕЛ
    np1 = bp;
    if (isSmallLiquidFormat) {
        np2 = tp; np3 = tp; 
    } else {
        np2 = Math.round(bp + (tp * 0.20)); 
        np3 = Math.round(bp + (tp * 0.85)); 
        if (np3 >= tp) { np3 = Math.round(tp - 5); }
    }

    // 9. ИСПРАВЛЕНО: МАТЕМАТИЧЕСКИЙ РАСЧЕТ ЗАДЕРЖКИ ПОГРУЖЕНИЯ НА ДНЕ (delay)
    let delay = 0.0;
    if (isSmallLiquidFormat) {
        // Урезано с 2.0 до безопасных 1.2 сек под механический предел bp = 40 мм
        delay = 1.2; 
    } else {
        let calculatedDelay = (vol / 5000) * (80 / speed1) * (1.0 - vF);
        delay = parseFloat(Math.max(calculatedDelay, 0.0).toFixed(1));
    }

    // Тайминги шиберов и конвейера
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

    // Вывод рассчитанных параметров в ячейки экрана Delta
    const fields = {
        'val_lift_speed_3': ls3, 'val_nozzle_pos_3': np3, 'val_lift_speed_2': ls2, 'val_nozzle_pos_2': np2,
        'val_lift_speed_1': ls1, 'val_nozzle_pos_1': np1, 'val_pump_speed_3': speed3.toFixed(2),
        'val_trans_volume_3': t3, 'val_pump_speed_2': speed2.toFixed(2), 'val_trans_volume_2': t2,
        'val_pump_speed_1': speed1.toFixed(2), 'val_wait_point': wp, 'val_top_pour': tp, 'val_bottom_pos': bp,
        'val_total_weight': tw, 'val_shiber_close_in': sh_in_c.toFixed(1), 'val_shiber_open_in': sh_in_o.toFixed(1),
        'val_shiber_close_out': sh_out_c.toFixed(1), 'val_traverse_down_speed': tr_down,
        'val_conveyor_main_speed': conv_m.toFixed(2), 'val_conveyor_low_speed': conv_l.toFixed(2),
        'val_line_num': lineNum, 'val_product_label': prodLabel, 'sub_nozzle_lift_delay': delay.toFixed(1) + " сек"
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

window.onload = function() { runUniversalCalculation(); };
