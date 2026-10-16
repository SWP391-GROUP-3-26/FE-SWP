import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import * as jsxDev from 'react/jsx-dev-runtime'
import * as router from 'react-router-dom'

// Share native React instances with SSR tests; Vite's Windows evaluator cannot run their CommonJS entrypoints.
globalThis.__ssrTestDependencies = { react, 'react/jsx-runtime': jsx, 'react/jsx-dev-runtime': jsxDev, 'react-router-dom': router }
export default {
  name: 'native-react-test-dependencies', enforce: 'pre',
  resolveId(source) {
    if (source in globalThis.__ssrTestDependencies) return '\0native-test:' + source
  },
  load(id) {
    if (!id.startsWith('\0native-test:')) return
    const source = id.slice('\0native-test:'.length)
    const expression = `globalThis.__ssrTestDependencies[${JSON.stringify(source)}]`
    return Object.keys(globalThis.__ssrTestDependencies[source]).filter((key) => key !== 'default' && /^[A-Za-z_$][\w$]*$/.test(key))
      .map((key) => `export const ${key} = ${expression}[${JSON.stringify(key)}];`).join('\n')
      + `\nexport default ${expression}.default ?? ${expression};`
  },
}
