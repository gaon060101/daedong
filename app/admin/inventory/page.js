"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { MENU_DATA } from "@/lib/data";

export default function InventoryAdmin() {
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const invData = {};
      snapshot.forEach(doc => {
        invData[doc.id] = doc.data().remainingCount;
      });
      setInventory(invData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStock = async (itemId, isUnlimited) => {
    try {
      const value = isUnlimited ? null : parseInt(inputs[itemId] || 0, 10);
      await setDoc(doc(db, "inventory", itemId), {
        remainingCount: value
      }, { merge: true });
      alert("재고가 업데이트 되었습니다.");
    } catch (error) {
      console.error("Error updating inventory", error);
      alert("재고 업데이트 실패");
    }
  };

  const handleInputChange = (itemId, value) => {
    setInputs(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // Flatten menus
  const allItems = MENU_DATA.flatMap(category => category.items);

  if (loading) return <div className="p-10 text-center font-bold text-xl">로딩중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans">
      <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-yonsei">📦 재고(매진 임박) 관리</span>
          </h1>
          <p className="text-gray-500 mt-2 font-bold">메뉴별 잔여 수량을 설정합니다. 수량이 0이 되면 자동으로 품절 처리됩니다.</p>
        </div>
        <Link href="/admin" className="bg-slate-100 hover:bg-slate-200 text-gray-700 px-5 py-3 rounded-xl font-bold transition-colors">
          주문 현황으로 돌아가기
        </Link>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50 border-b border-gray-200">
              <th className="p-4 font-black text-gray-600">메뉴명</th>
              <th className="p-4 font-black text-gray-600">현재 상태</th>
              <th className="p-4 font-black text-gray-600">수량 설정</th>
              <th className="p-4 font-black text-gray-600 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map(item => {
              const currentStock = inventory[item.id];
              const isUnlimited = currentStock === null || currentStock === undefined;
              const isSoldOut = !isUnlimited && currentStock <= 0;

              return (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/50">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.originalName || "음료/주류"}</div>
                  </td>
                  <td className="p-4">
                    {isUnlimited ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">무제한 판매중</span>
                    ) : isSoldOut ? (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">품절 (0개)</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-bold">잔여: {currentStock}개</span>
                    )}
                  </td>
                  <td className="p-4 flex items-center gap-2">
                    <input 
                      type="number" 
                      className="border border-gray-300 rounded-lg p-2 w-24 text-center"
                      placeholder={isUnlimited ? "무제한" : currentStock}
                      value={inputs[item.id] !== undefined ? inputs[item.id] : ""}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      min="0"
                    />
                    <span className="text-gray-500 font-bold">개</span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleUpdateStock(item.id, false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition"
                      >
                        수량 적용
                      </button>
                      <button 
                        onClick={() => {
                          setInputs(prev => ({ ...prev, [item.id]: "" }));
                          handleUpdateStock(item.id, true);
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm transition"
                      >
                        무제한으로 변경
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
