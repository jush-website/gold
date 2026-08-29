// 把 API 回傳的資料來源代碼翻成使用者看得懂的說明。
// 目的是誠實：畫面上要看得出這個數字是台銀即時牌價、上一個交易日的收盤，
// 還是用國際金價換算出來的估計值。

// 目前價格的來源
export const describePriceSource = (source) => {
    switch (source) {
        case 'bot':
            return { text: '台銀即時牌價', tone: 'normal' };
        case 'bot-close':
            return { text: '上一交易日收盤', tone: 'muted' };
        case 'yahoo':
            return { text: '國際金價換算（非台銀牌價）', tone: 'warn' };
        default:
            return null;
    }
};

// 圖表這條線的來源。今日走勢畫的是國際期貨（GC=F）的形狀再校正到台銀價位，
// 台銀一天只調整幾次牌價，不會有連續曲線 —— 這件事必須講明白。
export const describeSeriesSource = (period, { historySource, intradaySource } = {}) => {
    if (period === '1d') {
        if (!intradaySource) return null;
        return { text: '國際金價走勢換算，非台銀牌價變化', tone: 'warn' };
    }

    switch (historySource) {
        case 'bot-csv':
            return { text: '台銀歷史牌價', tone: 'muted' };
        case 'yahoo-estimated':
            return { text: '國際金價估算，匯率為估計值', tone: 'warn' };
        default:
            return null;
    }
};
