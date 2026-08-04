function runUniversalCalculation() {
    const line = document.getElementById('lineSelect').value;
    const rawHeight = document.getElementById('bottleHeightInput').value;
    const rawVol = document.getElementById('volumeInput').value;
    const rawVisc = document.getElementById('viscosityInput').value;

    // Страховочные значения при первой загрузке страницы, чтобы не выбивало ошибку NaN
    const bottleHeight = rawHeight ? parseFloat(rawHeight) : 210;
    const vol = rawVol ? parseFloat(rawVol) : 500;
    const visc = rawVisc ? parseFloat(rawVisc) : 0;
    
    if (bottleHeight <= 0 || vol <= 0 || visc < 0) return;

    // Инженерные уставки экрана Delta по умолчанию
    let speed1 = 25, speed2 = 50, speed3 = 35, t2 = 60, t3 = 500, wp = 320, tp = 210, bp = 40, tw = 470;
    let sh_in_c = 0.0, sh_in_o = 0.5, sh_out_c = 0.0, tr_down = 100, conv_m = 60, conv_l = 2.6;
    let ls1 = 30, ls2 = 40, ls3 = 40, np1 = 40, np2 = 110, np3 = 165;
    let delay = 0.0, stopConv = false, lineNum = "1.4", prodLabel = "MILANA750";

    const vF = Math.min(visc / 8000, 1.0); 
    const currentTransitionPercent = 0.30 - (0.15 * vF); 

    // Уставка ВЕРХНЕГО НАЛИВА на экране ПЛК всегда на 10 мм ниже физической высоты по рулетке
    tp = Math.round(bottleHeight - 10); 

    // =========================================================================
    // КЛАСТЕР МЕЛКИХ ЛИНИЙ (1.1, 1.3, 1.5)
    // =========================================================================
    if (line === "LINE_1_1" || line === "LINE_1_3" || line === "LINE_1_5") {
        if (line === "LINE_1_1") lineNum = "1.1";
        if (line === "LINE_1_3") lineNum = "1.3";
        if (line === "LINE_1_5") lineNum = "1.5";
        
        bp = 40; wp = Math.round(bottleHeight + 100);

        if (vF <= 0.3) { 
            const fA = vF / 0.3;
            speed1 = 35 - 23 * fA;  speed2 = 65 - 35 * fA;  speed3 = 40 - 25 * fA;
            ls1 = Math.round(16 + 14 * (1.0 - fA)); ls2 = Math.round(16 + 24 * (1.0 - fA)); ls3 = Math.round(16 + 24 * (1.0 - fA)); 
            delay = parseFloat((1.3 - 0.5 * fA).toFixed(1));
            stopConv = true; conv_l = 0.00;
            prodLabel = "DETAIL 500";
        } else {
            const fB = (vF - 0.3) / 0.7;
            speed1 = 12 + 48 * fB;  speed2 = 30 + 45 * fB;  speed3 = 15 + 35 * fB;
            ls1 = Math.round(30 + 40 * fB); ls2 = Math.round(40 + 30 * fB); ls3 = Math.round(40 + 25 * fB); 
            delay = parseFloat((0.8 * (1.0 - fB)).toFixed(1));
            stopConv = fB < 0.5; conv_l = stopConv ? 0.00 : parseFloat((2.60 * fB).toFixed(2));
            prodLabel = "MILANA750";
        }

        tw = Math.round(vol * (0.94 - 0.04 * vF)); 
        sh_in_o = 0.5; conv_m = 60.00;
    } 
    // =========================================================================
    // КЛАСТЕР СРЕДНИХ УНИВЕРСАЛЬНЫХ ЛИНИЙ (1.2, 1.6)
    // =========================================================================
    else if (line === "LINE_1_2" || line === "LINE_1_6") {
        if (line === "LINE_1_2") lineNum = "1.2";
        if (line === "LINE_1_6") lineNum = "1.6";
        
        speed1 = 45 + 5 * vF; speed2 = 65 + 10 * vF; speed3 = 22 + 3 * vF;
        bp = 40; wp = Math.round(bottleHeight + 90); 
        tw = Math.round(vol * (0.94 - 0.04 * vF)); 
        
        ls1 = Math.round(25 - 5 * vF); ls2 = 35; ls3 = Math.round(30 - 8 * vF);
        np1 = bp; np2 = Math.round(bp + (tp - bp) * 0.30); np3 = Math.round(bp + (tp - bp) * 0.80); 
        
        sh_in_o = parseFloat((0.5 * vF).toFixed(1));
        conv_m = 80.00; conv_l = Math.round(15 * (1.0 - vF)); stopConv = true;
        delay = parseFloat((0.5 * (1.0 - vF)).toFixed(1));
        prodLabel = visc === 0 ? "1L LIQ" : "1L GEL";
    } 
    // =========================================================================
    // КРУПНАЯ ЛИНИЯ 1.4 (Паспортный режим для канистр 5л)
    // =========================================================================
    else if (line === "LINE_1_4") {
        lineNum = "1.4";
        speed1 = 25 + 35 * vF; speed2 = 40 + 30 * vF; speed3 = 20 + 25 * vF;
        bp = 50; wp = Math.round(bottleHeight + 130); 
        tw = Math.round(vol * (0.94 - 0.04 * vF)); 

        ls1 = Math.round(20 + 5 * vF); ls2 = Math.round(25 + 10 * vF); ls3 = 20;
        np1 = bp; np2 = Math.round(bp + (tp - bp) * 0.30); np3 = Math.round(bp + (tp - bp) * 0.80); 
        
        sh_in_c = parseFloat((1.0 * (1.0 - vF)).toFixed(1)); sh_in_o = parseFloat((0.7 + 0.3 * vF).toFixed(1));
        conv_m = parseFloat((55 + 25 * vF).toFixed(2)); conv_l = conv_m; stopConv = false;
        delay = parseFloat(((4.5 * (vol / 5000)) * (1.0 - vF)).toFixed(1));
        if (delay < 0) delay = 0.0;
        prodLabel = Math.round(visc) === 0 ? "5L LAUN" : "5L GEL";
    }

    // ВНЕДРЕНО: Поправка на разгон крупных объемов > 1.5л (1500 мл) при вязкости > 100 ед.
    if (vol > 1500 && visc > 100) {
        // Рассчитываем пропорциональный шаг разгона. Вторая скорость стремится жестко к 70.00%
        const targetSpeed2 = 70.00;
        const boosterRatio = targetSpeed2 / speed2; // Коэффициент пропорции разгона

        speed2 = targetSpeed2;
        speed1 = speed1 * boosterRatio;
        speed3 = speed3 * boosterRatio;
    } else {
        // Если это мелкая тара или жидкий щелочной продукт — работают стандартные безопасные придушивания:
        
        // 1. Дополнительное урезание 1 и 3 скорости на 15% для жидких пенных сред (вязкость < 800 ед.)
        if (visc < 800) {
            const liquidDamping = 0.85 + (0.15 * (visc / 800));
            speed1 = speed1 * liquidDamping;
            speed3 = speed3 * liquidDamping;
        }

        // 2. Если объем флакона до 1л включительно (<= 1000 мл), срезаем вторую скорость еще на 10%
        if (vol <= 1000) {
            speed2 = speed2 * 0.90;
        }

        // 3. Общее придушивание всех 3 скоростей насоса на 8% для общей безопасности (Коэффициент 0.92)
        speed1 = speed1 * 0.92;
        speed2 = speed2 * 0.92;
        speed3 = speed3 * 0.92;
    }

    // Обеспечение жестких верхних лимитов ПЛК (Частота насоса не может физически превысить 100%)
    speed1 = Math.min(speed1, 100.00);
    speed2 = Math.min(speed2, 100.00);
    speed3 = Math.min(speed3, 100.00);

    // ОБЩЕЗАВОДСКОЕ ПРАВИЛО НАСОСА: Фазы переходов 20% и 85% от уставки ОБЩИЙ ВЕС (tw)
    t2 = Math.round(tw * 0.20); 
    t3 = Math.round(tw * 0.85); 

    // ОБЩЕЗАВОДСКОЕ ПРАВИЛО КИНЕМАТИКИ ТРАВЕРСЫ
    np1 = bp;
    np2 = Math.round(bp + (tp * 0.20));
    np3 = Math.round(bp + (tp * 0.85));

    if (np3 >= tp) {
        np3 = Math.round(tp - 5);
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
