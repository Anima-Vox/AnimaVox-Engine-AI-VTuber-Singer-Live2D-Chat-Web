/** @type {import('tailwindcss').Config} */

/** 中文无衬线：Windows 用微软雅黑 UI，macOS 用苹方，Linux 用思源黑体 */
const SANS = [
  '"PingFang SC"',
  '"HarmonyOS Sans SC"',
  '"MiSans"',
  '"Microsoft YaHei UI"',
  '"Microsoft YaHei"',
  '"Noto Sans SC"',
  '"Noto Sans CJK SC"',
  'system-ui',
  'sans-serif',
];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深色：菜单栏、头像
        night: {
          DEFAULT: '#16213A',
          raised: '#1F2C4C',
          line: '#2E3D63',
          text: '#E9EEFB',
          muted: '#9AA8C7',
        },
        // 对话区：偏蓝的中性色（参考 deepseek-harness 的 neutral-bluish）
        ink: '#1B2438',
        haze: '#5D6984',
        mist: {
          DEFAULT: '#EEF2F9',
          deep: '#DFE6F4',
        },
        // 主色：信号蓝（参考 AIRI 默认色相 220 与 DeepSeek 蓝）
        signal: {
          DEFAULT: '#3D63E8',
          deep: '#2C4FCF',
          soft: '#E0E8FD',
        },
        dusk: '#8F7DF0',
        glow: '#62C6F0',
        alert: {
          DEFAULT: '#B4382F',
          soft: '#FBEDEB',
        },
      },
      fontFamily: {
        sans: SANS,
        // 角色说的话用霞鹜文楷：一眼就能分出是谁在说话
        voice: ['"LXGW WenKai"', ...SANS],
      },
      keyframes: {
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-0.3rem)', opacity: '1' },
        },
      },
      animation: {
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
