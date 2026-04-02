/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 主色：蓝紫渐变色系
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // 辅助色：紫色系
        accent: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        // 青蓝色系
        cyan: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        // 深色背景
        dark: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
      backgroundImage: {
        // 主渐变
        'gradient-primary': 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        'gradient-primary-hover': 'linear-gradient(135deg, #4F46E5, #7C3AED)',
        'gradient-accent': 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
        // 辉光效果
        'glow-primary': 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
        'glow-accent': 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        // 科技感网格背景
        'grid-pattern': 'linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)',
        'dark-grid-pattern': 'linear-gradient(rgba(99, 102, 241, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.06) 1px, transparent 1px)',
        // 渐变边框
        'border-gradient': 'linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(139, 92, 246, 0.5), rgba(6, 182, 212, 0.5))',
      },
      boxShadow: {
        // 辉光阴影
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.3)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.5)',
        'glow-accent-sm': '0 0 10px rgba(139, 92, 246, 0.3)',
        'glow-accent': '0 0 20px rgba(139, 92, 246, 0.4)',
        // 科技卡片阴影
        'tech-card': '0 0 1px rgba(99, 102, 241, 0.3), 0 4px 20px rgba(0, 0, 0, 0.1)',
        'dark-tech-card': '0 0 1px rgba(99, 102, 241, 0.5), 0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'gradient-flow': 'gradient-flow 3s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'border-rotate': 'border-rotate 4s linear infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'gradient-flow': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(99, 102, 241, 0.6)' },
        },
        'border-rotate': {
          '0%': { '--border-angle': '0deg' },
          '100%': { '--border-angle': '360deg' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}