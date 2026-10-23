import fs from 'node:fs'
import path from 'node:path'
const root = path.resolve('src')
const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']
const errors = []
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    )
}
for (const file of walk(root).filter((name) => /\.(ts|vue)$/.test(name))) {
  const source = path.relative(root, file).replaceAll('\\', '/').split('/')
  for (const match of fs
    .readFileSync(file, 'utf8')
    .matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
    const specifier = match[1]
    if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue
    const target = (
      specifier.startsWith('@/')
        ? specifier.slice(2)
        : path.relative(root, path.resolve(path.dirname(file), specifier))
    )
      .replaceAll('\\', '/')
      .split('/')
    const fromLayer = layers.indexOf(source[0]),
      toLayer = layers.indexOf(target[0])
    const sameSlice =
      source[0] === target[0] && (['app', 'shared'].includes(source[0]) || source[1] === target[1])
    if (toLayer < 0 || fromLayer < 0 || (!sameSlice && toLayer >= fromLayer))
      errors.push(`${path.relative(root, file)}: forbidden dependency ${specifier}`)
    if (
      !sameSlice &&
      !['app', 'shared'].includes(target[0]) &&
      target.length > 2
    )
      errors.push(`${path.relative(root, file)}: use slice public API: ${specifier}`)
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log('FSD boundaries: passed (layer direction, slice isolation, public APIs).')
