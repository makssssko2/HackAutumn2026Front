import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'

const layers = ['shared', 'entities', 'features', 'widgets', 'pages', 'app']
const normalize = (value) => value.replaceAll('\\', '/')
function typeOnly(node) {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause
    return (
      !!clause &&
      (clause.isTypeOnly ||
        (!clause.name &&
          clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.length > 0 &&
          clause.namedBindings.elements.every((item) => item.isTypeOnly)))
    )
  }
  return (
    node.isTypeOnly ||
    (node.exportClause &&
      ts.isNamedExports(node.exportClause) &&
      node.exportClause.elements.length > 0 &&
      node.exportClause.elements.every((item) => item.isTypeOnly))
  )
}
function walk(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    )
}
function imports(file) {
  const content = fs.readFileSync(file, 'utf8')
  const descriptor = file.endsWith('.vue') ? parse(content, { filename: file }).descriptor : null
  const blocks = descriptor
    ? [descriptor.script, descriptor.scriptSetup].filter(Boolean).map((block) => block.content)
    : [content]
  const dependencies = []
  for (const block of blocks) {
    const ast = ts.createSourceFile(file + '.ts', block, ts.ScriptTarget.Latest, true)
    function visit(node) {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      )
        dependencies.push({
          specifier: node.moduleSpecifier.text,
          typeOnly: typeOnly(node),
          wildcard: ts.isExportDeclaration(node) && !node.exportClause,
        })
      else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
        dependencies.push({
          specifier:
            node.arguments.length >= 1 && ts.isStringLiteralLike(node.arguments[0])
              ? node.arguments[0].text
              : null,
        })
      else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        dependencies.push({ specifier: node.argument.literal.text, typeOnly: true })
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  return dependencies
}
export function checkArchitecture(sourceRoot) {
  const root = path.resolve(sourceRoot),
    errors = []
  const files = walk(root).filter((file) => /\.(?:[cm]?[jt]sx?|vue)$/.test(file))
  const graph = new Map(files.map((file) => [file, []]))
  function resolve(file, specifier) {
    const base = specifier.startsWith('@/')
      ? path.join(root, specifier.slice(2))
      : path.resolve(path.dirname(file), specifier)
    return [
      base,
      ...['.ts', '.tsx', '.js', '.vue', '.css'].map((extension) => base + extension),
      path.join(base, 'index.ts'),
    ].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  }
  for (const layer of fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())) {
    if (!layers.includes(layer.name)) errors.push(`Unknown FSD layer: ${layer.name}`)
    else if (!['app', 'shared'].includes(layer.name))
      for (const slice of fs.readdirSync(path.join(root, layer.name), { withFileTypes: true }))
        if (
          !slice.isDirectory() ||
          !fs.existsSync(path.join(root, layer.name, slice.name, 'index.ts'))
        )
          errors.push(`${layer.name}/${slice.name}: slice must expose index.ts`)
  }
  for (const file of files) {
    const relative = normalize(path.relative(root, file)),
      source = relative.split('/')
    const from = layers.indexOf(source[0])
    if (from < 0) errors.push(`${relative}: source must belong to a known layer`)
    for (const { specifier, typeOnly, wildcard } of imports(file)) {
      if (wildcard && path.basename(file) === 'index.ts')
        errors.push(`${relative}: public API must use explicit exports`)
      if (specifier === null) {
        errors.push(`${relative}: dynamic imports must use a literal path`)
        continue
      }
      if (!specifier.startsWith('@/') && !specifier.startsWith('.')) continue
      const targetFile = resolve(file, specifier)
      if (!targetFile) {
        errors.push(`${relative}: unresolved import ${specifier}`)
        continue
      }
      const target = normalize(path.relative(root, targetFile)).split('/')
      const to = layers.indexOf(target[0])
      const sameSlice =
        source[0] === target[0] &&
        (['app', 'shared'].includes(source[0]) || source[1] === target[1])
      if (to < 0 || from < 0 || (!sameSlice && to >= from))
        errors.push(`${relative}: forbidden dependency ${specifier}`)
      const publicApi = path.join(root, target[0], target[1] || '', 'index.ts')
      if (!sameSlice && target[0] !== 'app' && targetFile !== publicApi)
        errors.push(`${relative}: use public API: ${specifier}`)
      if (sameSlice && file !== publicApi && targetFile === publicApi && source[1] === target[1])
        errors.push(`${relative}: do not import your own public API: ${specifier}`)
      if (!typeOnly && graph.has(targetFile)) graph.get(file).push(targetFile)
    }
  }
  const visiting = new Set(),
    visited = new Set()
  function visit(file, stack = []) {
    if (visiting.has(file)) {
      errors.push(
        `Circular dependency: ${[...stack.slice(stack.indexOf(file)), file].map((item) => normalize(path.relative(root, item))).join(' -> ')}`,
      )
      return
    }
    if (visited.has(file)) return
    visiting.add(file)
    for (const target of graph.get(file) || []) visit(target, [...stack, file])
    visiting.delete(file)
    visited.add(file)
  }
  for (const file of files) visit(file)
  return [...new Set(errors)]
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = checkArchitecture(path.resolve('src'))
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else
    console.log(
      'FSD boundaries passed: layers, slices, public APIs, resolved imports and dependency cycles.',
    )
}
