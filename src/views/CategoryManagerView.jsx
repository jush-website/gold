import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Card, Button, Segmented, EmptyState, Rule } from '../ui/primitives.jsx';
import { iconFor } from '../ui/icons.js';
import { CategoryModal, ConfirmModal } from '../modals/index.jsx';

export default function CategoryManagerView({ categories, onSave, onDelete, showToast }) {
    const [tab, setTab] = useState('expense');
    const [editing, setEditing] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);

    const list = categories.filter((c) => c.type === tab);

    return (
        <div className="h-full overflow-y-auto hide-scrollbar px-4 pt-2 pb-28 space-y-4">
            <Segmented
                className="w-full"
                value={tab}
                onChange={setTab}
                options={[{ value: 'expense', label: '支出分類' }, { value: 'income', label: '收入分類' }]}
            />

            {list.length === 0 ? (
                <Card>
                    <EmptyState icon={Tag} title={`還沒有${tab === 'expense' ? '支出' : '收入'}分類`} />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    {list.map((c, i) => {
                        const Icon = iconFor(c.icon);
                        return (
                            <React.Fragment key={c.id}>
                                {i > 0 && <Rule className="mx-4" />}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <span className="w-9 h-9 rounded-xl bg-surface-3 text-ink-2 grid place-items-center shrink-0">
                                        <Icon size={16} />
                                    </span>
                                    <span className="flex-1 text-sm font-semibold text-ink truncate">{c.name}</span>
                                    <button aria-label="編輯" onClick={() => { setEditing(c); setModalOpen(true); }}
                                        className="p-1.5 rounded-lg text-ink-3 hover:text-gold hover:bg-surface-3 transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                    <button aria-label="刪除" onClick={() => setToDelete(c)}
                                        className="p-1.5 rounded-lg text-ink-3 hover:text-loss hover:bg-loss/10 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </Card>
            )}

            <Button icon={Plus} className="w-full" size="lg"
                onClick={() => { setEditing(null); setModalOpen(true); }}>
                新增分類
            </Button>

            {modalOpen && (
                <CategoryModal
                    initialData={editing}
                    defaultType={tab}
                    showToast={showToast}
                    onClose={() => { setModalOpen(false); setEditing(null); }}
                    onSave={(data) => { onSave(data); setModalOpen(false); setEditing(null); }}
                />
            )}

            <ConfirmModal
                isOpen={!!toDelete}
                title="刪除分類"
                message={`確定要刪除「${toDelete?.name}」嗎？已使用此分類的紀錄會變成未分類。`}
                onConfirm={() => { onDelete(toDelete.id); setToDelete(null); }}
                onCancel={() => setToDelete(null)}
            />
        </div>
    );
}
