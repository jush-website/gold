import { useCallback, useState } from 'react';
import { DEFAULT_FACTOR, isValidFactor } from '../../lib/calibration.js';

const STORAGE_KEY = 'gold_calibration_v1';

// 校準倍率存在本機，不進 Firestore：
// 它是「這台裝置怎麼顯示」的偏好，不是帳務資料。
// 代價是換裝置要重設一次，換來的是不必動資料結構、也不必等網路。
const read = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { factor: DEFAULT_FACTOR };
        const parsed = JSON.parse(raw);
        return isValidFactor(Number(parsed?.factor))
            ? { factor: Number(parsed.factor), calibratedAt: parsed.calibratedAt, reference: parsed.reference }
            : { factor: DEFAULT_FACTOR };
    } catch {
        return { factor: DEFAULT_FACTOR };
    }
};

export const useCalibration = () => {
    const [calibration, setCalibration] = useState(read);

    const save = useCallback((factor, reference) => {
        const next = {
            factor,
            reference,
            calibratedAt: new Date().toISOString().slice(0, 10),
        };
        setCalibration(next);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch { /* 無痕模式存不了，這次工作階段仍然生效 */ }
    }, []);

    const reset = useCallback(() => {
        setCalibration({ factor: DEFAULT_FACTOR });
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch { /* 同上 */ }
    }, []);

    return { calibration, saveCalibration: save, resetCalibration: reset };
};
