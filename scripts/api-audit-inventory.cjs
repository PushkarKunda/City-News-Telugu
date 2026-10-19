/* eslint-env node */
'use strict';

/**
 * Static, read-only API inventory.
 *
 * This module deliberately reads source text only.  It does not import the
 * application, evaluate route functions, load environment files, or make
 * network requests.  TypeScript is already a project dev dependency and is
 * used as a parser; no package dependency is added by this script.
 */

const fs = require('node:fs');
const path = require('node:path');

let ts;
try {
  // eslint-disable-next-line global-require
  ts = require('typescript');
} catch (error) {
  throw new Error(
    'api-audit-inventory.cjs requires the project\'s installed TypeScript parser.',
    { cause: error }
  );
}

const repoRoot = path.resolve(__dirname, '..');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs']);
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.git_disabled',
  '.expo',
  '.idea',
  '.vscode',
  '.claude',
  // The checked-out backend (including its separate admin portal) is not part
  // of this frontend's runtime API surface. It also contains backend-local
  // configuration that must never enter a frontend audit inventory.
  'backend',
  'node_modules',
  'dist',
  'build',
]);
const HTTP_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE',
  'CONNECT',
]);

function normalizeRoot(root) {
  return path.resolve(root || repoRoot);
}

function slash(value) {
  return value.split(path.sep).join('/');
}

function relativeFile(root, filename) {
  return slash(path.relative(root, filename));
}

function sourceFileName(root, filename, line) {
  return `${relativeFile(root, filename)}:${line}`;
}

function readSourceFiles(root) {
  const files = [];

  function visit(directory) {
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) visit(path.join(directory, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        files.push(path.join(directory, entry.name));
      }
    }
  }

  visit(root);
  return files.sort();
}

function parseSource(filename, text) {
  const extension = path.extname(filename).toLowerCase();
  const scriptKind = extension === '.tsx'
    ? ts.ScriptKind.TSX
    : extension === '.ts'
      ? ts.ScriptKind.TS
    : extension === '.jsx'
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.JS;
  return ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true, scriptKind);
}

function unwrap(node) {
  let current = node;
  while (current && (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  )) {
    current = current.expression;
  }
  return current;
}

function nodeText(node, sourceFile) {
  return node ? node.getText(sourceFile) : null;
}

function nodeLine(node, sourceFile) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function propertyName(node, sourceFile) {
  if (!node || !node.name) return null;
  const name = node.name;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return nodeText(name, sourceFile);
}

function literalValue(node) {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  return undefined;
}

function getProperty(objectLiteral, name, sourceFile) {
  if (!objectLiteral || !ts.isObjectLiteralExpression(objectLiteral)) return null;
  for (const property of objectLiteral.properties) {
    if (propertyName(property, sourceFile) === name) return property;
  }
  return null;
}

function propertyValue(property) {
  if (!property) return null;
  if (ts.isPropertyAssignment(property)) return unwrap(property.initializer);
  if (ts.isShorthandPropertyAssignment(property)) return property.name;
  return null;
}

function routeReference(node, sourceFile) {
  let current = unwrap(node);
  if (current && ts.isCallExpression(current)) current = unwrap(current.expression);
  if (!current) return null;

  const parts = [];
  while (current && ts.isPropertyAccessExpression(current)) {
    parts.unshift(current.name.text);
    current = unwrap(current.expression);
  }
  if (current && ts.isIdentifier(current) && current.text === 'API_ROUTES' && parts.length) {
    return parts.join('.');
  }

  if (current && ts.isElementAccessExpression(current)) {
    const argument = literalValue(current.argumentExpression);
    if (argument !== undefined) parts.unshift(String(argument));
    current = unwrap(current.expression);
    while (current && ts.isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
      current = unwrap(current.expression);
    }
    if (current && ts.isIdentifier(current) && current.text === 'API_ROUTES' && parts.length) {
      return parts.join('.');
    }
  }

  return null;
}

function findRouteReference(node, sourceFile) {
  let found = null;
  function visit(current) {
    if (found || !current) return;
    const direct = routeReference(current, sourceFile);
    if (direct) {
      found = direct;
      return;
    }
    ts.forEachChild(current, visit);
  }
  visit(node);
  return found;
}

function interpolationName(node, sourceFile, index) {
  let current = unwrap(node);
  if (current && ts.isCallExpression(current)) {
    const callee = nodeText(current.expression, sourceFile);
    if (callee === 'encodeURIComponent' && current.arguments.length) {
      current = unwrap(current.arguments[0]);
    }
  }
  if (current && ts.isIdentifier(current)) return current.text;
  if (current && ts.isPropertyAccessExpression(current)) return current.name.text;
  const text = nodeText(current, sourceFile);
  return text ? text.replace(/[^A-Za-z0-9_$]/g, '_') : `param${index + 1}`;
}

function isBaseExpression(node, sourceFile) {
  const text = nodeText(unwrap(node), sourceFile) || '';
  return /(?:^|\.)API_BASE$/.test(text) || /(?:^|\.)baseUrl$/.test(text);
}

