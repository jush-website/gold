import React, { useState } from 'react';
import { DownloadCloud, UploadCloud, Database, ShieldCheck } from 'lucide-react';
import { Card, Button, SectionLabel } from '../ui/primitives.jsx';
import { ConfirmModal } from '../modals/index.jsx';

export default function BackupView({ onExport, onImport, isLoading, counts }) {
    const [pendingFile, setPendingFile] = useState(null);

    const stats = [
        ['記帳紀錄', counts.expenses],
        ['黃金紀錄', counts.gold],
        ['借款紀錄', counts.debts],
        ['分類', counts.categories],
    ];

    return (
        <div className="h-full overflow-y-auto hide-scrollbar px-4 pt-2 pb-28 space-y-6">
            <section>
                <SectionLabel>目前資料</SectionLabel>
                <Card className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                        {stats.map(([label, n]) => (
                            <div key={label}>
                                <p className="text-[10px] text-ink-3 mb-1">{label}</p>
                                <p className="tnum text-lg font-semibold text-ink">{n}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

            <section>
                <SectionLabel>備份與還原</SectionLabel>
                <Card className="p-5 space-y-5">
                    <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-xl bg-gold/12 text-gold grid place-items-center shrink-0">
                            <Database size={16} />
                        </span>
                        <p className="text-sm text-ink-2 leading-relaxed">
                            把所有記帳、黃金存摺、帳本、分類與借款匯出成一個檔案，
                            換手機或想留存時可以再匯入回來。
                        </p>
                    </div>

                    <Button icon={DownloadCloud} size="lg" className="w-full" onClick={onExport}>
                        匯出備份檔
                    </Button>

                    <div className="relative">
                        <input
                            type="file"
                            accept=".json"
                            disabled={isLoading}
                            onClick={(e) => { e.target.value = null; }}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                e.target.value = '';
                                if (file) setPendingFile(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <Button variant="secondary" icon={UploadCloud} size="lg" className="w-full pointer-events-none" loading={isLoading}>
                            選擇檔案還原
                        </Button>
                    </div>

                    <p className="flex items-start gap-2 text-[11px] text-ink-3 leading-relaxed">
                        <ShieldCheck size={13} className="shrink-0 mt-0.5" />
                        還原時相同 ID 的紀錄會被覆寫。建議先匯出一份目前的資料再還原。
                    </p>
                </Card>
            </section>

            <ConfirmModal
                isOpen={!!pendingFile}
                title="確定要還原資料嗎？"
                confirmLabel="確定還原"
                message={`即將從「${pendingFile?.name || ''}」還原，相同 ID 的紀錄會被覆寫。`}
                onConfirm={() => { const f = pendingFile; setPendingFile(null); onImport(f); }}
                onCancel={() => setPendingFile(null)}
            />
        </div>
    );
}
