import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, LayoutDashboard } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12 sm:py-20 flex flex-col items-center justify-center text-center animate-in fade-in duration-200 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#FAF6EE] border border-[#ECE5DA] text-[#5B1924] flex items-center justify-center mb-5 shadow-xs">
        <AlertCircle size={30} />
      </div>

      <span className="text-[11px] font-bold uppercase tracking-widest text-[#8C8379] mb-1">
        Error 404
      </span>

      <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1817]">
        Page Not{' '}
        <span className="font-cursive text-[1.25em] text-[#5B1924] font-normal leading-none inline-block px-1 align-baseline">
          Found
        </span>
      </h1>

      <p className="text-xs sm:text-sm text-[#5E564E] mt-2 mb-6 leading-relaxed">
        The route you are looking for does not exist or may have been moved.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-full bg-[#FAF6EE] border border-[#ECE5DA] text-xs font-semibold text-[#1C1817] hover:bg-[#F2ECE1] transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          <span>Go Back</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2 rounded-full bg-[#5B1924] text-[#FDFBF7] text-xs font-semibold hover:bg-[#48131C] active:scale-[0.98] transition-all shadow-md shadow-[#5B1924]/15 cursor-pointer flex items-center gap-1.5"
        >
          <LayoutDashboard size={13} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
