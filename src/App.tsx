import React, { useState, useEffect, useMemo } from 'react';
import { Save, Upload, Download, Plus, Trash2, AlertTriangle, TrendingDown, Calendar } from 'lucide-react';

interface Transaction {
  id: number;
  date: string;
  label: string;
  amount: number;
}

interface ProcessedTransaction extends Transaction {
  balance: number;
}

const useCashflowManager = (initialData: Transaction[] = []) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === 'undefined') return initialData;
    try {
      const saved = localStorage.getItem('cashflow_data');
      return saved ? JSON.parse(saved) : initialData;
    } catch (e) {
      console.error("LocalStorage load error:", e);
      return initialData;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cashflow_data', JSON.stringify(transactions));
    } catch (e) {
      console.error("LocalStorage save error:", e);
    }
  }, [transactions]);

  const addTransaction = () => {
    const currentIds = transactions.map(t => t.id);
    const newId = currentIds.length > 0 ? Math.max(...currentIds) + 1 : 1;

    const today = new Date().toISOString().split('T')[0];
    setTransactions([...transactions, { id: newId, date: today, label: '', amount: 0 }]);
  };

  const updateTransaction = (id: number, field: keyof Transaction, value: string | number) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, [field]: field === 'amount' ? (Number(value) || 0) : value } : t
    ));
  };

  const deleteTransaction = (id: number) => {
    if(window.confirm("この行を削除してもよろしいですか？")){
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if(Array.isArray(parsed)){
        setTransactions(parsed);
      } else {
        alert("データ形式が正しくありません");
      }
    } catch (e) {
      alert('ファイルの読み込みに失敗しました。JSON形式を確認してください。');
    }
  };

  const processedData = useMemo<ProcessedTransaction[]>(() => {
    let balance = 0;
    const sorted = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateDiff !== 0 ? dateDiff : a.id - b.id;
    });

    return sorted.map(t => {
      balance += t.amount;
      return { ...t, balance };
    });
  }, [transactions]);

  const shortfall = processedData.find(t => t.balance < 0);

  return {
    transactions,
    processedData,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    importData,
    shortfall
  };
};

const CashflowApp = () => {
  const initialData: Transaction[] = [
    { id: 1, date: new Date().toISOString().split('T')[0], label: '現在の所持金', amount: 100000 },
    { id: 2, date: '2025-12-31', label: '家賃・生活費', amount: -120000 },
  ];

  const {
    processedData, addTransaction, updateTransaction, deleteTransaction, importData, shortfall, transactions
  } = useCashflowManager(initialData);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => importData(event.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cashflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getDaysUntil = (targetDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto">

        <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingDown className="text-blue-600" />
              Survival Cashflow
            </h1>
            <p className="text-gray-500 mt-1 text-sm">資金ショートまでの生存期間を管理する</p>
          </div>

          <div className="flex gap-2">
            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all" title="Import JSON">
              <Upload size={16} className="text-gray-600" />
              <span className="text-sm font-medium">読込</span>
              <input type="file" className="hidden" accept=".json" onChange={handleFileUpload} />
            </label>
            <button onClick={downloadJson} className="bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all" title="Export JSON">
              <Download size={16} className="text-gray-600" />
              <span className="text-sm font-medium">保存</span>
            </button>
          </div>
        </header>

        <div className="mb-6 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r shadow-sm">
          <p className="text-orange-900 font-semibold flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            注意: データはブラウザに保存されます。キャッシュを消去するとデータが失われます。
            <br className="hidden md:block" />
            <span className="text-xs md:text-sm text-orange-800 md:ml-8">/  Note: Data is saved locally. Clearing browser cache will delete your records.</span>
          </p>
        </div>

        <div className="mb-6">
          {shortfall ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm flex items-start gap-3 animate-pulse">
              <AlertTriangle className="text-red-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-800 text-lg">資金ショート警告</h3>
                <p className="text-red-700">
                  <span className="font-mono font-bold text-xl">{shortfall.date}</span> に残高がマイナスになります。
                  <br />
                  X-Dayまであと <span className="text-2xl font-black">{getDaysUntil(shortfall.date)}</span> 日です。
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r shadow-sm flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Calendar className="text-green-600" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-green-800">安全圏です</h3>
                <p className="text-green-700 text-sm">現在の入力情報では資金ショートの予定はありません。</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 w-48 font-semibold">日付</th>
                  <th className="px-6 py-4 font-semibold">項目</th>
                  <th className="px-6 py-4 text-right w-40 font-semibold">金額 (円)</th>
                  <th className="px-6 py-4 text-right w-40 font-semibold">残高推移</th>
                  <th className="px-4 py-4 text-center w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {processedData.map((row) => (
                  <tr
                    key={row.id}
                    className={`group transition-colors duration-150
                      ${row.balance < 0 ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}`
                    }
                  >
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateTransaction(row.id, 'date', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-gray-700 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => updateTransaction(row.id, 'label', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-gray-800 placeholder-gray-400"
                        placeholder="項目を入力..."
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        value={row.amount}
                        onChange={(e) => updateTransaction(row.id, 'amount', e.target.value)}
                        className={`w-full bg-transparent border-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 text-right font-mono font-medium
                          ${row.amount < 0 ? 'text-red-500' : 'text-blue-600'}`
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-mono font-bold ${row.balance < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                        {row.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => deleteTransaction(row.id)}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        title="削除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={addTransaction}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 font-medium hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex justify-center items-center gap-2"
            >
              <Plus size={20} />
              行を追加する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashflowApp;
