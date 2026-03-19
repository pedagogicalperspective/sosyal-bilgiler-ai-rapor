import { useRef, useState, ChangeEvent } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Printer,
  Target
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface AnalysisData {
  studentInfo: {
    name: string;
    week: string;
    date: string;
    theme: string;
  };
  alerts: string[];
  scores: {
    B1: number;
    B2: number;
    B3: number;
    B4: number;
    B5: number;
  };
  totalScore: number;
  degree: string;
  aiContribution: number;
  promptAnalysis: {
    original: string;
    hasFourElements: boolean;
    suggested: string;
  };
}

const App = () => {
  const [report, setReport] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target?.result;
        if (!buffer || !(buffer instanceof ArrayBuffer)) return;
        
        const typedarray = new Uint8Array(buffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items
            .map((item: any) => item.str || '')
            .join(' ');
        }

        generateAnalysis(fullText, file.name);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("PDF Parsing Error:", error);
      alert("PDF dosyası okunamadı. Lütfen geçerli bir dosya yükleyin.");
      setLoading(false);
    }
  };

  const generateAnalysis = (text: string, originalFileName: string) => {
    const hasSocialBiz = text.toLowerCase().includes('sosyalbilgiler.biz');
    const hasYouTube = text.toLowerCase().includes('youtube.com') || text.toLowerCase().includes('youtube.be');
    const aiContributionMatch = text.match(/Katkı Oranı:\s*%(\d+)/i);
    const aiContribution = aiContributionMatch ? parseInt(aiContributionMatch[1]) : 0;
    const hasNameInFileName = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/.test(originalFileName);

    const scores = {
      B1: aiContribution === 0 ? 5 : (aiContribution > 75 ? 6 : (aiContribution >= 26 && aiContribution <= 50 ? 10 : 8)),
      B2: (hasSocialBiz || hasYouTube) ? 4 : 8,
      B3: text.toLowerCase().includes('neden yz') ? 9 : 6,
      B4: text.includes('SB.') ? 10 : 5,
      B5: text.length > 300 ? 7 : 4
    };

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    
    let degree = "BAŞLANGIÇ";
    if (totalScore >= 44) degree = "PEKİYİ";
    else if (totalScore >= 36) degree = "İYİ";
    else if (totalScore >= 26) degree = "GELİŞMEKTE";
    else if (totalScore >= 16) degree = "TEMEL";

    const alerts: string[] = [];
    if (aiContribution === 0) alerts.push("YZ Kullanımı 'Yok' olarak beyan edilmiş. Ders amacına (YZ entegrasyonu) tam uyum sağlanamadı.");
    if (hasSocialBiz || hasYouTube) alerts.push("Akademik olmayan kaynak kullanımı tespit edildi (sosyalbilgiler.biz / YouTube).");
    if (hasNameInFileName) alerts.push("Dosya adında kişisel veri (isim-soyisim) kullanımı tespit edildi. Etik gizlilik ihlali.");
    if (aiContribution > 75) alerts.push("Pedagojik rolün %76+ oranında YZ'ye devri tespit edildi (Bayir Modeli uyarısı).");
    if (!text.includes('SB.')) alerts.push("Kazanım kodu (SB.X.X.X) eksik. YZ denetimi zorlaşmaktadır.");

    const analysisData: AnalysisData = {
      studentInfo: {
        name: originalFileName.split('_')[1] || "Öğrenci Kaydı",
        week: "Hafta 4",
        date: new Date().toLocaleDateString('tr-TR'),
        theme: originalFileName.split('_')[2]?.replace('.pdf', '') || "Dijital Materyal"
      },
      alerts,
      scores,
      totalScore,
      degree,
      aiContribution,
      promptAnalysis: {
        original: text.slice(0, 150) + "...",
        hasFourElements: text.toLowerCase().includes('sınıf') && text.includes('SB.') && (text.toLowerCase().includes('bulmaca') || text.toLowerCase().includes('materyal')),
        suggested: "6. sınıf Sosyal Bilgiler SB.6.3.2 kazanımı için İslam medeniyetinin bilim ve sanat alanındaki katkılarını içeren, 12 soruluk, sade Türkçe ile hazırlanmış bir Crossword Labs bulmacası içeriği oluştur."
      }
    };

    setTimeout(() => {
      setReport(analysisData);
      setLoading(false);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-[#1F4E79]">GERİ DÖNÜT RAPORU v2</h1>
            <p className="text-gray-500 text-sm">Doç. Dr. Erhan Yaylak | Form Analiz Sistemi</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#2E74B5] text-white px-5 py-2.5 rounded-lg hover:bg-[#1F4E79] transition-all shadow-md active:scale-95"
            >
              <Upload size={18} />
              PDF Formu Yükle
            </button>
            {report && (
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-all shadow-sm"
              >
                <Printer size={18} />
                Raporu Al
              </button>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".pdf" 
            className="hidden" 
          />
        </header>

        {!report && !loading && (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 md:p-24 text-center shadow-sm">
            <div className="bg-[#EBF3FB] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <FileText size={48} className="text-[#2E74B5]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Değerlendirme Raporu Oluşturun</h2>
            <p className="text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">
              Öğretmen adayları tarafından doldurulan Dijital Öğrenme Ürünü Hazırlama Formu'nu (PDF) buraya yükleyerek etik ve pedagojik analizi başlatın.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <span>Etik Denetim</span>
              <span>•</span>
              <span>Kazanım Uyumu</span>
              <span>•</span>
              <span>Prompt Analizi</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="py-32 text-center animate-pulse">
            <div className="w-16 h-16 border-4 border-[#2E74B5] border-t-transparent rounded-full mx-auto mb-6 animate-spin"></div>
            <p className="text-xl font-bold text-slate-700">Form Verileri İşleniyor</p>
            <p className="text-slate-400 mt-2">YZ Etik Çerçevesi Uygulanıyor...</p>
          </div>
        )}

        {report && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* 1. Başlık Tablosu */}
            <div className="grid grid-cols-1 md:grid-cols-3 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-black tracking-tighter mb-1">Aday Bilgisi</span>
                <span className="font-bold text-slate-800 text-lg uppercase">{report.studentInfo.name}</span>
              </div>
              <div className="p-5 border-b md:border-b-0 md:border-r border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-black tracking-tighter mb-1">Ders İçeriği</span>
                <span className="font-bold text-slate-700">{report.studentInfo.week} - {report.studentInfo.theme}</span>
              </div>
              <div className="p-5 bg-[#1F4E79] text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] opacity-70 block uppercase font-black tracking-tighter mb-1">Değerlendirme</span>
                  <span className="font-bold">{report.studentInfo.date}</span>
                </div>
                <div className="bg-white/10 p-2.5 rounded-lg border border-white/20">
                  <ShieldCheck size={24} />
                </div>
              </div>
            </div>

            {/* 2. Etik Çerçeve Kutusu */}
            <div className="bg-[#F3EEF9] border-l-8 border-[#5B3C8C] p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-[#5B3C8C]">
                <ShieldCheck size={24} className="fill-[#5B3C8C]/20" />
                <h3 className="font-black text-sm tracking-widest uppercase">Etik Değerlendirme İlkeleri</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-bold text-[#5B3C8C]/80">
                <div className="flex items-start gap-2 bg-white/40 p-2 rounded">
                  <span className="text-lg leading-none">01</span>
                  <span>Şeffaf Beyan & Link Paylaşımı</span>
                </div>
                <div className="flex items-start gap-2 bg-white/40 p-2 rounded">
                  <span className="text-lg leading-none">02</span>
                  <span>Sorumlu Entegrasyon (%26-50)</span>
                </div>
                <div className="flex items-start gap-2 bg-white/40 p-2 rounded">
                  <span className="text-lg leading-none">03</span>
                  <span>Akademik Kaynak Doğrulaması</span>
                </div>
                <div className="flex items-start gap-2 bg-white/40 p-2 rounded">
                  <span className="text-lg leading-none">04</span>
                  <span>Öğretmenin Pedagojik Liderliği</span>
                </div>
              </div>
            </div>

            {/* 3. Özel Durum Uyarı Kutusu */}
            {report.alerts.length > 0 && (
              <div className="bg-[#FFF0F0] border-l-8 border-[#C0392B] p-6 rounded-xl shadow-sm">
                <div className="flex items-center gap-3 mb-3 text-[#C0392B]">
                  <AlertTriangle size={24} className="animate-pulse" />
                  <h3 className="font-black text-sm tracking-widest uppercase">Kritik Gelişim Alanları</h3>
                </div>
                <ul className="space-y-2">
                  {report.alerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#C0392B] font-medium leading-tight">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#C0392B] shrink-0" />
                      {alert}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. Dashboard Grid */}
            <div className="grid md:grid-cols-12 gap-6">
              {/* Radar Chart */}
              <div className="md:col-span-7 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-slate-800 font-black text-xs tracking-[0.2em] uppercase">Boyut Bazlı Analiz</h3>
                  <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-slate-100 uppercase">Veri Görselleştirme</div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                      { subject: 'YZ Kullanımı', A: report.scores.B1 },
                      { subject: 'Doğrulama', A: report.scores.B2 },
                      { subject: 'Pedagoji', A: report.scores.B3 },
                      { subject: 'Kazanım', A: report.scores.B4 },
                      { subject: 'Prompt', A: report.scores.B5 },
                    ]}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar
                        name="Puan"
                        dataKey="A"
                        stroke="#2E74B5"
                        fill="#2E74B5"
                        fillOpacity={0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Score and Summary */}
              <div className="md:col-span-5 space-y-6">
                <div className={`p-8 rounded-2xl shadow-xl relative overflow-hidden text-white ${
                  report.totalScore >= 36 ? 'bg-gradient-to-br from-[#1F4E79] to-[#2E74B5]' : 
                  report.totalScore >= 26 ? 'bg-gradient-to-br from-slate-700 to-slate-900' : 
                  'bg-gradient-to-br from-[#C0392B] to-[#962d22]'
                }`}>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Başarı Seviyesi</span>
                    <h2 className="text-5xl font-black mt-2 tracking-tighter">{report.degree}</h2>
                    <div className="mt-10 flex justify-between items-end border-t border-white/20 pt-6">
                      <div>
                        <span className="text-4xl font-black">{report.totalScore}</span>
                        <span className="text-lg opacity-50 ml-1">/ 50</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-bold opacity-60 uppercase mb-1">Genel Performans</span>
                        <div className="h-2 w-32 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full" 
                            style={{ width: `${(report.totalScore / 50) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Etik Katkı Oranı</h4>
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-black ${report.aiContribution > 75 ? 'text-[#C0392B]' : 'text-[#2E74B5]'}`}>
                      %{report.aiContribution}
                    </div>
                    <div className="text-xs text-slate-500 font-medium leading-snug border-l pl-4 border-slate-100">
                      {report.aiContribution === 0 ? 'Ders amacını karşılamıyor.' : 
                       report.aiContribution > 75 ? 'Pedagojik rol devredilmiş.' : 
                       'Etik ve dengeli bir YZ kullanımı.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Prompt Detay Analizi */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3 text-[#1F4E79]">
                  <Target size={22} />
                  <h3 className="font-black text-sm tracking-widest uppercase">B5: Prompt Mühendisliği Analizi</h3>
                </div>
                <div className="flex gap-2">
                   <div className={`w-3 h-3 rounded-full ${report.promptAnalysis.hasFourElements ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tespit Edilen Prompt</span>
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 italic text-sm text-slate-600 leading-relaxed">
                    "{report.promptAnalysis.original}"
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Badge label="Hedef Kitle" active={report.promptAnalysis.hasFourElements} />
                    <Badge label="Kazanım Kodu" active={report.scores.B4 >= 10} />
                    <Badge label="Format Tanımı" active={report.promptAnalysis.hasFourElements} />
                    <Badge label="Dil Kısıtı" active={report.promptAnalysis.hasFourElements} />
                  </div>
                </div>
                
                <div className="bg-[#EBF3FB] p-6 rounded-2xl border-l-8 border-[#2E74B5]">
                  <span className="text-[10px] font-black text-[#2E74B5] uppercase tracking-widest block mb-4 flex items-center gap-2">
                    <CheckCircle size={14} /> Akademik Prompt Önerisi
                  </span>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                    "{report.promptAnalysis.suggested}"
                  </p>
                  <div className="mt-6 flex gap-2">
                    <span className="bg-white/60 px-2 py-1 rounded text-[9px] font-bold text-[#2E74B5]">#SorumluYZ</span>
                    <span className="bg-white/60 px-2 py-1 rounded text-[9px] font-bold text-[#2E74B5]">#PedagojikGerekçe</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="text-center pt-12 pb-8 text-[10px] text-slate-400 border-t border-slate-100 uppercase tracking-[0.2em] space-y-2">
              <p>Doc. Dr. Erhan Yaylak | Sosyal Bilgiler Ogretiminde Bilisim Teknolojileri</p>
              <p>© 2025-2026 Form Analiz Raporu v2.0</p>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const Badge = ({ label, active }: { label: string; active: boolean }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${
    active 
      ? 'bg-green-50 border-green-200 text-green-700' 
      : 'bg-red-50 border-red-200 text-red-700'
  }`}>
    <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
    {label}
  </div>
);

export default App;
