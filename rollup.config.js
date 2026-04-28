import typescript from '@rollup/plugin-typescript';

const tsconfig = process.env.TSCONFIG_PATH || './tsconfig.json'

// 构建模式：full 或 lite (通过 BUILD_MODE 环境变量控制)
const buildMode = process.env.BUILD_MODE || 'all' // 'all' | 'full' | 'lite'

/**
 * @param {string} dir
 * @param {string} mode
 */
const createFullConfig = (dir) => ({
  input: 'src/creep.ts',
  output: {
    file: `${dir}/creep-full.js`,
    format: 'iife',
    sourcemap: false,
    name: 'CreepJS',
  },
  plugins: [
    typescript({
      tsconfig,
      compilerOptions: {
        outDir: `./${dir}`,
      },
    }),
  ],
})

const createLiteConfig = (dir) => ({
  input: 'src/creep-lite.ts',
  output: {
    file: `${dir}/creep-lite.js`,
    format: 'iife',
    sourcemap: false,
    name: 'CreepJSLite',
  },
  plugins: [
    typescript({
      tsconfig,
      compilerOptions: {
        outDir: `./${dir}`,
      },
    }),
  ],
})

// 根据构建模式生成配置
const configs = []
if (buildMode === 'all' || buildMode === 'full') {
  configs.push(createFullConfig('public'))
  configs.push(createFullConfig('docs'))
}
if (buildMode === 'all' || buildMode === 'lite') {
  configs.push(createLiteConfig('public'))
  configs.push(createLiteConfig('docs'))
}

export default configs
