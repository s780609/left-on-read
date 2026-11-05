"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#14142a] p-6 text-center text-[#f6f1de]">
      <h1 className="text-3xl font-bold">沒有網路</h1>
      <p className="text-[#a9abc9]">訊息送不出去。至少這次不是她的問題。</p>
      <button
        onClick={() => window.location.reload()}
        className="border-[3px] border-black bg-[#3f6fb5] px-8 py-3 font-bold shadow-[4px_4px_0_#000]"
      >
        再試一次
      </button>
    </div>
  );
}
