import { describe, it, expect } from 'vitest';
import {
    evaluateExpression, toDisplay, hasOperator, pressKey, resolveExpression,
} from '../lib/keypad.js';

describe('pressKey', () => {
    it('累加數字', () => {
        expect(['1', '2', '9'].reduce((e, k) => pressKey(e, k), '')).toBe('129');
    });

    it('C 清空、DEL 退一格', () => {
        expect(pressKey('123', 'C')).toBe('');
        expect(pressKey('123', 'DEL')).toBe('12');
        expect(pressKey('', 'DEL')).toBe('');
    });

    it('開頭不接運算符號', () => {
        expect(pressKey('', '+')).toBe('');
    });

    it('連按運算符號時取代前一個，不會疊成 1++', () => {
        expect(pressKey('1+', '×')).toBe('1*');
        expect(pressKey('1', '+')).toBe('1+');
    });

    it('同一段數字裡只能有一個小數點', () => {
        expect(pressKey('1.5', '.')).toBe('1.5');
        // 但下一段可以再有一個
        expect(pressKey('1.5+2', '.')).toBe('1.5+2.');
    });

    it('小數點開頭自動補 0', () => {
        expect(pressKey('', '.')).toBe('0.');
    });

    it('allowDecimal 為 false 時忽略小數點', () => {
        expect(pressKey('12', '.', { allowDecimal: false })).toBe('12');
    });

    it('無法辨識的鍵原樣傳回', () => {
        expect(pressKey('12', 'X')).toBe('12');
    });
});

describe('evaluateExpression', () => {
    it('算四則運算', () => {
        expect(evaluateExpression('120+80')).toBe(200);
        expect(evaluateExpression('99*3')).toBe(297);
    });

    it('空字串與純符號回 null，不會變成 NaN 金額', () => {
        expect(evaluateExpression('')).toBeNull();
        expect(evaluateExpression('+')).toBeNull();
        expect(evaluateExpression(null)).toBeNull();
    });

    it('除以零回 null', () => {
        expect(evaluateExpression('10/0')).toBeNull();
    });

    it('過濾掉非數字與非運算符號的字元', () => {
        expect(evaluateExpression('1a+2')).toBe(3);
    });
});

describe('hasOperator', () => {
    it('開頭的負號不算運算符號', () => {
        expect(hasOperator('-50')).toBe(false);
        expect(hasOperator('50-20')).toBe(true);
        expect(hasOperator('350')).toBe(false);
    });
});

describe('resolveExpression', () => {
    it('有運算式就結算', () => {
        expect(resolveExpression('120+80')).toBe('200');
    });

    it('沒有運算式就原樣保留，不改寫使用者打的字', () => {
        expect(resolveExpression('0080')).toBe('0080');
        expect(resolveExpression('')).toBe('');
    });

    it('沒打完的算式去掉尾巴再算', () => {
        expect(resolveExpression('120+')).toBe('120');
        expect(resolveExpression('120+80*')).toBe('200');
    });

    it('allowDecimal 為 false 時取整', () => {
        expect(resolveExpression('10/3', { allowDecimal: false })).toBe('3');
        expect(resolveExpression('10/3')).toBe('3.33');
    });
});

describe('toDisplay', () => {
    it('把運算符號換成好讀的樣子', () => {
        expect(toDisplay('1*2/3-4')).toBe('1×2÷3−4');
        expect(toDisplay(null)).toBe('');
    });
});