function renderTemplatePath(node, sourceFile, omitBase = false) {
  const current = unwrap(node);
  if (!current) return null;
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return current.text;
  }
  if (!ts.isTemplateExpression(current)) return null;

  let result = current.head.text;
  current.templateSpans.forEach((span, index) => {
    if (!(omitBase && index === 0 && isBaseExpression(span.expression, sourceFile))) {
      result += `{${interpolationName(span.expression, sourceFile, index)}}`;
    }
    result += span.literal.text;
  });
  return result;
}

function renderPathExpression(node, sourceFile) {
  const current = unwrap(node);
  const direct = renderTemplatePath(current, sourceFile, true);
  if (direct !== null) return direct;
  if (current && (ts.isArrowFunction(current) || ts.isFunctionExpression(current))) {
    if (current.body && !ts.isBlock(current.body)) {
      return renderPathExpression(current.body, sourceFile);
    }
    if (current.body && ts.isBlock(current.body)) {
      for (const statement of current.body.statements) {
        if (ts.isReturnStatement(statement)) {
          return renderPathExpression(statement.expression, sourceFile);
        }
      }
    }
    return null;
  }
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const leftRoute = findRouteReference(current.left, sourceFile);
    if (leftRoute) return null;
    const left = renderPathExpression(current.left, sourceFile) || '';
    const right = renderPathExpression(current.right, sourceFile) || '';
    return left + right;
  }
  const value = literalValue(current);
  return typeof value === 'string' ? value : null;
}

function normalizePath(pathValue) {
  if (!pathValue) return null;
  let value = String(pathValue).trim();
  if (!value.startsWith('/')) value = `/${value}`;
  return value;
}

function normalizeTemplatePath(pathValue) {
  const normalized = normalizePath(pathValue) || '<unknown>';
  return normalized
    .replace(/\{[^}]+\}/g, '{param}')
    .replace(/\/+$/, '') || '/';
}

function methodsFromComment(commentText) {
  const methods = [];
  // Keep this case-sensitive: comments such as "Get post" and
  // "Targeting options" must not be mistaken for POST or OPTIONS.
  const matches = String(commentText || '').match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\b/g) || [];
  for (const match of matches) {
    if (!methods.includes(match)) methods.push(match);
  }
  return methods;
}

function trailingMethods(property, sourceFile) {
  const source = sourceFile.text;
  const startLine = sourceFile.getLineAndCharacterOfPosition(property.getStart(sourceFile)).line;
  const endLine = sourceFile.getLineAndCharacterOfPosition(property.end).line;
  const lines = source.split(/\r?\n/);
  const methods = [];
  for (let line = startLine; line <= endLine; line += 1) {
    const text = lines[line] || '';
    const commentAt = text.indexOf('//');
    if (commentAt < 0) continue;
    for (const method of methodsFromComment(text.slice(commentAt + 2))) {
      if (!methods.includes(method)) methods.push(method);
    }
  }
  return methods;
}

function functionParameters(functionNode, sourceFile) {
  if (!functionNode || !functionNode.parameters) return [];
  return functionNode.parameters.map((parameter) => ({
    name: nodeText(parameter.name, sourceFile),
    type: parameter.type ? nodeText(parameter.type, sourceFile) : 'unknown',
    optional: Boolean(parameter.questionToken || parameter.initializer),
    defaultValue: parameter.initializer ? nodeText(parameter.initializer, sourceFile) : null,
  }));
}

function pathParameters(pathValue, parameters) {
  const result = [];
  const seen = new Set();
  const matches = String(pathValue || '').matchAll(/\{([^}]+)\}/g);
  const parameterMap = new Map((parameters || []).map((parameter) => [parameter.name, parameter]));
  for (const match of matches) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    result.push({ name, type: parameterMap.get(name)?.type || 'unknown' });
  }
  return result;
}

function findRoutes(root, routeFilename, routeSource) {
  const routes = [];

  function walkObject(objectLiteral, prefix) {
    for (const property of objectLiteral.properties) {
      const name = propertyName(property, routeSource);
      if (!name || !ts.isPropertyAssignment(property)) continue;
      const fullName = prefix ? `${prefix}.${name}` : name;
      const initializer = unwrap(property.initializer);
      if (initializer && ts.isObjectLiteralExpression(initializer)) {
        walkObject(initializer, fullName);
        continue;
      }

      const routePath = normalizePath(renderPathExpression(initializer, routeSource));
      if (!routePath) continue;
      const routeFunction = initializer && (
        ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)
      ) ? initializer : null;
      routes.push({
        alias: fullName,
        path: routePath,
        parameters: functionParameters(routeFunction, routeSource),
        pathParameters: pathParameters(routePath, functionParameters(routeFunction, routeSource)),
        methods: trailingMethods(property, routeSource),
        source: sourceFileName(root, routeFilename, nodeLine(property, routeSource)),
        routeNode: property,
      });
    }
  }

  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name && node.name.getText(routeSource) === 'API_ROUTES') {
      const initializer = unwrap(node.initializer);
      if (initializer && ts.isObjectLiteralExpression(initializer)) walkObject(initializer, '');
    }
    ts.forEachChild(node, visit);
  }

  visit(routeSource);
  return routes;
}

