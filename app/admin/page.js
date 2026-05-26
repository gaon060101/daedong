"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, updateDoc, deleteDoc, doc, orderBy } from "firebase/firestore";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(fetchedOrders);
        setLoading(false);
      }, (err) => {
        console.error("Firestore Error:", err);
        setError("데이터베이스 연결 오류가 발생했습니다. Firebase 설정을 확인해주세요.");
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setError("Firebase가 올바르게 초기화되지 않았습니다.");
      setLoading(false);
    }
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating order: ", error);
      alert("상태 업데이트 실패");
    }
  };

  const deleteOrder = async (orderId) => {
    if (!window.confirm("이 주문 내역을 영구 삭제하시겠습니까?")) return;
    try {
      await deleteDoc(doc(db, "orders", orderId));
    } catch (error) {
      console.error("Error deleting order: ", error);
      alert("주문 삭제 중 오류가 발생했습니다.");
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const completedOrders = orders.filter((o) => o.status === "completed");

  const totalRevenue = orders
    .filter(o => o.status !== "rejected" && o.status !== "pending") // 거절되거나 대기중인 주문은 매출에서 제외 (입금 확인 완료된 것만 합산)
    .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  const OrderCard = ({ order, actionButton }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100/80 mb-3 group relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${order.status === 'pending' ? 'bg-amber-400' : order.status === 'preparing' ? 'bg-yonsei' : 'bg-gray-300'}`}></div>
      
      <button 
        onClick={() => deleteOrder(order.id)}
        className="absolute top-3 right-3 text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        title="주문 영구 삭제"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="flex justify-between items-start mt-1 mb-3 pr-8">
        <div>
          <span className="text-xl font-black text-gray-900 tracking-tight">Table {order.tableNumber}</span>
          <span className="text-xs font-bold text-gray-400 ml-2">
            {order.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '방금 전'}
          </span>
        </div>
        <p className="font-black text-lg text-yonsei">
          {order.totalAmount.toLocaleString()}원
        </p>
      </div>
      
      <div className="flex flex-wrap gap-1.5 mb-4">
        {order.items.map((item, idx) => (
          <span key={idx} className="inline-flex items-center border text-sm font-bold px-2 py-1.5 rounded-lg shadow-sm bg-slate-50 border-slate-200 text-gray-700">
            {item.name} {item.option && <span className="text-yonsei ml-1 font-black">({item.option})</span>} 
            <span className="text-yonsei bg-blue-100/50 ml-1.5 px-1.5 rounded">x{item.quantity}</span>
          </span>
        ))}
      </div>
      
      <div className="mt-auto">
        {actionButton}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-xl">
          <h2 className="text-red-600 font-bold text-xl mb-2">오류 발생</h2>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-yonsei border-t-transparent rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-lg font-bold text-yonsei">대시보드 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-4 md:p-8 font-sans max-w-[1600px] mx-auto flex flex-col bg-transparent overflow-hidden">
      <header className="mb-6 shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <span className="bg-yonsei text-white p-2.5 rounded-xl shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </span>
              실시간 대시보드
            </h1>
            <p className="text-gray-500 mt-2 font-bold pl-1">문중반점 통합 관리 시스템</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-sm border border-white flex flex-col items-end min-w-[140px]">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">총 주문 건수 (정상)</span>
              <span className="text-3xl font-black text-gray-800 tracking-tight">{orders.filter(o => o.status !== "rejected").length}<span className="text-lg font-bold text-gray-400 ml-1">건</span></span>
            </div>
            <div className="bg-gradient-to-br from-[#0032A0] to-[#1a55d4] px-7 py-4 rounded-2xl shadow-[0_10px_20px_rgba(0,50,160,0.2)] border border-blue-400/20 flex flex-col items-end transform transition-transform hover:scale-105 min-w-[200px]">
              <span className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">오늘의 총 매출</span>
              <span className="text-3xl font-black text-white tracking-tight">{totalRevenue.toLocaleString()}<span className="text-lg font-bold text-blue-200 ml-1">원</span></span>
            </div>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-x-auto pb-4">
        
        {/* Column 1: Pending */}
        <div className="flex flex-col h-full bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm overflow-hidden min-w-[320px]">
          <div className="p-5 pb-4 shrink-0 flex justify-between items-center border-b border-gray-200/50 bg-white/40">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span> 결제 확인 대기
            </h2>
            <span className="bg-amber-100 text-amber-700 px-3.5 py-1 rounded-full text-sm font-black shadow-sm">
              {pendingOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
            {pendingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                actionButton={
                  <div className="flex gap-2 w-full mt-2">
                    <button 
                      onClick={() => updateOrderStatus(order.id, "rejected")}
                      className="flex-[1] bg-white text-red-500 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-50 active:scale-[0.98] transition-all shadow-sm text-sm"
                    >
                      주문 취소
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(order.id, "preparing")}
                      className="flex-[2] bg-amber-50 text-amber-600 border border-amber-200 py-3 rounded-xl font-bold hover:bg-amber-400 hover:text-white hover:border-amber-400 active:scale-[0.98] transition-all shadow-sm text-sm"
                    >
                      입금 확인 완료
                    </button>
                  </div>
                } 
              />
            ))}
            {pendingOrders.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold opacity-60">
                대기 중인 주문 없음
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div className="flex flex-col h-full bg-[#f4f7fc]/90 backdrop-blur-xl rounded-[2rem] border-2 border-[#0032A0]/10 shadow-[0_4px_20px_rgba(0,50,160,0.05)] overflow-hidden min-w-[320px]">
          <div className="p-5 pb-4 shrink-0 flex justify-between items-center border-b border-[#0032A0]/10 bg-white/50">
            <h2 className="text-lg font-black text-yonsei flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yonsei animate-pulse shadow-[0_0_8px_rgba(0,50,160,0.6)]"></span> 조리 및 준비 중
            </h2>
            <span className="bg-yonsei text-white px-3.5 py-1 rounded-full text-sm font-black shadow-md">
              {preparingOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
            {preparingOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                actionButton={
                  <button 
                    onClick={() => updateOrderStatus(order.id, "completed")}
                    className="w-full bg-yonsei text-white py-3 rounded-xl font-black hover:bg-yonsei-light active:scale-[0.98] transition-all shadow-[0_4px_10px_rgba(0,50,160,0.2)] text-sm tracking-wide mt-2"
                  >
                    서빙 완료 처리
                  </button>
                } 
              />
            ))}
            {preparingOrders.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-yonsei/40 font-bold opacity-70">
                준비 중인 메뉴 없음
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Completed */}
        <div className="flex flex-col h-full bg-slate-200/40 backdrop-blur-md rounded-[2rem] border border-white/60 shadow-sm overflow-hidden opacity-90 min-w-[320px]">
          <div className="p-5 pb-4 shrink-0 flex justify-between items-center border-b border-gray-300/30 bg-white/20">
            <h2 className="text-lg font-black text-gray-500 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span> 서빙 완료됨
            </h2>
            <span className="bg-gray-200 text-gray-600 px-3.5 py-1 rounded-full text-sm font-black border border-gray-300/50">
              {completedOrders.length}
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
            {completedOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                actionButton={
                  <div className="w-full bg-gray-100 text-gray-400 py-3 rounded-xl font-bold text-center border border-gray-200 text-sm mt-2">
                    완료된 주문
                  </div>
                } 
              />
            ))}
            {completedOrders.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold opacity-60">
                완료된 내역 없음
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
