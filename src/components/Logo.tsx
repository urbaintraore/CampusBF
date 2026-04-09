import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16',
  };

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  return (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      <div className={cn(
        "relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
        sizeClasses[size]
      )}>
        {/* Background Shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 rounded-xl shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400/50 transform rotate-3 group-hover:rotate-6 transition-transform" />
        
        {/* Main SVG Icon */}
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="relative z-10 w-3/4 h-3/4 text-white drop-shadow-md"
        >
          {/* Graduation Cap Base */}
          <path 
            d="M22 10L12 5L2 10L12 15L22 10Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          <path 
            d="M6 12V17C6 17 8 19 12 19C16 19 18 17 18 17V12" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Tassel */}
          <path 
            d="M22 10V15" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* The "C" for Campus */}
          <path 
            d="M10 12C10 12 11 13 12 13C13 13 14 12 14 12" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
          />
          {/* Small Star (BF Flag reference) */}
          <path 
            d="M12 8.5L12.5 10L14 10.2L13 11.2L13.2 12.5L12 11.8L10.8 12.5L11 11.2L10 10.2L11.5 10L12 8.5Z" 
            fill="#FACC15" 
            className="animate-pulse"
          />
        </svg>

        {/* Decorative elements */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow-sm" />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn(
            "font-display font-black tracking-tighter text-slate-900",
            textClasses[size]
          )}>
            Campus<span className="text-emerald-600">BF</span>
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
            L'excellence étudiante
          </span>
        </div>
      )}
    </div>
  );
}