function routeMap(routes) {
  return new Map(routes.map((route) => [route.alias, route]));
}

function collectTypeDefinitions(sourceFiles) {
  const definitions = new Map();

  for (const file of sourceFiles) {
    for (const declaration of file.sourceFile.statements) {
      if (ts.isInterfaceDeclaration(declaration)) {
        definitions.set(declaration.name.text, {
          name: declaration.name.text,
          node: declaration,
          text: declaration.getText(file.sourceFile),
          typeNode: declaration,
          sourceFile: file.sourceFile,
          source: sourceFileName(file.root, file.filename, nodeLine(declaration, file.sourceFile)),
        });
      } else if (ts.isTypeAliasDeclaration(declaration)) {
        definitions.set(declaration.name.text, {
          name: declaration.name.text,
          node: declaration,
          text: declaration.getText(file.sourceFile),
          typeNode: declaration.type,
          sourceFile: file.sourceFile,
          source: sourceFileName(file.root, file.filename, nodeLine(declaration, file.sourceFile)),
        });
      }
    }
  }
  return definitions;
}

function typeFields(typeNode, sourceFile, definitions, seen = new Set()) {
  if (!typeNode) return [];
  let current = typeNode;
  if (ts.isParameter(current)) current = current.type;
  if (current && ts.isTypeReferenceNode(current)) {
    const name = current.typeName.getText(sourceFile);
    if (seen.has(name)) return [];
    const definition = definitions.get(name);
    if (!definition) return [];
    const nextSeen = new Set(seen);
    nextSeen.add(name);
    if (ts.isInterfaceDeclaration(definition.typeNode)) {
      return typeFields(definition.typeNode, definition.sourceFile || sourceFile, definitions, nextSeen);
    }
    return typeFields(definition.typeNode, definition.sourceFile || sourceFile, definitions, nextSeen);
  }
  if (current && ts.isParenthesizedTypeNode(current)) {
    return typeFields(current.type, sourceFile, definitions, seen);
  }
  if (current && ts.isInterfaceDeclaration(current)) {
    return current.members.map((member) => ({
      name: propertyName(member, sourceFile),
      type: member.type ? nodeText(member.type, sourceFile) : 'unknown',
      optional: Boolean(member.questionToken),
      source: member.getText(sourceFile),
    })).filter((field) => field.name);
  }
  if (current && ts.isTypeLiteralNode(current)) {
    return current.members.map((member) => ({
      name: propertyName(member, sourceFile),
      type: member.type ? nodeText(member.type, sourceFile) : 'unknown',
      optional: Boolean(member.questionToken),
      source: member.getText(sourceFile),
    })).filter((field) => field.name);
  }
  return [];
}

function typeEvidence(typeText, sourceFile, definitions) {
  if (!typeText) return null;
  const clean = String(typeText).replace(/^Readonly</, '').replace(/>$/, '').trim();
  const definition = definitions.get(clean);
  return definition ? {
    type: clean,
    source: definition.source,
    text: definition.text,
  } : { type: clean, source: null, text: null };
}

function findWrapper(node, sourceFile) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) ||
        ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
      const parameters = functionParameters(current, sourceFile);
      let name = current.name ? nodeText(current.name, sourceFile) : null;
      const owner = current.parent;
      if (owner && ts.isPropertyAssignment(owner)) {
        const property = propertyName(owner, sourceFile);
        let objectName = null;
        let parent = owner.parent;
        while (parent) {
          if (ts.isVariableDeclaration(parent) && parent.initializer === owner.parent) {
            objectName = nodeText(parent.name, sourceFile);
            break;
          }
          parent = parent.parent;
        }
        name = objectName && property ? `${objectName}.${property}` : property || name;
      }
      return {
        name: name || '<anonymous>',
        parameters,
        parameterNodes: current.parameters ? Array.from(current.parameters) : [],
        returnType: current.type ? nodeText(current.type, sourceFile) : null,
        functionNode: current,
      };
    }
    current = current.parent;
  }
  return {
    name: '<module>',
    parameters: [],
    parameterNodes: [],
    returnType: null,
    functionNode: null,
  };
}

function wrapperParameter(wrapper, name) {
  return (wrapper.parameters || []).find((parameter) => parameter.name === name) || null;
}

function wrapperParameterTypeNode(wrapper, name) {
  const index = (wrapper.parameters || []).findIndex((parameter) => parameter.name === name);
  return index >= 0 ? wrapper.parameterNodes[index].type : null;
}

function expressionIdentifier(node, sourceFile) {
  const current = unwrap(node);
  if (current && ts.isIdentifier(current)) return current.text;
  return null;
}

function expressionHasOptionalAccess(node) {
  if (!node) return false;
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    return Boolean(node.questionDotToken) || expressionHasOptionalAccess(node.expression);
  }
  if (ts.isBinaryExpression(node)) {
    return expressionHasOptionalAccess(node.left) || expressionHasOptionalAccess(node.right);
  }
  return false;
}

