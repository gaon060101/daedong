"use client";

import { useState, useEffect } from "react";
import { MENU_DATA } from "@/lib/data";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from "firebase/firestore";

export default function CustomerApp({ initialTable }) {
  const [table, setTable] = useState(initialTable || "");
  const [isTableSet, setIsTableSet] = useState(false); 
  const [cart, setCart] = useState({});
  
  const [isPaying, setIsPaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  
  const [orderRejected, setOrderRejected] = useState(false);
  const [orderAccepted, setOrderAccepted] = useState(false);
  
  const categories = ["전체", ...MENU_DATA.map(c => c.category), "장바구니"];
  const [activeCategory, setActiveCategory] = useState("전체");

  const [optionModalItem, setOptionModalItem] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null); 
  const [optionQuantity, setOptionQuantity] = useState(1);

  useEffect(() => {
    if (!currentOrderId) return;
    const unsubscribe = onSnapshot(doc(db, "orders", currentOrderId), (docSnap) => {
      if (docSnap.exists()) {
        const status = docSnap.data().status;
        if (status === "rejected") {
          setOrderRejected(true);
        } else if (status === "preparing" || status === "completed") {
          setOrderAccepted(true);
        }
      }
    });
    return () => unsubscribe();
  }, [currentOrderId]);

  if (!isTableSet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-yonsei p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        
        <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl max-w-sm w-full text-center relative z-10 border border-white/50">
          <h1 className="text-4xl font-black text-gray-800 mb-2 tracking-tight">문중반점</h1>
          <p className="text-yonsei font-black mb-10 text-lg">연세대학교</p>
          
          <p className="text-gray-500 mb-4 font-bold">테이블 번호를 입력해주세요</p>
          <input 
            type="number" 
            value={table}
            onChange={(e) => setTable(e.target.value)}
            placeholder="예: 3"
            className="w-full text-center text-5xl font-black text-yonsei border-b-4 border-slate-200 focus:border-yonsei outline-none pb-4 mb-10 bg-transparent transition-colors placeholder:text-gray-200"
          />
          
          <button 
            onClick={() => {
              if(!table.toString().trim()) alert("테이블 번호를 정확히 입력해주세요!");
              else setIsTableSet(true);
            }}
            className="w-full bg-gradient-to-r from-yonsei to-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-[0_10px_20px_rgba(0,50,160,0.2)] active:scale-95 transition-all"
          >
            메뉴판 보기
          </button>
        </div>
      </div>
    );
  }

  const addToCartBase = (item) => {
    const cartKey = item.id;
    setCart((prev) => ({
      ...prev,
      [cartKey]: {
        ...item,
        cartKey,
        quantity: (prev[cartKey]?.quantity || 0) + 1,
      },
    }));
  };

  const incrementCartItem = (cartKey) => {
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        ...prev[cartKey],
        quantity: prev[cartKey].quantity + 1
      }
    }));
  };

  const decrementCartItem = (cartKey) => {
    setCart((prev) => {
      const current = prev[cartKey]?.quantity || 0;
      if (current <= 1) {
        const newCart = { ...prev };
        delete newCart[cartKey];
        return newCart;
      }
      return {
        ...prev,
        [cartKey]: { ...prev[cartKey], quantity: current - 1 },
      };
    });
  };

  const cartItems = Object.values(cart);
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const submitOrder = async () => {
    if (cartItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const items = cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        option: item.option || null
      }));

      const docRef = await addDoc(collection(db, "orders"), {
        tableNumber: table,
        items,
        totalAmount,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setCurrentOrderId(docRef.id);
      setOrderComplete(true);
    } catch (error) {
      console.error("Error submitting order: ", error);
      alert("주문 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOrder = () => {
    setOrderComplete(false);
    setIsPaying(false);
    setOrderRejected(false);
    setOrderAccepted(false);
    setCurrentOrderId(null);
    setCart({}); 
    setActiveCategory("전체");
  };

  const openOptionModal = (item) => {
    setOptionModalItem(item);
    setSelectedOption(item.options[0]);
    setOptionQuantity(1);
  };

  const confirmOptionSelection = () => {
    const cartKey = `${optionModalItem.id}-${selectedOption.name}`;
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        ...optionModalItem,
        price: selectedOption.price,
        cartKey,
        option: selectedOption.name,
        quantity: (prev[cartKey]?.quantity || 0) + optionQuantity
      }
    }));
    setOptionModalItem(null);
  };

  if (orderRejected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center bg-transparent">
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-red-500">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-red-100">✕</div>
          <h2 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">주문이 취소되었습니다</h2>
          <p className="text-gray-600 mb-8 text-lg font-medium leading-relaxed">
            송금이 확인되지 않아 관리자가 주문을 거절했습니다.<br/>
            <span className="text-red-500 font-bold">계좌 확인 후 다시 주문해주세요.</span>
          </p>
          <button
            onClick={resetOrder}
            className="w-full bg-slate-100 text-gray-700 font-black py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition text-lg border border-slate-200 shadow-sm"
          >
            장바구니로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 text-center bg-transparent relative overflow-hidden">
        {orderAccepted && (
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent"></div>
        )}
        
        <div className={`bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full border-t-8 z-10 transition-colors duration-500 ${orderAccepted ? 'border-green-500' : 'border-yonsei'}`}>
          {orderAccepted ? (
             <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-green-100 animate-bounce">✓</div>
          ) : (
             <div className="w-20 h-20 bg-yonsei/10 text-yonsei rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-yonsei/20">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 animate-spin">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
               </svg>
             </div>
          )}
          
          <h2 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">
            {orderAccepted ? "주문이 수락되었습니다!" : "입금 확인 중입니다..."}
          </h2>
          
          <div className="bg-slate-50 p-5 rounded-2xl mb-6 border border-slate-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-1 font-bold">결제 확인 금액</p>
            <p className="text-4xl font-black text-gray-900">{totalAmount.toLocaleString()}원</p>
          </div>
          
          <p className="text-gray-600 mb-8 text-lg font-medium leading-relaxed">
            {orderAccepted ? (
              <>
                입금이 확인되어 <span className="text-green-500 font-bold">조리가 시작되었습니다.</span><br/>잠시 후 자리로 가져다 드릴게요!
              </>
            ) : (
              <>
                관리자가 입금을 확인하고 있습니다.<br/>
                <span className="text-yonsei font-bold">승인될 때까지 이 화면을 유지해주세요.</span>
              </>
            )}
          </p>

          {orderAccepted && (
            <button
              onClick={resetOrder}
              className="w-full bg-slate-100 text-gray-700 font-black py-4 rounded-xl hover:bg-slate-200 active:scale-95 transition text-lg border border-slate-200 shadow-sm"
            >
              추가 주문하기
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isPaying) {
    return (
      <div className="flex flex-col items-center min-h-[100dvh] p-6 text-center bg-transparent pt-12">
        <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full border-t-8 border-yonsei text-left relative">
          <button 
            onClick={() => setIsPaying(false)}
            className="absolute top-5 left-5 p-2 bg-slate-100 rounded-full text-gray-500 hover:text-gray-800 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          
          <h2 className="text-2xl font-black text-gray-800 mt-10 mb-6 tracking-tight">송금 후 주문을 완료해주세요</h2>
          
          <div className="bg-slate-50 p-5 rounded-2xl mb-6 border border-slate-200 text-center shadow-sm">
            <p className="text-sm text-gray-500 mb-1 font-bold">총 결제하실 금액</p>
            <p className="text-4xl font-black text-yonsei">{totalAmount.toLocaleString()}원</p>
          </div>

          <div className="bg-blue-50/50 p-5 rounded-2xl mb-8 border border-blue-100">
            <p className="text-sm text-yonsei font-black mb-3">총무 계좌번호</p>
            <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm mb-3 text-center">
              <span className="font-black text-gray-800 text-2xl tracking-tight block">카카오뱅크</span>
              <span className="font-bold text-gray-600 text-xl tracking-widest mt-1 block">1234-56-7890</span>
              <p className="text-gray-500 text-sm mt-3 font-bold bg-slate-50 py-1.5 rounded-lg border border-slate-100">예금주: 총무명</p>
            </div>
            <p className="text-sm text-gray-600 text-center font-bold bg-white/60 py-2.5 rounded-lg border border-white shadow-sm">
              ⚠️ 반드시 <span className="text-red-500">송금 완료 후</span> 버튼을 눌러주세요!
            </p>
          </div>

          <button
            onClick={submitOrder}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-yonsei to-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "처리 중..." : "송금 완료 (주문 접수)"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 max-w-md mx-auto w-full min-h-[100dvh] bg-transparent relative">
      <header className="bg-white/95 backdrop-blur-xl text-gray-900 pt-6 px-6 pb-2 rounded-b-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.05)] sticky top-0 z-30 border-b border-white">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-yonsei">문중반점</h1>
            <p className="text-gray-400 mt-1 font-black text-sm">연세대학교</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <button 
              onClick={() => setIsTableSet(false)}
              className="text-[10px] text-gray-400 font-black mb-1 tracking-widest flex items-center gap-1 hover:text-yonsei transition-colors"
            >
              TABLE <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
            </button>
            <div className="bg-yonsei text-white font-black text-2xl w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transform rotate-3">
              {table}
            </div>
          </div>
        </div>
        
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-5 py-2 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeCategory === cat 
                  ? "bg-yonsei text-white" 
                  : "bg-slate-100 text-gray-500 hover:bg-slate-200 border border-transparent hover:border-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 space-y-8 mt-4">
        {activeCategory === "장바구니" ? (
          <section>
            <h2 className="text-2xl font-black text-gray-800 mb-6 tracking-tight">이렇게 주문하시겠습니까?</h2>
            
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-400 py-10 font-bold">장바구니가 비어있습니다.</div>
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-[1.5rem] shadow-sm border border-white p-5 space-y-5">
                {cartItems.map((item) => (
                  <div key={item.cartKey} className="flex justify-between items-start pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex-1 pr-2">
                      <h4 className="font-bold text-gray-800 text-lg">{item.name}</h4>
                      {item.option && <p className="text-sm text-yonsei font-black mt-1 bg-yonsei/10 inline-block px-2 py-0.5 rounded-md">옵션: {item.option}</p>}
                      <p className="font-black text-gray-900 mt-2 text-lg">{item.price.toLocaleString()}원</p>
                    </div>
                    
                    <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200 mt-2">
                      <button onClick={() => decrementCartItem(item.cartKey)} className="w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center font-bold text-xl shadow-sm active:scale-95">-</button>
                      <span className="font-black w-8 text-center">{item.quantity}</span>
                      <button onClick={() => incrementCartItem(item.cartKey)} className="w-8 h-8 rounded-full bg-yonsei text-white flex items-center justify-center font-bold text-xl shadow-sm active:scale-95">+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          MENU_DATA.filter(c => activeCategory === "전체" || activeCategory === c.category).map((category) => (
            <section key={category.category}>
              <h2 className="text-2xl font-black text-gray-800 mb-5 px-2 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-6 bg-yonsei rounded-full"></span>
                {category.category}
              </h2>
              <div className="space-y-4">
                {category.items.map((item) => {
                  const itemCartEntries = cartItems.filter(c => c.id === item.id);
                  const totalQuantity = itemCartEntries.reduce((sum, c) => sum + c.quantity, 0);

                  return (
                    <div key={item.id} className="bg-white/80 backdrop-blur-md p-4 rounded-[1.5rem] shadow-sm border border-white flex gap-4 transition-all hover:shadow-md relative overflow-hidden group">
                      <div className="w-28 h-28 shrink-0 bg-slate-100/80 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-gray-400 relative overflow-hidden group-hover:border-blue-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <span className="text-[10px] font-bold tracking-wider">사진 준비중</span>
                      </div>

                      <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg leading-snug tracking-tight">{item.name}</h3>
                          {item.originalName && (
                            <p className="text-xs text-gray-400 font-bold mt-0.5">{item.originalName}</p>
                          )}
                          <p className="text-yonsei font-black mt-1.5 text-lg">
                            {item.options ? `${item.price.toLocaleString()}원~` : `${item.price.toLocaleString()}원`}
                          </p>
                        </div>
                        
                        <div className="flex justify-end mt-2">
                          {item.options ? (
                            <button
                              onClick={() => openOptionModal(item)}
                              className="px-4 py-2.5 bg-yonsei/10 text-yonsei border border-yonsei/20 rounded-xl font-bold active:bg-yonsei/20 transition text-sm flex items-center gap-1 shadow-sm"
                            >
                              옵션 선택 {totalQuantity > 0 && <span className="bg-yonsei text-white px-2 py-0.5 rounded-full text-xs ml-1 font-black">{totalQuantity}</span>}
                            </button>
                          ) : (
                            <div className="flex items-center gap-3">
                              {totalQuantity > 0 ? (
                                <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
                                  <button
                                    onClick={() => decrementCartItem(item.id)}
                                    className="w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center font-bold text-xl active:bg-slate-200 transition shadow-sm"
                                  >
                                    -
                                  </button>
                                  <span className="font-black w-8 text-center text-lg text-gray-800">{totalQuantity}</span>
                                  <button
                                    onClick={() => incrementCartItem(item.id)}
                                    className="w-8 h-8 rounded-full bg-yonsei text-white flex items-center justify-center font-bold text-xl active:bg-yonsei-light transition shadow-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCartBase(item)}
                                  className="px-5 py-2.5 bg-slate-100 text-gray-700 rounded-xl font-bold active:bg-slate-200 transition text-sm border border-slate-200 shadow-sm hover:bg-slate-200"
                                >
                                  담기
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Option Selection Modal */}
      {optionModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-3xl p-6 pb-8 shadow-2xl animate-slideUp">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{optionModalItem.name}</h3>
                {optionModalItem.originalName && (
                  <p className="text-sm text-gray-400 font-bold mt-1">{optionModalItem.originalName}</p>
                )}
              </div>
              <button onClick={() => setOptionModalItem(null)} className="p-2 bg-slate-100 rounded-full text-gray-500 hover:bg-slate-200 transition">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-800 font-black mb-3 text-lg">어떤 맛으로 준비해 드릴까요? <span className="bg-red-100 text-red-500 text-[10px] px-2 py-0.5 rounded-sm ml-1 align-middle">필수</span></p>
              <div className="space-y-2">
                {optionModalItem.options.map(opt => (
                  <div 
                    key={opt.name} 
                    onClick={() => setSelectedOption(opt)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedOption?.name === opt.name ? 'border-yonsei bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <span className={`font-bold text-lg flex items-center gap-2 ${selectedOption?.name === opt.name ? 'text-yonsei' : 'text-gray-700'}`}>
                      {opt.name} 
                      {opt.price > optionModalItem.options[0].price && (
                        <span className="text-sm bg-white border border-gray-100 px-2 py-0.5 rounded-lg shadow-sm text-gray-500">
                          +{(opt.price - optionModalItem.options[0].price).toLocaleString()}원
                        </span>
                      )}
                    </span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedOption?.name === opt.name ? 'border-yonsei' : 'border-gray-300'}`}>
                      {selectedOption?.name === opt.name && <div className="w-3 h-3 bg-yonsei rounded-full"></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-gray-600">수량</span>
              <div className="flex items-center bg-white rounded-full p-1 border border-slate-200 shadow-sm">
                <button onClick={() => setOptionQuantity(Math.max(1, optionQuantity - 1))} className="w-10 h-10 rounded-full bg-white text-gray-700 flex items-center justify-center font-bold text-2xl active:bg-slate-100 transition">-</button>
                <span className="font-black w-12 text-center text-xl">{optionQuantity}</span>
                <button onClick={() => setOptionQuantity(optionQuantity + 1)} className="w-10 h-10 rounded-full bg-white text-gray-700 flex items-center justify-center font-bold text-2xl active:bg-slate-100 transition">+</button>
              </div>
            </div>

            <button 
              onClick={confirmOptionSelection}
              className="w-full bg-gradient-to-r from-yonsei to-blue-700 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
            >
              {((selectedOption?.price || optionModalItem.price) * optionQuantity).toLocaleString()}원 담기
            </button>
          </div>
        </div>
      )}

      {totalAmount > 0 && !optionModalItem && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-xl border-t border-white shadow-[0_-15px_30px_-10px_rgba(0,0,0,0.1)] z-20 max-w-md mx-auto rounded-t-[2rem]">
          <div className="flex justify-between items-end mb-4 px-3">
            <span className="text-gray-500 font-bold mb-1">총 주문 금액</span>
            <span className="text-3xl font-black text-yonsei tracking-tight">{totalAmount.toLocaleString()}<span className="text-lg font-bold ml-1">원</span></span>
          </div>
          <button
            onClick={() => {
              if (activeCategory !== "장바구니") {
                setActiveCategory("장바구니");
              } else {
                setIsPaying(true);
              }
            }}
            className="w-full bg-gradient-to-r from-yonsei to-blue-700 text-white py-4 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
          >
            {activeCategory === "장바구니" ? "결제 진행하기" : "주문하기"}
          </button>
        </div>
      )}
    </div>
  );
}
