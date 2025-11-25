/* ----------------------------------------------------------
   datepicker.js : カスタム日付ピッカー本体
---------------------------------------------------------- */
class DatePicker {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.input = wrapper.querySelector('.date-input');
        this.selectedDate = null;
        this.currentDate = new Date();
        this.viewDate = new Date();

        this.init();
    }

    /* 初期化処理 */
    init() {
        this.createPicker();
        this.attachEventListeners();
    }

    /* ピッカー DOM を生成 */
    createPicker() {
        const picker = document.createElement('div');
        picker.className = 'date-picker';
        picker.innerHTML = `
            <div class="date-picker-controls">
                <div class="month-navigation">
                    <button class="nav-button prev-month">‹</button>
                    <div class="month-year-display"></div>
                    <button class="nav-button next-month">›</button>
                </div>
                <button class="today-button">今日</button>
            </div>
            <div class="calendar-grid"></div>
        `;
        this.wrapper.appendChild(picker);

        /* 参照を保持 */
        this.picker = picker;
        this.monthYearDisplay = picker.querySelector('.month-year-display');
        this.calendarGrid = picker.querySelector('.calendar-grid');
        this.prevButton = picker.querySelector('.prev-month');
        this.nextButton = picker.querySelector('.next-month');
        this.todayButton = picker.querySelector('.today-button');

        this.createOverlay();
    }

    /* 背景オーバーレイ（外クリックで閉じるため） */
    createOverlay() {
        if (!document.querySelector('.overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            document.body.appendChild(overlay);
        }
    }

    /* イベントバインド */
    attachEventListeners() {
        /* 入力欄クリック → ピッカー表示 */
        this.input.addEventListener('click', () => this.show());

        /* 月移動 */
        this.prevButton.addEventListener('click', () => {
            this.viewDate.setMonth(this.viewDate.getMonth() - 1);
            this.updateCalendar();
        });
        this.nextButton.addEventListener('click', () => {
            this.viewDate.setMonth(this.viewDate.getMonth() + 1);
            this.updateCalendar();
        });

        /* 今日ボタン */
        this.todayButton.addEventListener('click', () => {
            this.viewDate = new Date();
            this.updateCalendar();
        });

        /* 外側クリックで閉じる */
        document.addEventListener('click', (e) => {
            if (!this.wrapper.contains(e.target)) {
                this.hide();
            }
        });
    }

    /* ピッカー表示 */
    show() {
        this.updateCalendar();
        this.picker.classList.add('show');
        document.querySelector('.overlay').classList.add('show');
    }

    /* ピッカー非表示 */
    hide() {
        this.picker.classList.remove('show');
        document.querySelector('.overlay').classList.remove('show');
    }

    /* カレンダー生成／更新 */
    updateCalendar() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        this.monthYearDisplay.textContent = `${year}年${month + 1}月`;
        this.calendarGrid.innerHTML = '';

        /* 曜日ヘッダー */
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        weekdays.forEach((day, idx) => {
            const header = document.createElement('div');
            header.className = 'weekday-header';
            if (idx === 0) header.classList.add('sunday');
            if (idx === 6) header.classList.add('saturday');
            header.textContent = day;
            this.calendarGrid.appendChild(header);
        });

        /* 各日付セルを描画 */
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);
        const startWeekday = firstDay.getDay();

        /* 前月末日分 */
        for (let i = startWeekday - 1; i >= 0; i--) {
            const day = prevLastDay.getDate() - i;
            this.createDayElement(new Date(year, month - 1, day), true);
        }

        /* 当月分 */
        for (let day = 1; day <= lastDay.getDate(); day++) {
            this.createDayElement(new Date(year, month, day), false);
        }

        /* 翌月分（6行×7列を維持） */
        const filled = startWeekday + lastDay.getDate();
        const remain = 42 - filled;
        for (let day = 1; day <= remain; day++) {
            this.createDayElement(new Date(year, month + 1, day), true);
        }
    }

    /* 単一の日セル生成 */
    createDayElement(date, isOtherMonth) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = date.getDate();

        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        if (dayOfWeek === 6) dayEl.classList.add('saturday');

        if (isOtherMonth) dayEl.classList.add('other-month');
        if (this.isToday(date)) dayEl.classList.add('today');
        if (this.selectedDate && this.isSameDay(date, this.selectedDate))
            dayEl.classList.add('selected');

        /* クリック選択 */
        dayEl.addEventListener('click', () => {
            this.selectedDate = date;
            this.viewDate = new Date(date);
            this.updateCalendar();
            this.setInputValue();
            this.hide();
        });

        this.calendarGrid.appendChild(dayEl);
    }

    /* 今日判定 */
    isToday(date) { return this.isSameDay(date, this.currentDate); }

    /* 日単位比較 */
    isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    }

    /* 入力欄に選択日を書き込む */
    setInputValue() {
        if (!this.selectedDate) return;
        const y = this.selectedDate.getFullYear();
        const m = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(this.selectedDate.getDate()).padStart(2, '0');
        this.input.value = `${y}/${m}/${d}`;
    }
}

/* ------------- 初期化 ------------- */
document.querySelectorAll('.date-picker-wrapper').forEach(wrapper => {
    new DatePicker(wrapper);
});