function inferredRequired(valueNode, wrapper, sourceFile, definitions) {
  const value = unwrap(valueNode);
  if (!value || expressionHasOptionalAccess(value)) return false;
  if (ts.isBinaryExpression(value) && (
    value.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
    value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  )) return false;

  const identifier = expressionIdentifier(value, sourceFile);
  if (identifier) {
    const parameter = wrapperParameter(wrapper, identifier);
    return Boolean(parameter && !parameter.optional);
  }

  if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) {
    const objectName = expressionIdentifier(value.expression, sourceFile);
    const fieldName = ts.isPropertyAccessExpression(value)
      ? value.name.text
      : String(literalValue(value.argumentExpression) ?? '');
    const typeNode = wrapperParameterTypeNode(wrapper, objectName);
    const field = typeFields(typeNode, sourceFile, definitions).find((entry) => entry.name === fieldName);
    return Boolean(field && !field.optional);
  }

  return literalValue(value) !== undefined;
}

function queryFieldsFromExpression(node, wrapper, sourceFile, definitions) {
  const value = unwrap(node);
  if (!value) return [];
  if (ts.isObjectLiteralExpression(value)) {
    const fields = [];
    for (const property of value.properties) {
      if (ts.isSpreadAssignment(property)) {
        fields.push(...queryFieldsFromExpression(property.expression, wrapper, sourceFile, definitions));
        continue;
      }
      const name = propertyName(property, sourceFile);
      if (!name) continue;
      const initializer = propertyValue(property);
      fields.push({
        name,
        type: initializer ? nodeText(initializer, sourceFile) : 'unknown',
        optional: !inferredRequired(initializer, wrapper, sourceFile, definitions),
        valueNode: initializer,
        source: property.getText(sourceFile),
      });
    }
    return fields;
  }

  const identifier = expressionIdentifier(value, sourceFile);
  if (identifier) {
    const typeNode = wrapperParameterTypeNode(wrapper, identifier);
    return typeFields(typeNode, sourceFile, definitions).map((field) => ({
      ...field,
      valueNode: null,
    }));
  }
  return [];
}

function firstLiteralFromType(typeText, definitions) {
  let text = String(typeText || '');
  const definition = definitions && definitions.get(text.trim());
  if (definition) text = definition.text;
  const match = text.match(/['"]([^'"]+)['"]/);
  return match ? match[1] : undefined;
}

function defaultFromExpression(node, sourceFile) {
  const value = unwrap(node);
  const direct = literalValue(value);
  if (direct !== undefined) return direct;
  if (value && ts.isBinaryExpression(value) && (
    value.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
    value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  )) {
    return defaultFromExpression(value.right, sourceFile);
  }
  return undefined;
}

