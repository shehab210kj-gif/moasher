import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, Bot, Sparkles } from 'lucide-react';
import { askAgent } from '../services/modelApi';
import { useI18n } from '../lib/i18n';

interface Message {
  role: 'user' | 'agent';
  content: string;
}

export function RealEstateAgentChat({ report }: { report: any }) {
  const { dir } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: `أهلاً بك! أنا الوكيل العقاري الذكي لمنصة مؤشر. لقد قمت بتحليل تقرير العقار في حي ${report.neighborhood} بمساحة ${report.area} م2. كيف يمكنني مساعدتك اليوم في التفاوض أو فهم التقييم؟`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      const response = await askAgent(report, text, historyPayload);
      setMessages((prev) => [...prev, { role: 'agent', content: response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          content: 'عذراً، حدث خطأ أثناء الاتصال بالوكيل العقاري. يرجى التأكد من تشغيل خادم API والبيئات المناسبة.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const starterPrompts = [
    {
      label: 'لماذا قرار التوصية؟',
      text: `لماذا قرار التوصية في التقرير هو "${report.summary?.recommendation || report.valuation?.recommendation || 'تجنب (Avoid)'}"؟`,
    },
    {
      label: 'معدل النمو والتوقع',
      text: `ما هو تفصيل التوقع المستقبلي لهذا العقار بعد سنة؟ وكم يبلغ معدل نمو حي ${report.neighborhood}؟`,
    },
    {
      label: 'استراتيجية التفاوض',
      text: `اعطني خطة عملية للمفاوضة مع البائع إذا كان يطلب ${report.valuation?.asking_price || report.valuation?.total_current_price} ريال.`,
    },
    {
      label: 'الجدوى والاشتراطات',
      text: `ما هي الخلاصة لاشتراطات البناء في حي ${report.neighborhood} وما هي نسبة العائد ROI المتوقعة؟`,
    },
  ];

  const isRtl = dir === 'rtl';

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden" dir={dir}>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-slate-950 px-5 py-4 font-black text-white shadow-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Sparkles className="animate-pulse text-amber-400" size={18} />
          <span>اسأل الوكيل العقاري الذكي</span>
          <MessageSquare size={18} />
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="flex h-[550px] w-[400px] flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 md:w-[450px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-950 p-4 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-slate-950 font-black">
                <Bot size={18} />
              </span>
              <div>
                <h3 className="text-sm font-black">الوكيل العقاري الذكي (AI Agent)</h3>
                <p className="text-[10px] text-slate-400 font-bold">مستشار قراراتك العقارية المتوافق مع TAQEEM</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? (isRtl ? 'mr-auto flex-row-reverse' : 'ml-auto') : ''
                }`}
              >
                {msg.role === 'agent' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                    <Bot size={15} />
                  </div>
                )}
                <div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold leading-6 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-950 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[80%]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                  <Bot size={15} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-100 px-4 py-2.5 shadow-sm text-sm text-slate-500 font-bold">
                  <Loader2 className="animate-spin text-amber-500" size={16} />
                  <span>الوكيل يحلل البيانات ويصيغ الرد...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick starter prompts */}
          {messages.length === 1 && (
            <div className="bg-slate-50 px-4 pb-2 border-t border-slate-100">
              <div className="text-[10px] font-black text-slate-400 mb-2 uppercase">أسئلة مقترحة للتقرير:</div>
              <div className="flex flex-wrap gap-2">
                {starterPrompts.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(chip.text)}
                    className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input */}
          <div className="border-t border-slate-100 p-3 bg-white rounded-b-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="اسألني أي شيء عن العقار والتقرير..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold placeholder:text-slate-400 focus:border-slate-950 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
              >
                <Send size={16} className={isRtl ? 'rotate-180' : ''} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
