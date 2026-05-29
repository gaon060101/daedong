"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, updateDoc, doc, orderBy } from "firebase/firestore";

export default function KitchenView() {
  const [preparingOrders, setPreparingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          // 조리가 필요 없는 단순 음료/주류 필터링
          const filteredItems = data.items ? data.items.filter(item => 
            !["물", "사이다", "빙홍차", "콜라", "카스"].includes(item.name)
          ) : [];
          
          return {
            id: doc.id,
            ...data,
            items: filteredItems,
          };
        })
        .filter(order => order.status === "preparing" && order.items.length > 0);
        
      setPreparingOrders(fetchedOrders);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-yonsei border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-2xl font-black text-yonsei">주방 화면 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans max-w-[1920px] mx-auto bg-transparent">
      <header className="mb-4 flex justify-between items-center bg-white/80 backdrop-blur-xl p-4 md:p-5 rounded-2xl shadow-sm border border-white">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="text-yonsei">👨‍🍳 주방 전용 화면</span>
          </h1>
          <p className="text-gray-500 mt-1 font-bold text-sm md:text-base">현재 조리해야 할 주문 목록입니다.</p>
        </div>
        
        <Link href="/admin" className="bg-slate-100 hover:bg-slate-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm md:text-base transition-colors flex items-center gap-2 border border-slate-200 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          관리자 화면
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {preparingOrders.length === 0 ? (
          <div className="col-span-full h-[60vh] flex flex-col items-center justify-center text-gray-400 font-black text-xl opacity-50 bg-white/40 rounded-2xl border border-white/50">
            현재 조리 대기 중인 주문이 없습니다 🎉
          </div>
        ) : (
          preparingOrders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden transition-all hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-yonsei"></div>
              
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 flex-1 mb-3">
                <ul className="space-y-2">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center gap-3 text-base md:text-lg font-black text-gray-800 pb-2 border-b border-gray-200/50 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-yonsei shrink-0"></span>
                        <span className="leading-tight break-keep">{item.name}</span>
                        {item.option && <span className="text-yonsei text-sm bg-blue-100/50 px-1.5 py-0.5 rounded ml-1 whitespace-nowrap">({item.option})</span>}
                      </div>
                      <span className="bg-gray-800 text-white px-2.5 py-0.5 rounded-lg text-base shadow-sm shrink-0">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-end px-1">
                <div className="flex flex-col">
                  <span className="text-gray-400 font-bold text-[10px] mb-0.5 uppercase tracking-widest">Table</span>
                  <span className="text-2xl font-black text-yonsei leading-none">{order.tableNumber}</span>
                </div>
                <div className="text-right">
                  <span className="block text-gray-400 font-bold text-[10px] mb-0.5">주문 시간</span>
                  <span className="text-base font-black text-gray-600">
                    {order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '방금 전'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