function defaultFromText(text) {
  if (text === null || text === undefined) return undefined;
  const value = String(text).trim();
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  const quoted = value.match(/^['"]([\s\S]*)['"]$/);
  return quoted ? quoted[1] : undefined;
}

function sourceTextForTypeNode(typeNode, sourceFile) {
  return typeNode ? nodeText(typeNode, sourceFile) : null;
}

function localVariableType(name, scopeNode, sourceFile) {
  if (!name) return null;
  let found = null;
  function visit(node) {
    if (found || !node) return;
    if (ts.isVariableDeclaration(node) && node.name && node.name.getText(sourceFile) === name) {
      if (node.type) {
        found = node.type;
      } else if (node.initializer) {
        const initializer = node.initializer;
        if (ts.isAsExpression(initializer) || ts.isTypeAssertionExpression(initializer)) {
          found = initializer.type;
        }
      }
      if (found) return;
    }
    ts.forEachChild(node, visit);
  }
  visit(scopeNode || sourceFile);
  return found;
}

function bodyEvidence(dataNode, wrapper, sourceFile, definitions) {
  const value = unwrap(dataNode);
  if (!value) return null;
  const expression = nodeText(value, sourceFile);
  const identifier = expressionIdentifier(value, sourceFile);
  let type = null;
  let typeNode = null;
  if (identifier) {
    const parameter = wrapperParameter(wrapper, identifier);
    type = parameter?.type || null;
    typeNode = wrapperParameterTypeNode(wrapper, identifier);
    if (!typeNode) typeNode = localVariableType(identifier, wrapper.functionNode, sourceFile);
    if (!type && typeNode) type = nodeText(typeNode, sourceFile);
  }
  if (ts.isObjectLiteralExpression(value)) {
    return {
      expression,
      type: 'inline object',
      keys: value.properties
        .map((property) => propertyName(property, sourceFile))
        .filter(Boolean),
      interface: null,
    };
  }
  return {
    expression,
    type,
    keys: null,
    interface: typeEvidence(sourceTextForTypeNode(typeNode, sourceFile) || type, sourceFile, definitions),
  };
}

function queryEvidence(paramsNode, wrapper, sourceFile, definitions) {
  if (!paramsNode) return null;
  const expression = nodeText(unwrap(paramsNode), sourceFile);
  const fields = queryFieldsFromExpression(paramsNode, wrapper, sourceFile, definitions);
  const identifier = expressionIdentifier(paramsNode, sourceFile);
  const typeNode = identifier ? wrapperParameterTypeNode(wrapper, identifier) : null;
  const type = identifier ? wrapperParameter(wrapper, identifier)?.type || null : null;
  return {
    expression,
    type,
    keys: fields.map((field) => field.name),
    requiredKeys: fields.filter((field) => !field.optional).map((field) => field.name),
    fields: fields.map((field) => {
      const parameterName = expressionIdentifier(field.valueNode, sourceFile);
      const parameter = wrapperParameter(wrapper, parameterName);
      const type = parameter?.type || field.type || 'unknown';
      const directDefault = defaultFromExpression(field.valueNode, sourceFile);
      const parameterDefault = defaultFromText(parameter?.defaultValue);
      const defaultValue = directDefault !== undefined
        ? directDefault
        : parameterDefault !== undefined
          ? parameterDefault
          : firstLiteralFromType(type, definitions);
      return {
        name: field.name,
        type,
        optional: Boolean(field.optional),
        source: field.source || null,
        default: defaultValue,
        typeEvidence: typeEvidence(type, sourceFile, definitions),
      };
    }),
    interface: typeEvidence(sourceTextForTypeNode(typeNode, sourceFile) || type, sourceFile, definitions),
  };
}

function callMethod(valueNode, sourceFile, fallback = 'GET') {
  const value = literalValue(valueNode);
  if (typeof value === 'string') return value.toUpperCase();
  const text = nodeText(valueNode, sourceFile);
  if (text && HTTP_METHODS.has(text.toUpperCase())) return text.toUpperCase();
  return fallback;
}

function routePathForCall(urlNode, sourceFile, routes) {
  const alias = findRouteReference(urlNode, sourceFile);
  if (alias && routes.has(alias)) {
    return {
      alias,
      path: routes.get(alias).path,
      route: routes.get(alias),
    };
  }

  const pathValue = renderPathExpression(urlNode, sourceFile);
  if (pathValue !== null) {
    return { alias: null, path: normalizePath(pathValue), route: null };
  }
  return { alias: null, path: '<unknown>', route: null };
}

function callSource(root, filename, call, sourceFile) {
  return sourceFileName(root, filename, nodeLine(call, sourceFile));
}

function requestContract(call, objectLiteral, wrapper, sourceFile, root, filename, definitions) {
  const urlProperty = getProperty(objectLiteral, 'url', sourceFile);
  const methodProperty = getProperty(objectLiteral, 'method', sourceFile);
  const paramsProperty = getProperty(objectLiteral, 'params', sourceFile);
  const dataProperty = getProperty(objectLiteral, 'data', sourceFile);
  const urlNode = propertyValue(urlProperty);
  const route = routePathForCall(urlNode, sourceFile, definitions.routes);
  const method = callMethod(propertyValue(methodProperty), sourceFile);
  const source = callSource(root, filename, call, sourceFile);
  return {
    kind: 'request',
    source,
    method,
    path: route.path,
    routeAlias: route.alias,
    route: route.route,
    requestObjectText: objectLiteral.getText(sourceFile),
    requestObject: objectLiteral.getText(sourceFile),
    callText: call.getText(sourceFile),
    wrapper: wrapper.name,
    wrapperParams: wrapper.parameters,
    wrapperParamTypes: wrapper.parameters.map((parameter) => parameter.type),
    wrapperReturnType: wrapper.returnType,
    responseType: call.typeArguments && call.typeArguments.length
      ? nodeText(call.typeArguments[0], sourceFile)
      : null,
    body: bodyEvidence(propertyValue(dataProperty), wrapper, sourceFile, definitions.types),
    query: queryEvidence(propertyValue(paramsProperty), wrapper, sourceFile, definitions.types),
  };
}

function rawAxiosMethod(call, sourceFile) {
  if (!ts.isPropertyAccessExpression(call.expression)) return null;
  const owner = unwrap(call.expression.expression);
  if (!owner || !ts.isIdentifier(owner) || owner.text !== 'axios') return null;
  const method = call.expression.name.text.toUpperCase();
  return HTTP_METHODS.has(method) || method === 'REQUEST' ? method : null;
}

function axiosContract(call, wrapper, sourceFile, root, filename, definitions) {
  const methodName = rawAxiosMethod(call, sourceFile);
  if (!methodName) return null;
  let method = methodName === 'REQUEST' ? 'GET' : methodName;
  let urlNode = call.arguments[0];
  let dataNode = null;
  let configNode = null;
  if (methodName === 'REQUEST') {
    configNode = unwrap(call.arguments[0]);
    urlNode = getProperty(configNode, 'url', sourceFile);
    urlNode = propertyValue(urlNode);
    method = callMethod(propertyValue(getProperty(configNode, 'method', sourceFile)), sourceFile);
    dataNode = propertyValue(getProperty(configNode, 'data', sourceFile));
  } else {
    dataNode = call.arguments[1] ? unwrap(call.arguments[1]) : null;
    configNode = call.arguments[2] ? unwrap(call.arguments[2]) : null;
  }

  const route = routePathForCall(urlNode, sourceFile, definitions.routes);
  const configParams = configNode && ts.isObjectLiteralExpression(configNode)
    ? propertyValue(getProperty(configNode, 'params', sourceFile))
    : null;
  const source = callSource(root, filename, call, sourceFile);
  const exactConfig = configNode && ts.isObjectLiteralExpression(configNode)
    ? configNode.getText(sourceFile)
    : null;
  return {
    kind: 'axios',
    source,
    method,
    path: route.path,
    routeAlias: route.alias,
    route: route.route,
    requestObjectText: exactConfig || call.getText(sourceFile),
    requestObject: exactConfig || call.getText(sourceFile),
    callText: call.getText(sourceFile),
    wrapper: wrapper.name,
    wrapperParams: wrapper.parameters,
    wrapperParamTypes: wrapper.parameters.map((parameter) => parameter.type),
    wrapperReturnType: wrapper.returnType,
    responseType: null,
    body: bodyEvidence(dataNode, wrapper, sourceFile, definitions.types),
    query: queryEvidence(configParams, wrapper, sourceFile, definitions.types),
  };
}

function fetchContract(call, wrapper, sourceFile, root, filename, definitions) {
  const urlNode = call.arguments[0] ? unwrap(call.arguments[0]) : null;
  const optionsNode = call.arguments[1] ? unwrap(call.arguments[1]) : null;
  const method = optionsNode && ts.isObjectLiteralExpression(optionsNode)
    ? callMethod(propertyValue(getProperty(optionsNode, 'method', sourceFile)), sourceFile)
    : 'GET';
  const route = routePathForCall(urlNode, sourceFile, definitions.routes);
  const params = optionsNode && ts.isObjectLiteralExpression(optionsNode)
    ? propertyValue(getProperty(optionsNode, 'params', sourceFile))
    : null;
  const source = callSource(root, filename, call, sourceFile);
  return {
    kind: 'fetch',
    source,
    method,
    path: route.path,
    routeAlias: route.alias,
    route: route.route,
    requestObjectText: optionsNode ? optionsNode.getText(sourceFile) : null,
    requestObject: optionsNode ? optionsNode.getText(sourceFile) : null,
    callText: call.getText(sourceFile),
    wrapper: wrapper.name,
    wrapperParams: wrapper.parameters,
    wrapperParamTypes: wrapper.parameters.map((parameter) => parameter.type),
    wrapperReturnType: wrapper.returnType,
    responseType: null,
    body: null,
    query: queryEvidence(params, wrapper, sourceFile, definitions.types),
  };
}

function isRequestCall(call, sourceFile) {
  const expression = unwrap(call.expression);
  return Boolean(expression && ts.isIdentifier(expression) && expression.text === 'request');
}

function isFetchCall(call, sourceFile) {
  const expression = unwrap(call.expression);
  return Boolean(expression && ts.isIdentifier(expression) && expression.text === 'fetch');
}

function discoverNetworkCalls(root, files, routes, typeDefinitions) {
  const calls = [];
  const definitions = { routes, types: typeDefinitions };
  for (const file of files) {
    const sourceFile = file.sourceFile;
    const inApiDirectory = relativeFile(root, file.filename).startsWith('services/api/');
    function visit(node) {
      if (ts.isCallExpression(node)) {
        const wrapper = findWrapper(node, sourceFile);
        if (inApiDirectory && isRequestCall(node, sourceFile) && node.arguments.length) {
          const objectLiteral = unwrap(node.arguments[0]);
          if (objectLiteral && ts.isObjectLiteralExpression(objectLiteral)) {
            calls.push(requestContract(node, objectLiteral, wrapper, sourceFile, root, file.filename, definitions));
          }
        } else if (inApiDirectory && rawAxiosMethod(node, sourceFile)) {
          calls.push(axiosContract(node, wrapper, sourceFile, root, file.filename, definitions));
        } else if (isFetchCall(node, sourceFile)) {
          calls.push(fetchContract(node, wrapper, sourceFile, root, file.filename, definitions));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return calls;
}

function inventoryKey(method, pathValue) {
  return `${String(method || 'UNKNOWN').toUpperCase()} ${normalizeTemplatePath(pathValue)}`;
}

function addUnique(array, values) {
  for (const value of values || []) {
    if (value !== null && value !== undefined && !array.includes(value)) array.push(value);
  }
  return array;
}

function publicContract(contract) {
  return {
    source: contract.source,
    requestObjectText: contract.requestObjectText,
    requestObject: contract.requestObject,
    callText: contract.callText,
    kind: contract.kind,
    wrapper: contract.wrapper,
    wrapperParams: contract.wrapperParams,
    wrapperParamTypes: contract.wrapperParamTypes,
    wrapperReturnType: contract.wrapperReturnType,
    responseType: contract.responseType,
    requestBody: contract.body,
    requestQuery: contract.query,
    unknown: false,
  };
}

function registryOnlyContract(group) {
  return {
    source: group.routes[0]?.source || null,
    requestObjectText: null,
    requestObject: null,
    callText: null,
    kind: 'registry',
    wrapper: null,
    wrapperParams: [],
    wrapperParamTypes: [],
    wrapperReturnType: null,
    responseType: null,
    requestBody: null,
    requestQuery: null,
    unknown: true,
    status: 'registry-only',
    note: 'Registry route has no discovered request(), raw axios, or fetch implementation.',
  };
}

function collectQueryData(group) {
  const queryKeys = [];
  const requiredQueryKeys = [];
  for (const contract of group.calls) {
    for (const key of contract.query?.keys || []) {
      if (!queryKeys.includes(key)) queryKeys.push(key);
    }
    for (const key of contract.query?.requiredKeys || []) {
      if (!requiredQueryKeys.includes(key)) requiredQueryKeys.push(key);
    }
  }
  return { queryKeys, requiredQueryKeys };
}

function defaultQueryFor(group, queryKeys, sourceTexts) {
  const result = {};
  const candidates = new Map();
  for (const call of group.calls) {
    for (const field of call.query?.fields || []) {
      if (field.default !== undefined && !candidates.has(field.name)) {
        candidates.set(field.name, field.default);
      }
      if (!candidates.has(field.name)) {
        const typed = firstLiteralFromType(field.type);
        if (typed !== undefined) candidates.set(field.name, typed);
      }
    }
  }

  const sourceHasTelugu = sourceTexts.some((text) =>
    /\blanguage\s*:\s*['"]te['"]/.test(text) || /\|\|\s*['"]te['"]/.test(text)
  );
  for (const key of queryKeys) {
    if (key === 'q' || key === 'query') {
      result[key] = 'news';
    } else if (key === 'language' && sourceHasTelugu) {
      result[key] = 'te';
    } else if (key === 'limit' || key === 'post_limit' || key === 'recent_limit') {
      result[key] = 1;
    } else if (key === 'page') {
      result[key] = 1;
    } else if (key === 'offset') {
      result[key] = 0;
    } else if (key === 'content_type' && candidates.get(key) === 'news') {
      result[key] = 'news';
    } else if (key === 'detailed' && typeof candidates.get(key) === 'boolean') {
      result[key] = candidates.get(key);
    }
  }
  return result;
}

function buildInventory(root, routes, calls, files) {
  const routeByAlias = routeMap(routes);
  const callsByAlias = new Map();
  for (const call of calls) {
    if (!call.routeAlias) continue;
    if (!callsByAlias.has(call.routeAlias)) callsByAlias.set(call.routeAlias, []);
    callsByAlias.get(call.routeAlias).push(call);
  }

  // newsDetail is intentionally missing a registry comment.  Infer it from
  // the actual screensApi request rather than guessing a method globally.
  for (const route of routes) {
    if (route.methods.length) continue;
    const inferred = (callsByAlias.get(route.alias) || []).map((call) => call.method);
    route.methods = [...new Set(inferred.filter((method) => HTTP_METHODS.has(method)))];
    if (!route.methods.length) route.methods = ['UNKNOWN'];
  }

  const groups = [];
  const groupsByKey = new Map();
  function getOrCreate(key, pathValue, method, registry = false) {
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        key,
        path: pathValue,
        method,
        registry,
        aliases: [],
        routes: [],
        calls: [],
        order: groups.length,
      };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    return group;
  }

  for (const route of routes) {
    for (const method of route.methods) {
      const key = inventoryKey(method, route.path);
      const group = getOrCreate(key, route.path, method, true);
      addUnique(group.aliases, [route.alias]);
      if (!group.routes.includes(route)) group.routes.push(route);
    }
  }

  for (const call of calls) {
    const method = call.method || 'UNKNOWN';
    const key = inventoryKey(method, call.path);
    const group = getOrCreate(key, call.path, method, Boolean(call.routeAlias));
    if (call.routeAlias) {
      const route = routeByAlias.get(call.routeAlias);
      if (route) {
        addUnique(group.aliases, [route.alias]);
        if (!group.routes.includes(route)) group.routes.push(route);
      }
    } else {
      addUnique(group.aliases, [`network:${call.kind}:${call.source}`]);
    }
    group.calls.push(call);
  }

  const sourceTexts = files.map((file) => file.text);
  return groups.map((group, index) => {
    const firstRoute = group.routes[0] || null;
    const firstCall = group.calls[0] || null;
    const query = collectQueryData(group);
    const candidateDefaultQuery = defaultQueryFor(group, query.queryKeys, sourceTexts);
    const defaultQuery = query.requiredQueryKeys.some((key) =>
      !Object.prototype.hasOwnProperty.call(candidateDefaultQuery, key)
    ) ? {} : candidateDefaultQuery;
    const contracts = group.calls.length
      ? group.calls.map(publicContract)
      : [registryOnlyContract(group)];
    const pathParams = firstRoute?.pathParameters?.length
      ? firstRoute.pathParameters
      : pathParameters(group.path, firstCall?.wrapperParams || []);
    const sources = [];
    for (const route of group.routes) addUnique(sources, [route.source]);
    for (const call of group.calls) addUnique(sources, [call.source]);

    const result = {
      id: `api-${String(index + 1).padStart(3, '0')}`,
      method: group.method,
      path: group.path,
      aliases: group.aliases,
      sources,
      implemented: group.calls.length > 0,
      pathParameters: pathParams,
      contracts,
      queryKeys: query.queryKeys,
      requiredQueryKeys: query.requiredQueryKeys,
      defaultQuery,
    };
    if (group.calls.some((call) => call.kind === 'request' || call.kind === 'axios')) {
      result.expectedShape = 'json';
    }
    return result;
  });
}

function analyze(root) {
  const routeFilename = path.join(root, 'services', 'api', 'routes.ts');
  if (!fs.existsSync(routeFilename)) {
    throw new Error(`API route registry not found: ${routeFilename}`);
  }

  const filenames = readSourceFiles(root);
  if (!filenames.includes(routeFilename)) filenames.push(routeFilename);
  const files = filenames.sort().map((filename) => {
    const text = fs.readFileSync(filename, 'utf8');
    return {
      root,
      filename,
      text,
      sourceFile: parseSource(filename, text),
    };
  });
  const routeFile = files.find((file) => path.resolve(file.filename) === path.resolve(routeFilename));
  const routes = findRoutes(root, routeFilename, routeFile.sourceFile);
  const types = collectTypeDefinitions(files);
  const calls = discoverNetworkCalls(root, files, routeMap(routes), types);
  const inventory = buildInventory(root, routes, calls, files);
  return { root, routes, calls, files, inventory };
}

function getInventory(root = repoRoot) {
  return analyze(normalizeRoot(root)).inventory;
}

function getCoverage(root = repoRoot) {
  const analysis = analyze(normalizeRoot(root));
  const inventory = analysis.inventory;
  const routeEntries = new Map();
  for (const entry of inventory) {
    for (const alias of entry.aliases) {
      if (!alias.startsWith('network:')) routeEntries.set(`${entry.method} ${alias}`, entry);
    }
  }

  const routeStatuses = [];
  const unmatchedRoutes = [];
  let expectedRouteMethods = 0;
  let coveredRouteMethods = 0;
  for (const route of analysis.routes) {
    for (const method of route.methods) {
      expectedRouteMethods += 1;
      const entry = routeEntries.get(`${method} ${route.alias}`);
      const covered = Boolean(entry && entry.implemented);
      if (covered) coveredRouteMethods += 1;
      const status = {
        alias: route.alias,
        method,
        path: route.path,
        source: route.source,
        implemented: covered,
      };
      routeStatuses.push(status);
      if (!covered) unmatchedRoutes.push(status);
    }
  }

  const unmatchedCalls = analysis.calls
    .map((call) => {
      const route = call.routeAlias
        ? analysis.routes.find((candidate) => candidate.alias === call.routeAlias)
        : null;
      if (route && route.methods.includes(call.method)) return null;
      return {
        source: call.source,
        kind: call.kind,
        method: call.method,
        path: call.path,
        reason: route
          ? `HTTP method ${call.method} is not declared for API_ROUTES.${call.routeAlias}.`
          : call.routeAlias
            ? 'Route reference could not be resolved in API_ROUTES.'
            : 'Network call has no API_ROUTES registry reference.',
      };
    })
    .filter(Boolean);

  const gaps = [
    ...unmatchedRoutes.map((route) => ({
      kind: 'registry-only-route',
      alias: route.alias,
      method: route.method,
      path: route.path,
      source: route.source,
      message: 'No matching implementation call was discovered.',
    })),
    ...unmatchedCalls.map((call) => ({
      kind: 'unmatched-network-call',
      source: call.source,
      method: call.method,
      path: call.path,
      message: call.reason,
    })),
  ];

  return {
    inventoryTotal: inventory.length,
    getCount: inventory.filter((entry) => entry.method === 'GET').length,
    routeLeaves: {
      total: analysis.routes.length,
      expectedMethods: expectedRouteMethods,
      coveredMethods: coveredRouteMethods,
      uncoveredMethods: unmatchedRoutes.length,
      statuses: routeStatuses,
    },
    networkCalls: {
      total: analysis.calls.length,
      matchedToRegistry: analysis.calls.length - unmatchedCalls.length,
      unmatched: unmatchedCalls,
    },
    unmatchedRoutes,
    unmatchedCalls,
    gaps,
  };
}

module.exports = {
  getInventory,
  getCoverage,
  repoRoot,
};

if (require.main === module) {
  const inventory = getInventory(repoRoot);
  const coverage = getCoverage(repoRoot);
  process.stdout.write(JSON.stringify({
    file: relativeFile(repoRoot, __filename),
    moduleAPI: ['getInventory(root = repoRoot)', 'getCoverage(root = repoRoot)'],
    inventoryTotal: inventory.length,
    getCount: inventory.filter((entry) => entry.method === 'GET').length,
    gaps: coverage.gaps,
  }, null, 2));
  process.stdout.write('\n');
}
