// ../../errors-as-values/error-codes.mjs
var PARSE_NUMBER_ERROR__INVALID_STRING = 0;
var PARSE_NUMBER_ERROR__OUT_OF_BOUNDS = 1;
var JSON_ERROR__CANNOT_STRINGIFY = 12;

// ../../errors-as-values/result.mjs
var ERR_TAG = "ErrorsAsValuesError";
var err = (cause) => Object.freeze([
  Object.freeze(cause),
  ERR_TAG
]);
var errCause = ([cause]) => cause;
var isErr = (result) => Array.isArray(result) && result.length === 2 && result[1] === ERR_TAG;
var isFatalError = (error) => (
  // TODO use Error.isError once it's available.
  error instanceof Error && error.isFatal === true
);

// ../../errors-as-values/builtins.mjs
var parseInt = (string) => parseNumber(string, INT_REGEX, globalThis.parseInt, Number.isSafeInteger);
var parseNumber = (string, regex, parseFn, boundsCheck) => {
  if (!regex.test(string)) {
    return INVALID_STRING_ERROR;
  }
  const number = parseFn(string);
  if (!boundsCheck(number)) {
    return OUT_OF_BOUNDS_ERROR;
  }
  return (
    /** @type {FiniteNumber} */
    number
  );
};
var INT_REGEX = /^[+-]?\d+$/;
var parseJSON = (
  /** @type {ParseJSON} */
  /**
  * @param {string} string 
  * @param {JSONReviver} [reviver] 
  * @returns {JSONValue | Err<SyntaxError | {reviverError: unknown}>}
  */
  (string, reviver) => {
    try {
      return JSON.parse(string, reviver);
    } catch (error) {
      if (isFatalError(error)) throw error;
      if (error instanceof SyntaxError) return err(error);
      if (reviver) return err({
        reviverError: error
      });
      throw new /** @implements {FatalError} */
      class extends Error {
        /** @type {true} */
        isFatal = true;
      }("JSON.parse", {
        cause: error
      });
    }
  }
);
var INVALID_STRING_ERROR = err(PARSE_NUMBER_ERROR__INVALID_STRING);
var OUT_OF_BOUNDS_ERROR = err(PARSE_NUMBER_ERROR__OUT_OF_BOUNDS);
var CANNOT_STRINGIFY_ERROR = err(JSON_ERROR__CANNOT_STRINGIFY);

// selected-range-view.mjs
var drawSelectedRange = (state) => {
  const { cursor, highlightedRange, selectedRange, text, characterHeight } = state, endPoint = findPoint(text, selectedRange.end), newActiveLine = state.lineNumbers.children[endPoint.row];
  if (state.lineWithCursor !== newActiveLine) {
    state.lineWithCursor?.removeAttribute("class");
    newActiveLine.className = "active";
    state.lineWithCursor = newActiveLine;
  }
  cursor.remove();
  cursor.style.height = `${characterHeight}px`;
  cursor.style.translate = `${endPoint.column}ch calc(${endPoint.row + 0.5}lh - ${characterHeight / 2}px)`;
  state.program.before(cursor);
  if (selectedRange.start === selectedRange.end) {
    state.selectionIndicator.data = `Line ${endPoint.row + 1}, Column ${endPoint.column + 1}`;
    highlightedRange.remove();
    cursor.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
    return;
  }
  const startPoint = findPoint(text, selectedRange.start);
  let highlightStartPoint, highlightStart, highlightEnd;
  if (selectedRange.start < selectedRange.end) {
    highlightStartPoint = startPoint;
    highlightStart = selectedRange.start;
    highlightEnd = selectedRange.end;
  } else {
    highlightStartPoint = endPoint;
    highlightStart = selectedRange.end;
    highlightEnd = selectedRange.start;
  }
  const selectedCount = highlightEnd - highlightStart;
  state.selectionIndicator.data = `Line ${startPoint.row + 1}, Column ${startPoint.column + 1} -> Line ${endPoint.row + 1}, Column ${endPoint.column + 1} (${selectedCount} character${selectedCount === 1 ? "" : "s"})`;
  let backgroundText = text.slice(highlightStart, highlightEnd);
  while (backgroundText.includes("\n\n")) {
    backgroundText = backgroundText.replaceAll("\n\n", "\n_\n");
  }
  if (backgroundText.startsWith("\n")) {
    backgroundText = "_" + backgroundText;
  }
  highlightedRange.firstChild.data = text.slice(highlightStart - highlightStartPoint.column, highlightStart);
  highlightedRange.firstElementChild.firstChild.data = backgroundText;
  highlightedRange.style.translate = `0 ${highlightStartPoint.row}lh`;
  if (cursor.nextSibling !== highlightedRange) {
    cursor.after(highlightedRange);
  }
  cursor.scrollIntoView({
    block: "nearest",
    inline: "nearest"
  });
};
var findPoint = (text, index) => {
  let lastNewLineIndexPlus1 = 0, row = 0;
  do {
    const nextNewLineIndex = text.indexOf("\n", lastNewLineIndexPlus1);
    if (nextNewLineIndex === -1 || nextNewLineIndex >= index) {
      break;
    }
    row++;
    lastNewLineIndexPlus1 = nextNewLineIndex + 1;
  } while (true);
  return {
    row,
    column: index - lastNewLineIndexPlus1
  };
};

// ../parser/accessors/type-checks.mjs
var isLeaf = (node) => !Array.isArray(node.text);

// ../parser/iterator.mjs
var updatePositionForGap = (position, gap) => {
  if (typeof gap === "string") {
    updatePositionForString(position, gap);
  } else if (Array.isArray(gap)) {
    for (const part of gap) {
      updatePositionForGapNode(position, part);
    }
  } else {
    updatePositionForGapNode(position, gap);
  }
};
var updatePositionForString = (position, string) => {
  let lastNewLineIndexPlus1 = 0, newLines = 0;
  do {
    const nextNewLineIndex = string.indexOf("\n", lastNewLineIndexPlus1);
    if (nextNewLineIndex === -1) {
      break;
    }
    newLines++;
    lastNewLineIndexPlus1 = nextNewLineIndex + 1;
  } while (true);
  if (newLines > 0) {
    position.row += newLines;
    position.column = string.length - lastNewLineIndexPlus1;
  } else {
    position.column += string.length;
  }
};
var updatePositionForGapNode = (position, gap) => {
  if (gap.type === "block_comment") {
    updatePositionForBlockComment(position, gap);
    return;
  }
  updatePositionForString(position, gap.before);
  updatePositionForString(position, gap.data);
  updatePositionForString(position, gap.after);
};
var updatePositionForBlockComment = (position, comment) => {
  updatePositionForString(position, comment.before);
  for (const part of comment.data) {
    if (typeof part === "string") {
      updatePositionForString(position, part);
    } else {
      updatePositionForBlockComment(position, part);
    }
  }
  updatePositionForString(position, comment.after);
};

// ../parser/debug.mjs
var ASSERTIONS_ENABLED = true;
var positionString = ({ text, index }) => {
  const lines = text.split("\n");
  let row = 0;
  let lineIndex = 0;
  for (const line of lines) {
    lineIndex += line.length;
    if (lineIndex >= index) {
      return `line:${row + 1} col:${line.length - lineIndex + index + 1} index:${index}`;
    }
    row++;
    lineIndex++;
  }
  throw new Error(`Bug in parser: index ${index} out of bounds of text of length ${text.length} (lineIndex=${lineIndex} row=${row}, lines=${lines.length})`);
};
var panic = (message, cause) => {
  if (cause !== void 0) {
    cause = {
      ref: cause,
      snapshot: JSON.parse(JSON.stringify(cause))
    };
  }
  throw new Error(`Bug in parser: ${message}`, {
    cause
  });
};

// ../parser/parse-state.mjs
var moveToNextToken = (state, token) => {
  state.index += token.length;
  state.tokenIndex++;
};
var moveToNextNonEscapedToken = (state, token) => {
  state.index += token.length;
  state.tokenIndex++;
  if (token === "\\" && state.tokenIndex < state.tokens.length) {
    state.index += state.tokens[state.tokenIndex].length;
    state.tokenIndex++;
  }
};
var addError = (state, node, error) => {
  Object.freeze(error);
  if (!state.errors) {
    state.errors = /* @__PURE__ */ new Map([
      [
        node,
        [
          error
        ]
      ]
    ]);
    return;
  }
  const errorsArray = state.errors.get(node);
  if (!errorsArray) {
    state.errors.set(node, [
      error
    ]);
    return;
  }
  if (errorsArray.includes(error)) {
    return;
  }
  errorsArray.push(error);
};
var multiAddError = (state, nodes, startInclusive, endExclusive, error) => {
  for (let i = startInclusive; i < endExclusive; i++) {
    addError(state, nodes[i], error);
  }
};

// ../parser/nodes.mjs
var leafNode = (type, text) => {
  if (text.length === 0) {
    throw new Error(`empty text for type="${type}"`);
  }
  return (
    /** @type {DustLeafNode<T>} */
    {
      type,
      text,
      children: EMPTY_ARRAY
    }
  );
};
var _groupNodeUnsafe = (type, gaps, children) => (
  /** @type {DustGroupNode<T>} */
  {
    type,
    text: Object.freeze(gaps),
    children: Object.freeze(children)
  }
);
var groupNodeUnsafe = ASSERTIONS_ENABLED ? (
  /** @type {_groupNodeUnsafe} */
  (type, gaps, children) => {
    if (gaps.length !== children.length + 1) {
      panic(`Wrong number of gaps/children, gaps=${JSON.stringify(gaps)}, children=${JSON.stringify(children)} type=${type}`, {
        gaps,
        children
      });
    }
    return _groupNodeUnsafe(type, gaps, children);
  }
) : _groupNodeUnsafe;
var groupNode = groupNodeUnsafe;
var commentNode = (type, before, data, after) => (
  /** @type {DustCommentNode<T>} */
  {
    type,
    before,
    after,
    data: Object.freeze(data)
  }
);
var errorGapNode = (state, data, error) => {
  if (data === "" || data === "\n") {
    throw new Error(`empty gap with error`);
  }
  const gapNode = {
    type: "gap_string_with_error",
    before: "",
    after: "",
    data
  };
  addError(state, gapNode, error);
  return gapNode;
};
var appendNode = (gaps, precedingGap, nodes, node) => {
  gaps.push(precedingGap);
  nodes.push(node);
  return "";
};
var EMPTY_ARRAY = Object.freeze([]);

// ../parser/comments.mjs
var parseLineComment = (state) => {
  const tokens = state.tokens;
  moveToNextToken(state, tokens[state.tokenIndex]);
  const commentStart = state.index;
  while (state.tokenIndex < tokens.length) {
    const token = tokens[state.tokenIndex];
    moveToNextToken(state, token);
    if (token === "\n") {
      break;
    }
  }
  return commentNode("line_comment", "//", state.text.slice(commentStart, state.index), "");
};
var parseBlockComment = (state) => {
  const tokens = state.tokens, startIndex = state.index;
  moveToNextToken(state, "/*");
  let stringPartStart = state.index;
  const children = [];
  while (state.tokenIndex < tokens.length) {
    const token = tokens[state.tokenIndex];
    if (token !== "*/" && token !== "/*") {
      moveToNextNonEscapedToken(state, token);
      continue;
    }
    if (stringPartStart < state.index) {
      children.push(state.text.slice(stringPartStart, state.index));
    }
    if (token === "*/") {
      moveToNextToken(state, token);
      return commentNode("block_comment", "/*", children, "*/");
    }
    children.push(parseBlockComment(state));
    stringPartStart = state.index;
  }
  if (stringPartStart < state.index) {
    children.push(state.text.slice(stringPartStart, state.index));
  }
  const comment = commentNode("block_comment", "/*", children, "");
  addError(state, comment, {
    message: `End token "*/" not found for corresponding "/*" (started at ${positionString({
      index: startIndex,
      text: state.text
    })})})`
  });
  return comment;
};

// ../parser/regexes.mjs
var TOKEN_SPLITTER = /([\\\n\.\(\)\[\]\{\}$\"'\“”\«»\^]|\/\/|\/\*|\*\/|[^\S\r\n]+)/;
var WHITESPACE = /^\s*$/;
var INTEGER = /^[+-]?\d+$/;
var IDENTIFIER = /^\w(\w|\-)*!?$/;

// ../parser/accessors/leaves.mjs
var isKeyword = (node, keyword) => node.type === "keyword" && node.text === keyword;
var identifierDeclarationName = (node) => node.children[1].text;

// ../parser/post-process/helpers.mjs
var splice = (gaps, nodes, start, deleteCount, replacementNode) => {
  gaps.splice(start + 1, deleteCount - 1);
  nodes.splice(start, deleteCount, replacementNode);
};
var sliceSubGroupGaps = (gaps, startInclusive, endExclusive) => {
  const subGroupGaps = gaps.slice(startInclusive, endExclusive + 1);
  subGroupGaps[0] = subGroupGaps[subGroupGaps.length - 1] = "";
  return subGroupGaps;
};
var isAfterGap = (gaps, index) => gaps[index] !== "";
var isBeforeGap = (gaps, index) => gaps[index + 1] !== "";
var isFirstOrAfterGap = (gaps, index) => index === 0 || isAfterGap(gaps, index);
var isLastOrBeforeGap = (gaps, index) => index + 2 === gaps.length || isBeforeGap(gaps, index);
var EMPTY_ARRAY2 = Object.freeze([]);
var GAPS_FOR_COMPACT_GROUP_2 = Object.freeze([
  "",
  "",
  ""
]);
var GAPS_FOR_COMPACT_GROUP_3 = Object.freeze([
  "",
  "",
  "",
  ""
]);

// ../parser/post-process/create-inline-groups.mjs
var createInlineGroups = (state, gaps, nodes, startIndex) => {
  parseDollarSignsAndUnaryMinuses(state, gaps, nodes, startIndex);
  parsePeriods(state, gaps, nodes, startIndex);
  parseCompactExponents(state, gaps, nodes, startIndex);
};
var parseDollarSignsAndUnaryMinuses = (state, gaps, nodes, startIndex) => {
  for (let index = startIndex; index < nodes.length; index++) {
    const node = nodes[index];
    if (node.type === "$") {
      if (!isFirstOrAfterGap(gaps, index) && nodes[index - 1].type !== ".") {
        addError(state, nodes[index], {
          message: `Expected a '(', whitespace, or comment before '$'`
        });
        continue;
      }
      if (isLastOrBeforeGap(gaps, index) || nodes[index + 1].type === ".") {
        continue;
      }
      const nextNode = nodes[index + 1];
      if (nextNode.type !== "identifier") {
        addError(state, nextNode, {
          message: `Expected identifier, whitespace, bracket, or '.' after '$'`
        });
        continue;
      }
      splice(gaps, nodes, index, 2, groupNode("identifier_declaration", GAPS_FOR_COMPACT_GROUP_2, [
        node,
        nextNode
      ]));
    } else if (isOperator(node, "-")) {
      if (!isFirstOrAfterGap(gaps, index) && nodes[index - 1].type !== ".") {
        continue;
      }
      const nextIndex = index + 1;
      if (nextIndex === nodes.length) {
        addError(state, node, {
          message: `Expected an expression after '-'`
        });
        continue;
      }
      const nextNode = nodes[nextIndex];
      if (isBeforeGap(gaps, index)) {
        continue;
      }
      switch (nextNode.type) {
        case ".":
        case "keyword":
        case "operator":
          addError(state, nextNode, {
            message: `A "${nextNode.type}" is not allowed after '-'`
          });
          continue;
      }
      if (isLastOrBeforeGap(gaps, nextIndex)) {
        splice(gaps, nodes, index, 2, groupNode("function_call", GAPS_FOR_COMPACT_GROUP_2, [
          node,
          nextNode
        ]));
        continue;
      }
      let possibleEnd = nextIndex + 1;
      while (!isLastOrBeforeGap(gaps, possibleEnd)) {
        possibleEnd++;
      }
      addError(state, node, {
        message: `Ambiguous order of operations: '-' may refer to the node immediately after it, or to the next ${possibleEnd - index} nodes, or possibly something in between. Please add parentheses to disambiguate.`
      });
    }
  }
};
var parsePeriods = (state, gaps, nodes, startIndex) => {
  for (let index = startIndex; index < nodes.length - 1; ) {
    const node = nodes[index];
    if (node.type !== ".") {
      index++;
      continue;
    }
    const nextNode = nodes[index + 1];
    switch (nextNode.type) {
      case "$":
      case ":":
      case "=":
      case ".":
        addError(state, nextNode, {
          message: `Unexpected '${nextNode.text}' after '.'`
        });
        index += 2;
        continue;
      case "keyword":
      case "operator":
      case "character":
      case "text":
      case "variable_declaration":
      case "typed_declaration":
      case "definition":
      case "function_called":
        addError(state, nextNode, {
          message: `Unexpected ${nextNode.type} after '.'`
        });
        index += 2;
        continue;
    }
    if (isBeforeGap(gaps, index)) {
      let gap = gaps[index + 1];
      const error = {
        message: `Unexpected gap between '.' and the function being called`
      };
      if (typeof gap === "string") {
        if (gap === "\n") {
          addError(state, node, error);
        } else {
          gaps[index + 1] = gap = errorGapNode(state, gap, error);
        }
      } else {
        addError(state, Array.isArray(gap) ? gap[0] : gap, error);
      }
      splice(gaps, nodes, index, 2, groupNode("function_called", [
        "",
        gap,
        ""
      ], [
        node,
        nextNode
      ]));
      index++;
      continue;
    }
    if (isFirstOrAfterGap(gaps, index)) {
      splice(gaps, nodes, index, 2, groupNode("function_called", GAPS_FOR_COMPACT_GROUP_2, [
        node,
        nextNode
      ]));
      index++;
      continue;
    }
    const prevNode = nodes[index - 1];
    splice(gaps, nodes, index - 1, 3, prevNode.type === "integer_literal" && nextNode.type === "integer_literal" ? leafNode("decimal_literal", `${prevNode.text}.${nextNode.text}`) : groupNode("function_call", GAPS_FOR_COMPACT_GROUP_2, [
      prevNode,
      groupNode("function_called", GAPS_FOR_COMPACT_GROUP_2, [
        node,
        nextNode
      ])
    ]));
  }
  if (nodes[nodes.length - 1].type === ".") {
    addError(state, nodes[nodes.length - 1], {
      message: `Expected expression after '.'`
    });
  }
};
var parseCompactExponents = (state, gaps, nodes, startIndex) => {
  if (isOperator(nodes[startIndex], "^")) {
    addError(state, nodes[startIndex], {
      message: `Expected expression before '^'`
    });
  }
  let index = startIndex + 1;
  while (index < nodes.length - 1) {
    const node = nodes[index];
    if (!isOperator(node, "^")) {
      index++;
      continue;
    }
    const prevNode = checkNodeNextToExponentOperator(state, nodes[index - 1], "before"), nextNode = checkNodeNextToExponentOperator(state, nodes[index + 1], "after");
    if (!prevNode || !nextNode || isAfterGap(gaps, index) || isBeforeGap(gaps, index)) {
      index++;
      continue;
    }
    splice(gaps, nodes, index - 1, 3, groupNode("function_call", GAPS_FOR_COMPACT_GROUP_3, [
      prevNode,
      node,
      nextNode
    ]));
    continue;
  }
  if (isOperator(nodes[nodes.length - 1], "^")) {
    addError(state, nodes[nodes.length - 1], {
      message: `Expected expression after '^'`
    });
  }
};
var checkNodeNextToExponentOperator = (state, node, position) => {
  switch (node.type) {
    // TODO: it may be better to specify the types that *are* allowed
    case "$":
    case ":":
    case "=":
    case ".":
    case "keyword":
    case "operator":
    case "character":
    case "text":
    case "variable_declaration":
    case "typed_declaration":
    case "definition":
    case "function_called":
    case "record":
    case "array":
      addError(state, node, {
        message: `Unexpected ${node.type} ${position} '^'`
      });
      return null;
  }
  return node;
};
var isOperator = (node, operator) => node.type === "operator" && node.text === operator;

// ../parser/indefinite-articles.mjs
var INDEFINITE_ARTICLES_FOR_KEYWORDS = {
  __proto__: null,
  string: "a",
  unparseable_group: "an",
  program: "a",
  unit: "a",
  parenthesized_value: "a",
  identifier_declaration: "an",
  variable_declaration: "a",
  set_declaration: "a",
  write_declaration: "a",
  typed_declaration: "a",
  definition: "a",
  function_called: "a",
  function_call: "a",
  if_expression: "an",
  match_expression: "a",
  in_expression: "an",
  definition_group: "a",
  do_expression: "a",
  do_expression_with_label: "a",
  loop: "a",
  loop_with_label: "a",
  while_loop: "a",
  while_loop_with_label: "a",
  do_while_loop: "a",
  do_while_loop_with_label: "a",
  for_loop: "a",
  for_loop_with_label: "a",
  return_expression: "a",
  return_expression_with_label: "a",
  continue_expression: "a",
  continue_expression_with_label: "a",
  record: "a",
  array: "an",
  character_literal: "a",
  fancy_string: "a",
  french_string: "a",
  keyword: "a",
  operator: "an",
  $: "a",
  ":": "a",
  "=": "a",
  ".": "a",
  integer_literal: "an",
  decimal_literal: "a",
  identifier: "an",
  character: "a",
  text: "a"
};

// ../parser/post-process/operators.mjs
var ADDITION_OPERATORS = Object.freeze([
  "+",
  "-"
]);
var MULTIPLICATION_OPERATORS = Object.freeze([
  "*",
  "/",
  "\xF7",
  "mod",
  "rem",
  "^"
]);
var EQUALITY_OPERATORS = Object.freeze([
  "==",
  "!=",
  "\u2260"
]);
var LESS_THAN_OPERATORS = Object.freeze([
  "<",
  "<=",
  "\u2264"
]);
var GREATER_THAN_OPERATORS = Object.freeze([
  ">",
  ">=",
  "\u2265"
]);
var SUBSET_OPERATORS = Object.freeze([
  "\u2282",
  "\u2286"
]);
var SUPERSET_OPERATORS = Object.freeze([
  "\u2283",
  "\u2287"
]);
var MATH_OPERATORS = Object.freeze(ADDITION_OPERATORS.concat(MULTIPLICATION_OPERATORS));
var COMPATIBLE_OPERATORS = {
  __proto__: null,
  "+": ADDITION_OPERATORS,
  "-": ADDITION_OPERATORS,
  "*": MULTIPLICATION_OPERATORS,
  "/": MULTIPLICATION_OPERATORS,
  "\xF7": MULTIPLICATION_OPERATORS,
  "mod": MULTIPLICATION_OPERATORS,
  "rem": MULTIPLICATION_OPERATORS,
  "^": MULTIPLICATION_OPERATORS,
  "and": Object.freeze([
    "and"
  ]),
  "or": Object.freeze([
    "or"
  ]),
  "xor": Object.freeze([
    "xor"
  ]),
  "not": Object.freeze([
    "not"
  ]),
  "==": EQUALITY_OPERATORS,
  "!=": EQUALITY_OPERATORS,
  "\u2260": EQUALITY_OPERATORS,
  "<": LESS_THAN_OPERATORS,
  "<=": LESS_THAN_OPERATORS,
  "\u2264": LESS_THAN_OPERATORS,
  ">": GREATER_THAN_OPERATORS,
  ">=": GREATER_THAN_OPERATORS,
  "\u2265": GREATER_THAN_OPERATORS,
  "<:": Object.freeze([
    "<:"
  ]),
  ":>": Object.freeze([
    ":>"
  ]),
  "\u2282": SUBSET_OPERATORS,
  "\u2286": SUBSET_OPERATORS,
  "\u2283": SUPERSET_OPERATORS,
  "\u2287": SUPERSET_OPERATORS,
  "++": Object.freeze([
    "++"
  ])
};
Object.freeze(COMPATIBLE_OPERATORS);

// ../parser/post-process/chained-function-calls.mjs
var createGroupsForChainedFunctionCalls = (state, gaps, nodes) => {
  let firstFunctionOrOperator, allowedOperators = EMPTY_ARRAY2, index = 0;
  while (index < nodes.length) {
    const node2 = nodes[index];
    switch (node2.type) {
      // @ts-expect-error: fall through to next case
      case "keyword":
        if (node2.text !== "\u03BB") {
          addError(state, node2, {
            message: `Keyword "${node2.text}" not allowed here`
          });
          index++;
          continue;
        } else {
        }
      case "function_called":
        if (!firstFunctionOrOperator) {
          firstFunctionOrOperator = node2;
          index++;
          continue;
        }
        if (firstFunctionOrOperator.type !== "function_called") {
          addOperatorMixedWithFunctionError(state, firstFunctionOrOperator, node2);
          index++;
          continue;
        }
        break;
      case "operator":
        if (!firstFunctionOrOperator) {
          firstFunctionOrOperator = node2;
          allowedOperators = COMPATIBLE_OPERATORS[node2.text];
          index++;
          continue;
        }
        if (firstFunctionOrOperator.type !== "operator") {
          addOperatorMixedWithFunctionError(state, firstFunctionOrOperator, node2);
          index++;
          continue;
        }
        if (allowedOperators.includes(node2.text)) {
          break;
        }
        const error = {
          message: `Mixing '${firstFunctionOrOperator.text}' and '${node2.text}' together without parentheses is not allowed: Dust does not have operator precedence rules, because the order of operations can be confusing${MATH_OPERATORS.includes(node2.text) ? " (PEMDAS is not enough to cover all cases for math operators, let alone comparison and logical ones)" : ""}. Please add parentheses to clarify the order of operations.
(NOTE: ${allowedOperators.length > 1 ? `Operators compatible with '${firstFunctionOrOperator.text}' are [${allowedOperators.join(", ")}]` : `'${firstFunctionOrOperator.text}' is only compatible with itself`})`
        };
        addError(state, firstFunctionOrOperator, error);
        addError(state, node2, error);
        break;
      default:
        index++;
        continue;
    }
    splice(gaps, nodes, 0, index, groupNode("function_call", sliceSubGroupGaps(gaps, 0, index), nodes.slice(0, index)));
    index = 2;
    firstFunctionOrOperator = node2;
  }
  const node = groupNode("function_call", gaps, nodes);
  if (!firstFunctionOrOperator) {
    addError(state, node, {
      message: `Expected at least one operator or function, but found only [${nodes.map(nodeInfo).join(", ")}]. (NOTE: a function value must be called with the '.' symbol, so "a .fn b" works but "a fn b" is an error)`
    });
  }
  return node;
};
var nodeInfo = (node) => {
  if (!isLeaf(node)) {
    return node.type;
  }
  const text = node.text.length === 1 ? `'${node.text}'` : `"${node.text}"`;
  if (node.type === node.text) {
    return text;
  }
  return `${node.type}:${text}`;
};
var addOperatorMixedWithFunctionError = (state, node1, node2) => {
  operatorMixedWithFunctionError ??= {
    message: `Mixing operators and non-operator function calls together without parentheses is not allowed, because the order of operations is ambiguous. Please add parentheses to clarify the order of operations.`
  };
  addError(state, node1, operatorMixedWithFunctionError);
  addError(state, node2, operatorMixedWithFunctionError);
};
var operatorMixedWithFunctionError;

// ../parser/post-process/post-process-group-part.mjs
var condenseGroupPart = (state, gaps, nodes, startInclusive, endExclusive) => {
  if (startInclusive > endExclusive) {
    panic(`invalid arguments to postProcessGroupSlice startInclusive=${startInclusive}, endExclusive=${endExclusive}, len=${nodes.length}`);
  }
  if (startInclusive + 1 >= endExclusive || nodes.length < 2) {
    return;
  }
  splice(gaps, nodes, startInclusive, endExclusive - startInclusive, postProcessGroupPart(state, sliceSubGroupGaps(gaps, startInclusive, endExclusive), nodes.slice(startInclusive, endExclusive), null));
};
var postProcessGroupPart = (state, gaps, nodes, groupTypeIfSingleNodeLeft) => {
  const firstNode = nodes[0];
  if (firstNode.type === "keyword") {
    switch (firstNode.text) {
      case "if":
        parseIfOrMatchBranches(state, gaps, nodes, 0, "if");
        return groupNodeUnsafe("if_expression", gaps, nodes);
      case "match": {
        const firstCaseIndex = findFirstKeywordIndex(nodes, "case", 1);
        switch (firstCaseIndex) {
          case null:
            addError(state, firstNode, {
              message: `Expected at least one "case" after "match"`
            });
            return groupNodeUnsafe("match_expression", gaps, nodes);
          case 1:
            multiAddError(state, nodes, 0, 2, {
              message: `Missing expression between "match" and "case"`
            });
        }
        parseIfOrMatchBranches(state, gaps, nodes, firstCaseIndex, "case");
        condenseGroupPart(state, gaps, nodes, 1, firstCaseIndex);
        return groupNodeUnsafe("match_expression", gaps, nodes);
      }
      case "return": {
        const fromIndex = findFirstKeywordIndex(nodes, "from", 1);
        switch (fromIndex) {
          case null:
            condenseGroupPart(state, gaps, nodes, 1, nodes.length);
            return groupNodeUnsafe("return_expression", gaps, nodes);
          case nodes.length - 1:
            addError(state, nodes[fromIndex], {
              message: `Expected identifier after "from"`
            });
            break;
          default:
            if (nodes[fromIndex + 1].type !== "identifier") {
              addError(state, nodes[fromIndex + 1], {
                message: `Expected identifier after "from" but found "${nodes[fromIndex + 1].type}"`
              });
            }
            if (fromIndex + 2 < nodes.length) {
              multiAddError(state, nodes, fromIndex + 2, nodes.length, {
                message: `Unexpected node after "from ${nodes[fromIndex + 1].text}"`
              });
            }
        }
        condenseGroupPart(state, gaps, nodes, 1, fromIndex);
        return groupNodeUnsafe("return_expression_with_label", gaps, nodes);
      }
      case "continue": {
        if (nodes.length === 1) {
          return groupNodeUnsafe("continue_expression", gaps, nodes);
        }
        const fromIndex = findFirstKeywordIndex(nodes, "from", 1);
        switch (fromIndex) {
          case null:
            addError(state, nodes[1], {
              message: `Unexpected "${nodes[1].type}" after "continue". A continue expression must be one of (continue) or (continue from <loop label>).`
            });
            return groupNodeUnsafe("continue_expression", gaps, nodes);
          case nodes.length - 1:
            addError(state, nodes[fromIndex], {
              message: `Expected identifier after "from"`
            });
            break;
          default:
            if (nodes[fromIndex + 1].type !== "identifier") {
              addError(state, nodes[fromIndex + 1], {
                message: `Expected identifier after "from" but found "${nodes[fromIndex + 1].type}"`
              });
            }
            if (fromIndex + 2 < nodes.length) {
              multiAddError(state, nodes, fromIndex + 2, nodes.length, {
                message: `Unexpected node after "from ${nodes[fromIndex + 1].text}"`
              });
            }
        }
        if (fromIndex > 1) {
          multiAddError(state, nodes, 1, fromIndex, {
            message: `Unexpected node between "continue" and "from"`
          });
        }
        return groupNodeUnsafe("continue_expression_with_label", gaps, nodes);
      }
      case "do": {
        for (let i = nodes.length - 1; i > 0; i--) {
          if (!isKeyword(nodes[i], "while")) {
            continue;
          }
          if (i === 1) {
            addError(state, nodes[0], {
              message: `Missing expression between "do" and "while"`
            });
          } else {
            condenseGroupPart(state, gaps, nodes, i + 1, nodes.length);
          }
          if (i === nodes.length - 1) {
            addError(state, nodes[i], {
              message: `Missing expression after "while"`
            });
          }
          return groupNodeUnsafe(parseDoOrLoopBlock(state, gaps, nodes, 0, "do") ? "do_while_loop_with_label" : "do_while_loop", gaps, nodes);
        }
        return groupNodeUnsafe(parseDoOrLoopBlock(state, gaps, nodes, 0, "do") ? "do_expression_with_label" : "do_expression", gaps, nodes);
      }
      case "loop":
        return groupNodeUnsafe(parseDoOrLoopBlock(state, gaps, nodes, 0, "loop") ? "loop_with_label" : "loop", gaps, nodes);
      case "while": {
        const doIndex = findFirstKeywordIndex(nodes, "do", 1);
        switch (doIndex) {
          case null:
            addError(state, firstNode, {
              message: `No "do" found after "while"`
            });
            return groupNodeUnsafe("while_loop", gaps, nodes);
          case 1:
            multiAddError(state, nodes, 0, 2, {
              message: `Missing expression between "while" and "do"`
            });
        }
        const hasLabel = parseDoOrLoopBlock(state, gaps, nodes, doIndex, "do");
        condenseGroupPart(state, gaps, nodes, 1, doIndex);
        return groupNodeUnsafe(hasLabel ? "while_loop_with_label" : "while_loop", gaps, nodes);
      }
      case "for": {
        const ofIndex = findFirstKeywordIndex(nodes, "of", 1);
        switch (ofIndex) {
          case null:
            addError(state, firstNode, {
              message: `No "of" found after "for"`
            });
            return groupNodeUnsafe("for_loop", gaps, nodes);
          case 1:
            multiAddError(state, nodes, 0, 2, {
              message: `Missing expression between "for" and "of"`
            });
        }
        const doIndex = findFirstKeywordIndex(nodes, "do", ofIndex + 1);
        switch (doIndex) {
          case null:
            addError(state, firstNode, {
              message: `No "do" found after "of"`
            });
            condenseGroupPart(state, gaps, nodes, 1, ofIndex);
            return groupNodeUnsafe("for_loop", gaps, nodes);
          case ofIndex + 1:
            multiAddError(state, nodes, ofIndex, ofIndex + 2, {
              message: `Missing expression between "of" and "do"`
            });
        }
        const hasLabel = parseDoOrLoopBlock(state, gaps, nodes, doIndex, "do");
        condenseGroupPart(state, gaps, nodes, ofIndex + 1, doIndex);
        condenseGroupPart(state, gaps, nodes, 1, ofIndex);
        return groupNodeUnsafe(hasLabel ? "for_loop_with_label" : "for_loop", gaps, nodes);
      }
      case "var": {
        if (nodes[1].type !== "$") {
          addError(state, nodes[1], {
            message: `expected '$' after var`
          });
          return groupNode("unparseable_group", gaps, nodes);
        }
        const name = parseIdentifierDeclaration(state, gaps, nodes, 1, "var");
        if (name === null) {
          console.warn(`TODO return something else!`);
          return groupNode("unparseable_group", gaps, nodes);
        }
        if (nodes.length > 2) {
          multiAddError(state, nodes, 2, nodes.length, {
            message: `Unexpected node after "var $${name.text}"`
          });
        }
        return groupNodeUnsafe("variable_declaration", gaps, nodes);
      }
      case "set": {
        if (nodes.length === 1) {
          addError(state, firstNode, {
            message: `Expected identifier after "set"`
          });
          return groupNodeUnsafe("set_declaration", gaps, nodes);
        }
        const identifier = nodes[1];
        if (identifier.type !== "identifier") {
          addError(state, identifier, {
            message: `Expected identifier after "set", but got "${identifier.type}"`
          });
        }
        if (nodes.length > 2) {
          multiAddError(state, nodes, 2, nodes.length, {
            message: `Unexpected node after "set ${isLeaf(identifier) ? identifier.text : "..."}"`
          });
        }
        return groupNodeUnsafe("set_declaration", gaps, nodes);
      }
      case "write": {
        if (nodes.length === 1) {
          addError(state, firstNode, {
            message: `Expected expression after "write"`
          });
          return groupNodeUnsafe("write_declaration", gaps, nodes);
        }
        condenseGroupPart(state, gaps, nodes, 1, nodes.length);
        return groupNodeUnsafe("write_declaration", gaps, nodes);
      }
      case "as":
        const node = groupNodeUnsafe("function_call", gaps, nodes);
        addError(state, node, {
          message: `TODO post-process "${firstNode.text}" expression`
        });
        return node;
      case "\u03BB":
        break;
      case "then":
      case "else":
      case "of":
      case "from":
        addError(state, firstNode, {
          message: `"${firstNode.text}" must not be the first token in a group`
        });
    }
  }
  const inIndex = findFirstKeywordIndex(nodes, "in", 0);
  if (inIndex !== null) {
    if (inIndex + 1 < nodes.length) {
      condenseGroupPart(state, gaps, nodes, inIndex + 1, nodes.length);
    } else {
      addError(state, nodes[inIndex], {
        message: `Expected expression after "in"`
      });
    }
    if (inIndex > 0) {
      const definitions = nodes.slice(0, inIndex);
      for (const node of definitions) {
        if (node.type !== "definition") {
          addError(state, node, {
            message: `Only value definitions are allowed before "in", but this is ${INDEFINITE_ARTICLES_FOR_KEYWORDS[node.type]} "${node.type}" node`
          });
        }
      }
      splice(gaps, nodes, 0, inIndex, groupNodeUnsafe("definition_group", sliceSubGroupGaps(gaps, 0, inIndex), definitions));
    } else {
      addError(state, nodes[inIndex], {
        message: `Expected one or more definitions before "in"`
      });
    }
    return groupNodeUnsafe("in_expression", gaps, nodes);
  }
  createInlineGroups(state, gaps, nodes, 0);
  switch (nodes.length) {
    case 0:
      panic(`unexpected zero-length group`);
    case 1:
      if (nodes[0].type === "function_called") {
        return groupNode("function_call", gaps, nodes);
      }
      if (groupTypeIfSingleNodeLeft) {
        return groupNodeUnsafe(groupTypeIfSingleNodeLeft, gaps, nodes);
      }
      return nodes[0];
    default:
      return createGroupsForChainedFunctionCalls(state, gaps, nodes);
  }
};
var findFirstKeywordIndex = (nodes, keyword, start) => {
  for (let i = start; i < nodes.length; i++) {
    if (isKeyword(nodes[i], keyword)) {
      return i;
    }
  }
  return null;
};
var parseIfOrMatchBranches = (state, gaps, nodes, branchStartIndex, branchKeyword) => {
  do {
    const thenIndex = findFirstKeywordIndex(nodes, "then", branchStartIndex + 1);
    switch (thenIndex) {
      case null:
        addError(state, nodes[branchStartIndex], {
          message: `No "then" found for "${branchKeyword}"`
        });
        return;
      case branchStartIndex + 1:
        multiAddError(state, nodes, branchStartIndex, branchStartIndex + 2, {
          message: `Missing expression between "${branchKeyword}" and "then"`
        });
        break;
      case nodes.length - 1:
        addError(state, nodes[thenIndex], {
          message: `Missing expression after "then"`
        });
        condenseGroupPart(state, gaps, nodes, branchStartIndex + 1, thenIndex);
        return;
    }
    let separatorIndex = nodes.length, separator;
    for (let i = thenIndex + 1; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type === "keyword" && (node.text === branchKeyword || node.text === "else")) {
        separatorIndex = i;
        separator = node.text;
        break;
      }
    }
    switch (separatorIndex) {
      case thenIndex + 1:
        multiAddError(state, nodes, thenIndex, separatorIndex + 1, {
          message: `Missing expression between "then" and "${nodes[separatorIndex].text}"`
        });
        break;
      case nodes.length - 1:
        addError(state, nodes[separatorIndex], {
          message: `Missing expression after "${nodes[separatorIndex].text}"`
        });
        break;
    }
    if (separator === "else") {
      condenseGroupPart(state, gaps, nodes, separatorIndex + 1, nodes.length);
    }
    condenseGroupPart(state, gaps, nodes, thenIndex + 1, separatorIndex);
    condenseGroupPart(state, gaps, nodes, branchStartIndex + 1, thenIndex);
    if (!separator || separator === "else") {
      return;
    }
    branchStartIndex += 4;
  } while (true);
};
var parseDoOrLoopBlock = (state, gaps, nodes, startIndex, kind) => {
  const remainingLength = nodes.length - startIndex;
  if (remainingLength < 2) {
    addError(state, nodes[startIndex], {
      message: `Expected expression(s) after "${kind}"`
    });
    return false;
  }
  const secondNode = nodes[startIndex + 1];
  const hasLabel = secondNode.type === "$";
  if (hasLabel) {
    const name = parseIdentifierDeclaration(state, gaps, nodes, startIndex + 1, kind);
    if (name && remainingLength < 4) {
      addError(state, nodes[startIndex], {
        message: `Expected expression(s) after "${kind} $${name.text}"`
      });
    }
    startIndex++;
  }
  createInlineGroups(state, gaps, nodes, startIndex + 1);
  return hasLabel;
};
var parseIdentifierDeclaration = (state, gaps, nodes, startIndex, kind) => {
  const remainingLength = nodes.length - startIndex;
  if (remainingLength < 2) {
    addError(state, nodes[startIndex], {
      message: `Expected an identifier after "${kind} $"`
    });
    return null;
  }
  const name = nodes[startIndex + 1];
  if (name.type !== "identifier") {
    addError(state, name, {
      message: `Expected an identifier after "${kind} $", but got a "${name.type}"`
    });
    return null;
  }
  if (isBeforeGap(gaps, startIndex)) {
    multiAddError(state, nodes, startIndex, startIndex + 2, {
      message: `Found unexpected gap between "${kind} $" and "${name.text}"`
    });
    return null;
  }
  splice(gaps, nodes, startIndex, 2, groupNode("identifier_declaration", GAPS_FOR_COMPACT_GROUP_2, [
    // SAFETY: caller must ensure that nodes[startIndex] is a '$' node
    /** @type {DustLeafNode<'$'>} */
    nodes[startIndex],
    name
  ]));
  return name;
};

// ../parser/post-process/post-process-group.mjs
var postProcessGroup = (state, groupTypeGuess, gaps, nodes) => {
  switch (groupTypeGuess) {
    case "function_call":
      return postProcessParenthesizedGroup(state, gaps, nodes);
    case "array":
    case "program":
      if (nodes.length > 0) {
        createInlineGroups(state, gaps, nodes, 0);
      }
      return groupNode(groupTypeGuess, gaps, nodes);
    default:
      return groupNodeUnsafe(groupTypeGuess, gaps, nodes);
  }
};
var postProcessParenthesizedGroup = (state, gaps, nodes) => {
  switch (nodes.length) {
    case 0:
      return groupNode("unit", gaps, EMPTY_ARRAY2);
    case 1:
      if (nodes[0].type !== "keyword") {
        return groupNodeUnsafe("parenthesized_value", gaps, nodes);
      }
      switch (nodes[0].text) {
        case "return":
          return groupNodeUnsafe("return_expression", gaps, nodes);
        case "continue":
          return groupNodeUnsafe("continue_expression", gaps, nodes);
      }
      addError(state, nodes[0], {
        message: `Expected one or more expressions after "${nodes[0].text}"`
      });
      return groupNodeUnsafe("parenthesized_value", gaps, nodes);
  }
  if (isKeyword(nodes[0], "\u03BB")) {
  }
  checkFirstOrLastNode(state, "before", nodes[0]);
  checkFirstOrLastNode(state, "after", nodes[nodes.length - 1]);
  let colonIndex = -1, equalSignIndex = -1;
  for (let i = 1; i < nodes.length; i++) {
    switch (nodes[i].type) {
      case ":":
        if (colonIndex !== -1) {
          addError(state, nodes[i], {
            message: `Extra ':' found`
          });
          break;
        }
        if (equalSignIndex !== -1) {
          addError(state, nodes[i], {
            message: `Unexpected ':' found after '='`
          });
        }
        colonIndex = i;
        break;
      case "=":
        if (equalSignIndex !== -1) {
          addError(state, nodes[i], {
            message: `Extra '=' found`
          });
          break;
        }
        if (colonIndex === i - 1) {
          multiAddError(state, nodes, colonIndex, i + 1, {
            message: `Expected expression between ':' and '='`
          });
        }
        equalSignIndex = i;
        break;
    }
  }
  if (equalSignIndex !== -1) {
    condenseGroupPart(state, gaps, nodes, equalSignIndex + 1, nodes.length);
    if (colonIndex !== -1 && colonIndex < equalSignIndex) {
      condenseGroupPart(state, gaps, nodes, colonIndex + 1, equalSignIndex);
      condenseGroupPart(state, gaps, nodes, 0, colonIndex);
    } else {
      condenseGroupPart(state, gaps, nodes, 0, equalSignIndex);
    }
    return groupNodeUnsafe("definition", gaps, nodes);
  }
  if (colonIndex !== -1) {
    condenseGroupPart(state, gaps, nodes, colonIndex + 1, nodes.length);
    condenseGroupPart(state, gaps, nodes, 0, colonIndex);
    return groupNodeUnsafe("typed_declaration", gaps, nodes);
  }
  return postProcessGroupPart(state, gaps, nodes, "parenthesized_value");
};
var checkFirstOrLastNode = (state, beforeOrAfter, node) => {
  switch (node.type) {
    case ":":
    case "=":
      addError(state, node, {
        message: `Expected expression ${beforeOrAfter} '${node.type}'`
      });
  }
};

// ../parser/gaps.mjs
var appendGapToken = (gap, token) => {
  if (typeof gap === "string") {
    return gap + token;
  }
  if (Array.isArray(gap)) {
    gap[gap.length - 1].after += token;
  } else {
    gap.after += token;
  }
  return gap;
};
var appendGapNode = (gap, node) => {
  if (typeof gap === "string") {
    node.before = gap + node.before;
    return node;
  }
  if (Array.isArray(gap)) {
    gap.push(node);
    return gap;
  }
  return [
    gap,
    node
  ];
};

// ../parser/parser.mjs
var parse = (text) => {
  const state = {
    text,
    tokens: tokenize(text),
    index: 0,
    tokenIndex: 0,
    errors: null
  }, program = parseGroup("program", state, "", "");
  return [
    state.errors,
    /** @type {DustGroupNode<"program">} */
    program
  ];
};
var tokenize = (text) => text.split(TOKEN_SPLITTER).filter((it) => it !== "");
var parseGroup = (groupTypeGuess, state, startBracket, endBracket) => {
  const tokens = state.tokens, startIndex = state.index, gaps = [], children = [];
  if (startBracket) {
    moveToNextToken(state, startBracket);
  }
  let gap = startBracket;
  while (state.tokenIndex < tokens.length) {
    const token = tokens[state.tokenIndex];
    switch (token) {
      case endBracket: {
        moveToNextToken(state, token);
        gaps.push(appendGapToken(gap, endBracket));
        return postProcessGroup(state, groupTypeGuess, gaps, children);
      }
      case "(":
        gap = appendNode(gaps, gap, children, parseGroup("function_call", state, "(", ")"));
        continue;
      case "[":
        gap = appendNode(gaps, gap, children, parseGroup("array", state, "[", "]"));
        continue;
      case "{":
        gap = appendNode(gaps, gap, children, parseGroup("record", state, "{", "}"));
        continue;
      case "'":
        gap = appendNode(gaps, gap, children, parseCharacterLiteral(state));
        continue;
      case '"':
        gap = appendNode(gaps, gap, children, parseString("string", state, '"', '"'));
        continue;
      case "\u201C":
        gap = appendNode(gaps, gap, children, parseString("fancy_string", state, "\u201C", "\u201D"));
        continue;
      case "\xAB":
        gap = appendNode(gaps, gap, children, parseString("french_string", state, "\xAB", "\xBB"));
        continue;
      case "//":
        gap = appendGapNode(gap, parseLineComment(state));
        continue;
      case "/*":
        gap = appendGapNode(gap, parseBlockComment(state));
        continue;
      case ")":
      case "]":
      case "}":
      case "\u201D":
      case "\xBB":
      case "*/": {
        moveToNextToken(state, token);
        gap = appendGapNode(gap, errorGapNode(state, token, {
          message: endBracket ? `Found unmatched end token "${token}" at ${positionString(state)} (expected "${endBracket}" since the current group was opened with start token "${startBracket}" at ${positionString(state)})` : `Found unmatched end token "${token}" at ${positionString(state)} (at root level)`
        }));
        continue;
      }
      case "$":
      case ":":
      case "=":
      case ".": {
        moveToNextToken(state, token);
        gap = appendNode(gaps, gap, children, leafNode(token, token));
        continue;
      }
      case "if":
      case "then":
      case "else":
      case "match":
      case "case":
      case "do":
      case "return":
      case "from":
      case "loop":
      case "while":
      case "for":
      case "of":
      case "continue":
      case "var":
      case "set":
      case "write":
      case "in":
      case "as":
      case "\u03BB": {
        moveToNextToken(state, token);
        gap = appendNode(gaps, gap, children, leafNode("keyword", token));
        continue;
      }
      case "+":
      case "-":
      case "*":
      case "/":
      case "\xF7":
      case "mod":
      case "rem":
      case "^":
      case "and":
      case "or":
      case "xor":
      case "not":
      case "==":
      case "!=":
      case "\u2260":
      case "<":
      case "<=":
      case "\u2264":
      case ">":
      case ">=":
      case "\u2265":
      case "<:":
      case ":>":
      case "\u2282":
      case "\u2286":
      case "\u2283":
      case "\u2287":
      case "++": {
        moveToNextToken(state, token);
        gap = appendNode(gaps, gap, children, leafNode("operator", token));
        continue;
      }
    }
    moveToNextToken(state, token);
    if (WHITESPACE.test(token)) {
      gap = appendGapToken(gap, token);
      continue;
    }
    if (INTEGER.test(token)) {
      gap = appendNode(gaps, gap, children, leafNode("integer_literal", token));
      continue;
    }
    if (IDENTIFIER.test(token)) {
      gap = appendNode(gaps, gap, children, leafNode("identifier", token));
      continue;
    }
    if (token[0] === "-") {
      const identifier = token.slice(1);
      if (IDENTIFIER.test(identifier)) {
        gap = appendNode(gaps, gap, children, leafNode("operator", "-"));
        gap = appendNode(gaps, gap, children, leafNode("identifier", identifier));
        continue;
      }
    }
    const errorNode = leafNode("identifier", token);
    addError(state, errorNode, {
      message: `Invalid token`
    });
    gap = appendNode(gaps, gap, children, errorNode);
  }
  gaps.push(gap);
  const group = postProcessGroup(state, groupTypeGuess, gaps, children);
  if (startBracket) {
    addError(state, group, {
      message: `End token "${endBracket}" not found for corresponding "${startBracket}" (started at ${positionString({
        index: startIndex,
        text: state.text
      })})`
    });
  }
  return group;
};
var parseString = (stringType, state, startQuote, endQuote) => {
  const tokens = state.tokens, startIndex = state.index, gaps = [], children = [];
  moveToNextToken(state, startQuote);
  let stringPartStart = state.index, gap = startQuote;
  while (state.tokenIndex < tokens.length) {
    const token = tokens[state.tokenIndex];
    if (token !== endQuote && token !== startQuote && token !== "{") {
      moveToNextNonEscapedToken(state, token);
      continue;
    }
    if (stringPartStart < state.index) {
      const stringPart = state.text.slice(stringPartStart, state.index);
      if (stringPart.includes("\n")) {
        const multilineIndent = startIndex - state.text.lastIndexOf("\n", startIndex), lines = stringPart.split("\n"), lastLine = lines.length - 1;
        gap = appendNode(gaps, gap, children, leafNode("text", lines[0] + "\n"));
        for (let i = 1; i <= lastLine; i++) {
          const line = lines[i];
          gap = line.slice(0, multilineIndent);
          if (!WHITESPACE.test(gap)) {
            gap = errorGapNode(state, gap, {
              message: `Multi-line strings only include the part that's to the right of the opening quote: everything else must be whitespace`
            });
          }
          let lineStringPart = line.slice(multilineIndent);
          if (i < lastLine) {
            lineStringPart += "\n";
          } else if (lineStringPart === "") {
            continue;
          }
          gap = appendNode(gaps, gap, children, leafNode("text", lineStringPart));
        }
      } else {
        gap = appendNode(gaps, gap, children, leafNode("text", stringPart));
      }
    }
    if (token === endQuote) {
      moveToNextToken(state, token);
      gaps.push(appendGapToken(gap, endQuote));
      return groupNodeUnsafe(stringType, gaps, children);
    }
    if (token === startQuote) {
      gap = appendNode(gaps, gap, children, parseString(stringType, state, startQuote, endQuote));
    } else {
      gap = appendNode(gaps, gap, children, parseGroup("function_call", state, "{", "}"));
    }
    stringPartStart = state.index;
  }
  if (stringPartStart < state.index) {
    gaps.push(appendNode(gaps, gap, children, leafNode("text", state.text.slice(stringPartStart, state.index))));
  } else {
    gaps.push(gap);
  }
  const stringNode = groupNodeUnsafe(stringType, gaps, children);
  addError(state, stringNode, {
    message: `End token '${endQuote}' not found for corresponding  '${startQuote}' (started at ${positionString({
      index: startIndex,
      text: state.text
    })})})`
  });
  return stringNode;
};
var parseCharacterLiteral = (state) => {
  const tokens = state.tokens, startIndex = state.index;
  moveToNextToken(state, "'");
  const characterStart = state.index;
  let length = 0;
  while (state.tokenIndex < tokens.length) {
    let token = tokens[state.tokenIndex];
    if (token !== "'") {
      moveToNextToken(state, token);
      if (token === "\\" && state.tokenIndex < tokens.length) {
        token = tokens[state.tokenIndex];
        moveToNextToken(state, token);
      }
      length += token.length;
      continue;
    }
    const characterLiteral2 = groupNode("character_literal", CHARACTER_LITERAL_GAPS, [
      leafNode("character", state.text.slice(characterStart, state.index))
    ]);
    checkCharacterLiteralLength(characterLiteral2, length, state);
    moveToNextToken(state, token);
    return characterLiteral2;
  }
  const characterLiteral = groupNode("character_literal", [
    "'",
    ""
  ], [
    leafNode("character", state.text.slice(characterStart))
  ]);
  addError(state, characterLiteral, {
    message: `End token "'" not found for corresponding "'" (started at ${positionString({
      index: startIndex,
      text: state.text
    })})})`
  });
  checkCharacterLiteralLength(characterLiteral, length, state);
  return characterLiteral;
};
var checkCharacterLiteralLength = (characterLiteral, length, state) => {
  if (length === 1) {
    return;
  }
  addError(state, characterLiteral, {
    message: `Character literals must have exactly one character (not including '\\'s), but this one has ${length}.`
  });
};
var CHARACTER_LITERAL_GAPS = Object.freeze([
  "'",
  "'"
]);

// constants.mjs
var RUN_BUTTON_TITLE = "Run the program";

// debug.mjs
var DEBUG = false;
var ENABLE_VERIFIER_THREAD = false;
var debug = DEBUG ? console : null;

// html.mjs
var html = (tagName) => new HTMLElementBuilder(document.createElement(tagName));
var HTMLElementBuilder = class {
  /** @param {HTMLElementTagNameMap[K]} element */
  constructor(element) {
    this.element = element;
  }
  /** @param {Readonly<HTMLElementPropertiesMap[K]>} properties */
  set(properties) {
    Object.assign(this.element, properties);
    return this;
  }
  /** @param {(Node | string)[]} children */
  append(...children) {
    this.element.append.apply(this.element, children);
    return this;
  }
  /**
   * @template {keyof HTMLElementEventMap} T
   * @param {T} type 
   * @param {(this: HTMLElementTagNameMap[K], ev: HTMLElementEventMap[T]) => any} listener 
   * @param {boolean | AddEventListenerOptions} [options] 
   */
  on(type, listener, options) {
    this.element.addEventListener(
      type,
      // SAFETY: TypeScript only gives an error without this cast because it's using the wrong overload of `addEventListener` (I'm not sure why).
      /** @type {EventListenerOrEventListenerObject} */
      listener,
      options
    );
    return this;
  }
  /**
   * Like {@link on}, but with a custom replacement for {@link HTMLElement.addEventListener}
   * @template Listener
   * @param {(element: HTMLElementTagNameMap[K], listener: Listener, options?: boolean | AddEventListenerOptions) => void} addListenerFn 
   * @param {Listener} listener 
   * @param {boolean | AddEventListenerOptions} [options] 
   */
  onCustom(addListenerFn, listener, options) {
    addListenerFn(this.element, listener, options);
    return this;
  }
  build() {
    return this.element;
  }
};
var createTextElement = (tagName, text, properties) => {
  const element = document.createElement(tagName);
  if (properties) {
    Object.assign(element, properties);
  }
  element.append(text);
  return (
    /** @type {HTMLElementTagNameMap[K] & TextElement} */
    element
  );
};
var svg = (attributes, ...children) => {
  const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries(attributes)) {
    svg2.setAttribute(key, value);
  }
  svg2.append.apply(svg2, children);
  return svg2;
};
var path = (d, attributes) => {
  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      path2.setAttribute(key, value);
    }
  }
  path2.setAttribute("d", d);
  return path2;
};
var rect = (attributes) => {
  const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  for (const [key, value] of Object.entries(attributes)) {
    rect2.setAttribute(key, String(value));
  }
  return rect2;
};
var circle = (attributes) => {
  const circle2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  for (const [key, value] of Object.entries(attributes)) {
    circle2.setAttribute(key, String(value));
  }
  return circle2;
};
var setAttributeIfChanged = (element, name, value) => {
  if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
};
var removeAttributeIfPresent = (element, name) => {
  if (element.hasAttribute(name)) {
    element.removeAttribute(name);
  }
};
var setPropertyIfChanged = (style, name, value) => {
  if (style.getPropertyValue(name) !== value) {
    style.setProperty(name, value);
  }
};

// line-numbers.mjs
var LINE_COUNT_MARGIN = "--line-count-margin";
var updateLineNumbers = (lineNumbers, container, lineCount) => {
  let lineElementCount = lineNumbers.childElementCount;
  if (lineElementCount === lineCount) {
    return;
  }
  const lineCountWidth = String(lineCount).length + 2, lineCountMargin = `${lineCountWidth + 2}ch`;
  if (container.style.getPropertyValue(LINE_COUNT_MARGIN) !== lineCountMargin) {
    container.style.setProperty(LINE_COUNT_MARGIN, lineCountMargin);
    let lineNumber = 1;
    for (const lineDiv of lineNumbers.children) {
      lineDiv.firstChild.data = String(lineNumber).padStart(lineCountWidth);
      lineNumber++;
    }
  }
  for (; lineElementCount > lineCount; lineElementCount--) {
    lineNumbers.lastElementChild.remove();
  }
  for (; lineElementCount < lineCount; lineElementCount++) {
    lineNumbers.append(createTextElement("div", String(lineElementCount + 1).padStart(lineCountWidth)));
  }
};

// workers/constants.mjs
var VNODE_CLASS_NAME = 0;
var VNODE_TITLE = 1;
var VNODE_TEXT = 2;

// patch-html.mjs
var patchSpans = (output, virtualSpans) => {
  let node = output.firstChild, i = 0;
  for (; i < virtualSpans.length; i++) {
    if (!node) {
      for (; i < virtualSpans.length; i++) {
        output.append(makeSpan(virtualSpans[i]));
      }
      return;
    }
    node = patchNode(
      virtualSpans[i],
      /** @type {TextElement} */
      node
    ).nextSibling;
  }
  while (node) {
    const nextNode = node.nextSibling;
    node.remove();
    node = nextNode;
  }
};
var makeSpan = (virtualNode) => {
  const realNode = document.createElement("span");
  realNode.className = virtualNode[VNODE_CLASS_NAME];
  if (virtualNode[VNODE_TITLE]) {
    realNode.title = virtualNode[VNODE_TITLE];
  }
  realNode.textContent = virtualNode[VNODE_TEXT];
  return (
    /** @type {TextElement} */
    realNode
  );
};
var patchNode = (virtualNode, realNode) => {
  const className = virtualNode[VNODE_CLASS_NAME], title = virtualNode[VNODE_TITLE], text = virtualNode[VNODE_TEXT], textNode = realNode.firstChild;
  if (realNode.className !== className) {
    realNode.className = className;
  }
  if (title && realNode.title !== title) {
    realNode.title = title;
  }
  if (!title && realNode.title) {
    realNode.removeAttribute("title");
  }
  if (textNode.data !== text) {
    textNode.data = text;
  }
  return realNode;
};

// patch-svg.mjs
var SHAPE_TYPE = 0;
var SHAPE_NODE_TYPE = 1;
var SHAPE_COLOR_INDEX = 2;
var RECT_X = 3;
var RECT_Y = 4;
var RECT_WIDTH = 5;
var RECT_HEIGHT = 6;
var RECT_RADIUS = 7;
var PATH_D = 3;
var patchOutlines = (output, virtualOutlines, width, height) => {
  setAttributeIfChanged(output, "viewBox", `0 0 ${width} ${height}`);
  let node = output.firstChild, i = 0;
  for (; i < virtualOutlines.length; i++) {
    if (!node) {
      for (; i < virtualOutlines.length; i++) {
        output.append(makeShape(virtualOutlines[i]));
      }
      return;
    }
    node = patchElement(
      virtualOutlines[i],
      /** @type {SVGElement} */
      node
    ).nextSibling;
  }
  while (node) {
    const nextNode = node.nextSibling;
    node.remove();
    node = nextNode;
  }
};
var makeShape = (shape) => {
  let realNode;
  switch (shape[SHAPE_TYPE]) {
    case "rect":
      realNode = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      realNode.setAttribute("x", String(shape[RECT_X]));
      realNode.setAttribute("y", String(shape[RECT_Y]));
      realNode.setAttribute("width", String(shape[RECT_WIDTH]));
      realNode.setAttribute("height", String(shape[RECT_HEIGHT]));
      realNode.setAttribute("rx", String(shape[RECT_RADIUS]));
      break;
    case "path":
      realNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
      realNode.setAttribute("d", shape[PATH_D]);
      break;
  }
  realNode.setAttribute("class", shape[SHAPE_NODE_TYPE]);
  realNode.style.setProperty("--outline-stroke", `var(--outline-color-${shape[SHAPE_COLOR_INDEX] + 1})`);
  return realNode;
};
var patchElement = (shape, realNode) => {
  if (realNode.tagName !== shape[SHAPE_TYPE]) {
    const newNode = makeShape(shape);
    realNode.replaceWith(newNode);
    return newNode;
  }
  switch (shape[SHAPE_TYPE]) {
    case "rect":
      setAttributeIfChanged(realNode, "x", String(shape[RECT_X]));
      setAttributeIfChanged(realNode, "y", String(shape[RECT_Y]));
      setAttributeIfChanged(realNode, "width", String(shape[RECT_WIDTH]));
      setAttributeIfChanged(realNode, "height", String(shape[RECT_HEIGHT]));
      setAttributeIfChanged(realNode, "rx", String(shape[RECT_RADIUS]));
      break;
    case "path":
      setAttributeIfChanged(realNode, "d", shape[PATH_D]);
      break;
  }
  setAttributeIfChanged(realNode, "class", shape[SHAPE_NODE_TYPE]);
  setPropertyIfChanged(realNode.style, "--outline-stroke", `var(--outline-color-${shape[SHAPE_COLOR_INDEX] + 1})`);
  return realNode;
};

// grid-resizer.mjs
var HORIZONTAL_RESULTS_DIVIDER = "horizontal-results-divider";
var PROGRAM_FR = "--program-fr";
var programFrLocalStorageKey = (state) => `${state.localStorageID} ${PROGRAM_FR}`;
var resultsDividerIsVertical = (state) => !state.editor.classList.contains(HORIZONTAL_RESULTS_DIVIDER);
var setUpGridResizer = (state) => {
  const stored = localStorage.getItem(programFrLocalStorageKey(state));
  if (stored !== null) {
    state.editor.style.setProperty(PROGRAM_FR, stored);
  }
  state.gridResizer.addEventListener("pointerdown", resizeStart.bind(state), {
    capture: true
  });
  new ResizeObserver(updateResultsDividerOrientation.bind(state)).observe(state.editor);
};
var resizeStart = function(event) {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  const initialCursor = this.editor.style.cursor;
  let resizeFn;
  if (resultsDividerIsVertical(this)) {
    resizeFn = resizeLeftRight;
    this.editor.style.cursor = "ew-resize";
  } else {
    resizeFn = resizeUpDown;
    this.editor.style.cursor = "ns-resize";
  }
  const abortController = new AbortController(), resizeEndFn = resizeEnd.bind(this, event.pointerId, abortController, initialCursor), options = {
    signal: abortController.signal
  }, resizer = this.gridResizer;
  resizer.style.backgroundColor = "var(--grid-resizing-background-color)";
  resizer.setPointerCapture(event.pointerId);
  resizer.addEventListener("pointermove", resizeFn.bind(this, event.pointerId), options);
  resizer.addEventListener("pointerup", resizeEndFn, options);
  resizer.addEventListener("pointercancel", resizeEndFn, options);
};
var resizeEnd = function(pointerId, abortController, initialCursor, event) {
  if (event.pointerId !== pointerId) {
    return;
  }
  debug?.log(`stopped resizing due to "${event.type}"`, event);
  abortController.abort();
  this.gridResizer.style.removeProperty("background-color");
  if (initialCursor) {
    this.editor.style.cursor = initialCursor;
  } else {
    this.editor.style.removeProperty("cursor");
  }
  localStorage.setItem(programFrLocalStorageKey(this), this.editor.style.getPropertyValue(PROGRAM_FR));
};
var resizeLeftRight = function(pointerId, event) {
  if (event.pointerId !== pointerId) {
    return;
  }
  setProgramFr(this, {
    start: this.contents.getBoundingClientRect().left,
    end: this.results.getBoundingClientRect().right,
    pointer: event.clientX
  });
};
var resizeUpDown = function(pointerId, event) {
  if (event.pointerId !== pointerId) {
    return;
  }
  setProgramFr(this, {
    start: this.contents.getBoundingClientRect().top,
    end: this.results.getBoundingClientRect().bottom,
    pointer: event.clientY
  });
};
var setProgramFr = (state, { start, end, pointer }) => {
  const fraction = Math.max(0.1, Math.min((pointer - start) / (end - start), 0.9));
  state.editor.style.setProperty(PROGRAM_FR, `${fraction / (1 - fraction)}fr`);
};
var updateResultsDividerOrientation = function() {
  let availableWidth;
  if (resultsShown(this) && resultsDividerIsVertical(this)) {
    availableWidth = this.results.getBoundingClientRect().right - this.contents.getBoundingClientRect().left;
  } else {
    availableWidth = this.contents.getBoundingClientRect().width;
  }
  if (availableWidth >= this.widthThresholdForVerticalGridSplitInCharacters * this.characterWidth) {
    this.editor.classList.remove(HORIZONTAL_RESULTS_DIVIDER);
  } else {
    this.editor.classList.add(HORIZONTAL_RESULTS_DIVIDER);
  }
};

// icons.mjs
var ICON_RECT_CORNER_RADIUS = "0.5";
var makeCenteredRectangle = (width, height, fill) => rect({
  width,
  height,
  x: 5 - width / 2,
  y: 5 - height / 2,
  rx: ICON_RECT_CORNER_RADIUS,
  fill
});
var makeXIcon = (fill) => {
  const rectangleLength = 5.5, rectangleWidth = 1.5;
  return svg({
    viewBox: "0 0 10 10",
    style: "rotate: 45deg;"
  }, circle({
    cx: 5,
    cy: 5,
    r: 5,
    fill
  }), makeCenteredRectangle(rectangleLength, rectangleWidth, "#fff"), makeCenteredRectangle(rectangleWidth, rectangleLength, "#fff"));
};
var fullScreenIcon = svg({
  viewBox: "0 0 16 16"
}, path("M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5M.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5m15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5"));
var fullScreenExitIcon = svg({
  viewBox: "0 0 16 16"
}, path("M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5m5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5M0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5m10 1a1.5 1.5 0 0 1 1.5-1.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0z"));
var settingsIcon = svg({
  viewBox: "0 0 16 16"
}, path("M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z", {
  "fill-rule": "evenodd"
}));
var runningIcon = svg({
  class: "spinning",
  viewBox: "0 0 10 10"
}, circle({
  cx: 5,
  cy: 5,
  r: 5,
  fill: "grey"
}), rect({
  width: 1.5,
  height: 4.5,
  x: 5 - 1.5 / 2,
  y: 0.5,
  rx: ICON_RECT_CORNER_RADIUS,
  fill: "#fff"
}));
var successIcon = svg({
  viewBox: "0 0 64 64"
}, path("M32,2C15.431,2,2,15.432,2,32c0,16.568,13.432,30,30,30c16.568,0,30-13.432,30-30C62,15.432,48.568,2,32,2z M25.025,50  l-0.02-0.02L24.988,50L11,35.6l7.029-7.164l6.977,7.184l21-21.619L53,21.199L25.025,50z", {
  fill: "#43a047"
}));
var errorIcon = makeXIcon("#dd3333");
var stoppedIcon = makeXIcon("grey");
var eyeIcon = svg({
  viewBox: "0 0 16 16"
}, path("M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"), path("M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"));
var eyeCrossedOutIcon = svg({
  viewBox: "0 0 16 16"
}, path("m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"), path("M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12-.708.708z"));

// platform.mjs
var specialKeyName = (
  // NOTE: clean up if https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgentData becomes standard
  /** @type {{readonly userAgentData?: {readonly platform: string}}} */
  (navigator.userAgentData?.platform ?? navigator.platform).includes("Mac") ? "\u2318" : "Ctrl"
);
var specialKeyPressed = specialKeyName === "\u2318" ? (event) => event.metaKey : (event) => event.ctrlKey;
var specializeBasedOnDeviceType = (state, signal) => {
  const selection = document.getSelection(), isMobile = (console.warn(`TODO detect mobile`), true);
  console.warn(`TODO add "desktop mode" option in settings page`);
  if (!selection || !isMobile) {
    return;
  }
  state.program.contentEditable = "plaintext-only";
  state.program.style.caretColor = "transparent";
  state.program.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  }, {
    signal
  });
  document.addEventListener("selectionchange", (event) => {
    console.log(`${(/* @__PURE__ */ new Date()).toISOString()} selection:
from ${selection.anchorOffset} in`, selection.anchorNode, `
to ${selection.focusOffset} in`, selection.focusNode, `
active:`, state.shadowRoot.activeElement, `
`, event);
    if (state.shadowRoot.activeElement === state.program) {
      selection.setPosition(state.program, 0);
    }
  }, {
    signal
  });
};

// timer.mjs
var MILLISECONDS_PER_MINUTE = 1e3 * 60;
var MILLISECONDS_PER_HOUR = MILLISECONDS_PER_MINUTE * 60;
var startTimer = (node) => {
  const start = performance.now();
  const update = () => {
    node.data = millisecondsToHoursMinutesSeconds(performance.now() - start);
    id = requestAnimationFrame(update);
  };
  let id = requestAnimationFrame(update);
  return () => cancelAnimationFrame(id);
};
var millisecondsToHoursMinutesSeconds = (milliseconds) => {
  const remainingMsAfterHours = milliseconds % MILLISECONDS_PER_HOUR, remainingMsAfterMinutes = remainingMsAfterHours % MILLISECONDS_PER_MINUTE;
  return `${String(Math.floor(milliseconds / MILLISECONDS_PER_HOUR)).padStart(2, "0")}:${String(Math.floor(remainingMsAfterHours / MILLISECONDS_PER_MINUTE)).padStart(2, "0")}:${String(Math.floor(remainingMsAfterMinutes / 1e3)).padStart(2, "0")}:${String(Math.floor(remainingMsAfterMinutes % 1e3)).padStart(3, "0")}`;
};
var millisecondsToReadableString = (milliseconds) => {
  const seconds = milliseconds / 1e3;
  if (seconds < 1) {
    return `${milliseconds.toFixed(2)}ms`;
  }
  const minutes = seconds / 60;
  if (minutes < 1) {
    return `${seconds.toFixed(2)}s`;
  }
  return `${(minutes / 60).toFixed(2)}hrs`;
};

// workers/virtual-html.mjs
var dustNodeToVirtualHTML = (node, errorsMap) => {
  const result = [];
  addVirtualNodes(result, node, "", errorsMap, void 0);
  return result;
};
var addVirtualNodes = (result, node, containerClassName, errorsMap, ancestorErrors) => {
  const allErrors = getAllErrors(node, errorsMap, ancestorErrors);
  if (isLeaf(node)) {
    let className2 = node.type;
    switch (className2) {
      case "$":
        className2 = "dollar_sign";
        break;
      case ":":
        className2 = "colon";
        break;
      case "=":
        className2 = "equal_sign";
        break;
      case ".":
        className2 = "period";
        break;
    }
    result.push([
      `${containerClassName} ${className2}`,
      allErrors ? makeErrorTitle(allErrors) : null,
      node.text
    ]);
    return;
  }
  const className = node.type, children = node.children, gaps = node.text;
  let i;
  for (i = 0; i < children.length; i++) {
    addGap(result, gaps[i], className, errorsMap, allErrors);
    addVirtualNodes(result, children[i], className, errorsMap, allErrors);
  }
  addGap(result, gaps[i], className, errorsMap, allErrors);
};
var addGap = (result, gap, containerClassName, errorsMap, ancestorErrors) => {
  if (typeof gap === "string") {
    if (gap === "") {
      return;
    }
    result.push([
      `${containerClassName} gap`,
      ancestorErrors ? makeErrorTitle(ancestorErrors) : null,
      gap
    ]);
  } else if (Array.isArray(gap)) {
    for (const node of gap) {
      addCommentOrErrorGap(result, node, containerClassName, errorsMap, ancestorErrors);
    }
  } else {
    addCommentOrErrorGap(result, gap, containerClassName, errorsMap, ancestorErrors);
  }
};
var addCommentOrErrorGap = (result, node, containerClassName, errorsMap, ancestorErrors) => {
  const allErrors = getAllErrors(node, errorsMap, ancestorErrors), errorTitle = allErrors ? makeErrorTitle(allErrors) : null;
  switch (node.type) {
    case "block_comment":
      addBlockComment(result, node, errorTitle, errorsMap, allErrors);
      break;
    case "line_comment":
      result.push([
        node.type,
        errorTitle,
        node.before
      ]);
      pushIfNotEmpty(result, `${node.type} text`, errorTitle, node.data);
      pushIfNotEmpty(result, node.type, null, node.after);
      break;
    default: {
      const className = `${containerClassName} gap`;
      pushIfNotEmpty(result, className, null, node.before);
      result.push([
        className,
        errorTitle,
        node.data
      ]);
      pushIfNotEmpty(result, className, null, node.after);
    }
  }
};
var pushIfNotEmpty = (result, className, errorTitle, text) => {
  if (text === "") {
    return;
  }
  result.push([
    className,
    errorTitle,
    text
  ]);
};
var addBlockComment = (result, comment, errorTitle, errorsMap, ancestorErrors) => {
  const className = comment.type, contentsClassName = `${className} text`;
  result.push([
    className,
    errorTitle,
    comment.before
  ]);
  for (const child of comment.data) {
    if (typeof child === "string") {
      pushIfNotEmpty(result, contentsClassName, errorTitle, child);
      continue;
    }
    const allErrors = getAllErrors(child, errorsMap, ancestorErrors), childErrorTitle = allErrors ? makeErrorTitle(allErrors) : null;
    addBlockComment(result, child, childErrorTitle, errorsMap, allErrors);
  }
  result.push([
    className,
    errorTitle,
    comment.after
  ]);
};
var getAllErrors = (node, errorsMap, ancestorErrors) => {
  const ownErrors = errorsMap?.get(node);
  return ancestorErrors && ownErrors ? ancestorErrors.concat(ownErrors) : ancestorErrors ?? ownErrors;
};
var makeErrorTitle = (errors) => {
  if (errors.length === 1) {
    return "Error:\n" + errors[0].message;
  } else {
    return "Errors:\n- " + errors.map((it) => it.message).join("\n- ");
  }
};

// ../parser/accessors/blocks-and-loops.mjs
var blockOrLoopLabel = (node) => identifierDeclarationName(node.children[1]);
var whileLoopLabel = (node) => identifierDeclarationName(node.children[3]);
var forLoopLabel = (node) => identifierDeclarationName(node.children[5]);

// ../parser/accessors/control-flow.mjs
var controlFlowLabel = (node) => (
  /** @type {DustLeafNode<"identifier">} */
  node.children[node.children.length - 1].text
);

// ../parser/node-to-string.mjs
var nodeToString = (node) => {
  const strings = [];
  appendNode2(strings, node);
  return strings.join("");
};
var appendNode2 = (strings, node) => {
  if (isLeaf(node)) {
    strings.push(node.text);
    return;
  }
  const children = node.children, gaps = node.text;
  let i;
  for (i = 0; i < children.length; i++) {
    appendGap(strings, gaps[i]);
    appendNode2(strings, children[i]);
  }
  appendGap(strings, gaps[i]);
};
var appendGap = (strings, gap) => {
  if (typeof gap === "string") {
    strings.push(gap);
    return;
  }
  if (Array.isArray(gap)) {
    for (const node of gap) {
      appendGapNode2(strings, node);
    }
    return;
  }
  appendGapNode2(strings, gap);
};
var appendGapNode2 = (strings, gap) => {
  if (gap.type === "block_comment") {
    appendBlockComment(strings, gap);
    return;
  }
  strings.push(gap.before, gap.data, gap.after);
};
var appendBlockComment = (strings, comment) => {
  strings.push(comment.before);
  for (const child of comment.data) {
    if (typeof child === "string") {
      strings.push(child);
    } else {
      appendBlockComment(strings, child);
    }
  }
  strings.push(comment.after);
};

// ../parser/accessors/definitions-and-declarations.mjs
var definitionPattern = (node) => node.children[0];
console.warn(`TODO convert all console.errors here to parse errors that show up in the editor`);
var definitionName = (node) => {
  const patternNode = definitionPattern(node);
  switch (patternNode.type) {
    case "identifier_declaration":
      return identifierDeclarationName(patternNode);
    case "variable_declaration":
      return identifierDeclarationName(patternNode.children[1]);
    // TODO add accessor
    case "set_declaration":
      return patternNode.children[1].text;
    // TODO add accessor
    case "function_call": {
      const children = patternNode.children;
      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (child.type !== "function_called") {
          continue;
        }
        const fnNode = child.children[1];
        if (fnNode.type !== "identifier_declaration") {
          console.error(`Expected a function identifier declaration, but found "${fnNode.type}"`, node, nodeToString(node), child, nodeToString(child));
          return null;
        }
        return identifierDeclarationName(fnNode);
      }
      return null;
    }
    case "unparseable_group":
      return null;
    default:
      console.error(`"${patternNode.type}" patterns are not (yet) supported`, node, nodeToString(node));
      return null;
  }
};

// ../parser/accessors/gaps.mjs
var isParenthesized = (node) => {
  const firstGap = node.text[0];
  if (typeof firstGap === "string") {
    return firstGap.startsWith("(");
  }
  if (Array.isArray(firstGap)) {
    return firstGap[0].before.startsWith("(");
  }
  return firstGap.before.startsWith("(");
};

// workers/virtual-svg-shape-paths.mjs
var rectangle = (x, y, width, height) => `M ${x},${y} h ${width} v ${height} h ${-width} Z`;
var chamferedRectangle = (x, y, width, height, radius) => {
  const horizontalLineLength = width - radius * 2, verticalLineLength = height - radius * 2;
  return `M ${x + radius},${y} h ${horizontalLineLength} l ${radius},${radius} v ${verticalLineLength} l ${-radius},${radius} h ${-horizontalLineLength} l ${-radius},${-radius} v ${-verticalLineLength} Z`;
};
var roundedRectangle = (x, y, width, height, radius) => {
  const horizontalLineLength = width - radius * 2, verticalLineLength = height - radius * 2;
  return `M ${x + radius}, ${y} h ${horizontalLineLength} a ${radius},${radius} 0 0 1 ${radius},${radius} v ${verticalLineLength} a ${radius},${radius} 0 0 1 ${-radius},${radius} h ${-horizontalLineLength} a ${radius},${radius} 0 0 1 ${-radius},${-radius} v ${-verticalLineLength} a ${radius},${radius} 0 0 1 ${radius},${-radius}`;
};

// workers/virtual-svg.mjs
var RECORD_CORNER_RADIUS = 3;
var LINE_THICKNESS = 1;
var OFFSET_TOP = 1 / 3;
var drawSVGs = (lines, program, style) => {
  const characterWidth = style.characterWidth, shapes = [];
  drawGroupOutlines({
    shapes,
    lines,
    position: {
      row: 0,
      column: 0
    },
    controlFlowStack: [],
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    characterWidth,
    tickLength: characterWidth / 3,
    tickRadius: characterWidth / 4,
    numberOfOutlineColors: style.numberOfOutlineColors
  }, program, 0);
  return shapes;
};
var drawGroupOutlines = (context, node, depth) => {
  if (node.type === "array") {
    drawArrayOutlines(context, node, depth);
    return;
  }
  const { position, controlFlowStack, characterWidth, lineHeight } = context, { children, text: gaps } = node, { row: startRow, column: startColumn } = position;
  let i = 0, label = null;
  switch (node.type) {
    case "definition":
      label = definitionName(node);
      break;
    case "loop":
    case "for_loop":
    case "while_loop":
    case "do_while_loop":
    case "do_expression":
      label = "";
      break;
    case "do_expression_with_label":
    case "do_while_loop_with_label":
    case "loop_with_label":
      label = blockOrLoopLabel(node);
      break;
    case "while_loop_with_label":
      label = whileLoopLabel(node);
      break;
    case "for_loop_with_label":
      label = forLoopLabel(node);
      break;
  }
  if (label !== null) {
    controlFlowStack.push({
      label,
      outlineDepth: depth,
      arrows: []
    });
  }
  for (; i < children.length; i++) {
    updatePositionForGap(position, gaps[i]);
    const child = children[i];
    if (isLeaf(child)) {
      updatePositionForString(position, child.text);
    } else {
      drawGroupOutlines(context, child, depth + 1);
    }
  }
  updatePositionForGap(position, gaps[i]);
  switch (node.type) {
    case "unparseable_group":
    case "program":
    case "identifier_declaration":
    case "function_called":
    case "definition_group":
      return;
    case "unit":
      return;
    case "parenthesized_value":
    case "set_declaration":
    case "write_declaration":
      return;
    case "character_literal":
    case "string":
    case "fancy_string":
    case "french_string":
      return;
    case "in_expression":
    case "function_call": {
      if (!isParenthesized(node)) {
        return;
      }
      const endRow2 = position.row;
      context.shapes.push([
        "rect",
        node.type,
        colorIndex(context, depth),
        outlineStartX(startColumn, characterWidth) - LINE_THICKNESS * 2,
        outlineStartY(startRow, lineHeight, depth),
        outlineWidth(startColumn, characterWidth, findMaxWidth(context.lines, startRow, endRow2, position.column)) + LINE_THICKNESS * 4,
        outlineHeight(startRow, endRow2, lineHeight, depth),
        Math.max(0, (lineHeight - depth + 1) / 2)
      ]);
      return;
    }
    case "variable_declaration":
      if (!isParenthesized(node)) {
        return;
      }
      break;
  }
  const endRow = position.row, startX = outlineStartX(startColumn, characterWidth), startY = outlineStartY(startRow, lineHeight, depth), width = outlineWidth(startColumn, characterWidth, findMaxWidth(context.lines, startRow, endRow, position.column)), height = outlineHeight(startRow, endRow, lineHeight, depth);
  switch (node.type) {
    case "record": {
      const radius = RECORD_CORNER_RADIUS, { tickRadius, tickLength } = context, tickOffset = lineHeight / 2 - LINE_THICKNESS * depth, tickStartX = startX - tickLength, tickStartY = startY + tickOffset, verticalLineLengthShort = tickStartY - startY - radius - tickRadius, verticalLineLengthLong = height - tickOffset - radius - tickRadius, horizontalLineLength = width - radius * 2;
      context.shapes.push([
        "path",
        "record",
        colorIndex(context, depth),
        `M ${tickStartX},${tickStartY} h ${tickLength - tickRadius}  a ${tickRadius},${tickRadius} 0 0 0 ${tickRadius},${-tickRadius} v ${-verticalLineLengthShort} a ${radius},${radius} 0 0 1 ${radius},${-radius} h ${horizontalLineLength} a ${radius},${radius} 0 0 1 ${radius},${radius} v ${verticalLineLengthLong} a ${tickRadius},${tickRadius} 0 0 0 ${tickRadius},${tickRadius} h ${tickLength - tickRadius} h ${-(tickLength - tickRadius)} a ${tickRadius},${tickRadius} 0 0 0 ${-tickRadius},${tickRadius} v ${verticalLineLengthShort} a ${radius},${radius} 0 0 1 ${-radius},${radius} h ${-horizontalLineLength} a ${radius},${radius} 0 0 1 ${-radius},${-radius} v ${-verticalLineLengthLong} a ${tickRadius},${tickRadius} 0 0 0 ${-tickRadius},${-tickRadius}`
      ]);
      break;
    }
    case "definition": {
      let path2 = roundedRectangle(startX, startY, width, height, cornerRadius(context, depth));
      if (label) {
        const blockInfo = controlFlowStack.pop();
        if (!blockInfo) {
          throw new Error(`Bug: no state saved for this block`, {
            cause: node
          });
        }
        path2 = drawControlFlowArrows(path2, context, blockInfo.arrows, startX, startY);
      }
      context.shapes.push([
        "path",
        node.type,
        colorIndex(context, depth),
        path2
      ]);
      break;
    }
    case "variable_declaration":
    case "typed_declaration":
    case "if_expression":
    case "match_expression":
      context.shapes.push([
        "rect",
        node.type,
        colorIndex(context, depth),
        startX,
        startY,
        width,
        height,
        cornerRadius(context, depth)
      ]);
      break;
    case "do_expression":
    case "do_expression_with_label": {
      const blockInfo = controlFlowStack.pop();
      if (!blockInfo) {
        throw new Error(`Bug: no state saved for this block`, {
          cause: node
        });
      }
      context.shapes.push([
        "path",
        node.type,
        colorIndex(context, depth),
        drawControlFlowArrows(chamferedRectangle(startX, startY, width, height, cornerRadius(context, depth)), context, blockInfo.arrows, startX, startY)
      ]);
      break;
    }
    case "loop":
    case "loop_with_label":
    case "for_loop":
    case "for_loop_with_label":
    case "while_loop":
    case "while_loop_with_label":
    case "do_while_loop":
    case "do_while_loop_with_label": {
      const radius = cornerRadius(context, depth), arrowLength = radius * 3 / 4, arrowPointPosition = 65 * Math.PI / 180, arrowAngleOuter = 15 * Math.PI / 180, arrowAngleInner = 75 * Math.PI / 180, arrowPointX = radius * (1 - Math.cos(arrowPointPosition)), arrowPointY = radius * (1 - Math.sin(arrowPointPosition)), arrowEndOuterX = arrowPointX - arrowLength * Math.cos(arrowAngleOuter), arrowEndOuterY = arrowPointY + arrowLength * Math.sin(arrowAngleOuter), arrowEndInnerX = arrowPointX - arrowLength * Math.cos(arrowAngleInner), arrowEndInnerY = arrowPointY + arrowLength * Math.sin(arrowAngleInner);
      let path2 = roundedRectangle(startX, startY, width, height, cornerRadius(context, depth)) + ` M ${startX + arrowEndOuterX},${startY + arrowEndOuterY} L ${startX + arrowPointX},${startY + arrowPointY} L ${startX + arrowEndInnerX},${startY + arrowEndInnerY} M ${startX + width - arrowEndOuterY},${startY + arrowEndOuterX} L ${startX + width - arrowPointY},${startY + arrowPointX} L ${startX + width - arrowEndInnerY},${startY + arrowEndInnerX} M ${startX + width - arrowEndOuterX},${startY + height - arrowEndOuterY} L ${startX + width - arrowPointX},${startY + height - arrowPointY} L ${startX + width - arrowEndInnerX},${startY + height - arrowEndInnerY} M ${startX + arrowEndOuterY},${startY + height - arrowEndOuterX} L ${startX + arrowPointY},${startY + height - arrowPointX} L ${startX + arrowEndInnerY},${startY + height - arrowEndInnerX}`;
      const blockInfo = controlFlowStack.pop();
      if (!blockInfo) {
        throw new Error(`Bug: no state saved for this block`, {
          cause: node
        });
      }
      context.shapes.push([
        "path",
        node.type,
        colorIndex(context, depth),
        drawControlFlowArrows(path2, context, blockInfo.arrows, startX, startY)
      ]);
      break;
    }
    case "return_expression":
    case "continue_expression": {
      drawControlFlowOutline(node.type, context, startX, startY, width, height, depth, controlFlowStack.at(-1));
      break;
    }
    case "return_expression_with_label":
    case "continue_expression_with_label": {
      const label2 = controlFlowLabel(node);
      let block;
      for (let i2 = controlFlowStack.length - 1; i2 >= 0; i2--) {
        if (controlFlowStack[i2].label === label2) {
          block = controlFlowStack[i2];
          break;
        }
      }
      drawControlFlowOutline(node.type, context, startX, startY, width, height, depth, block);
      break;
    }
    default:
      return node;
  }
};
var colorIndex = (context, depth) => (depth - 1) % context.numberOfOutlineColors;
var cornerRadius = (context, depth) => Math.max(0, (context.fontSize - depth + 1) / 2);
var drawArrayOutlines = (context, node, depth) => {
  const { position, characterWidth, lineHeight } = context, { children, text: gaps } = node, { row: startRow, column: startColumn } = position, rows = [], columns = [];
  updatePositionForGap(position, gaps[0]);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (isLeaf(child)) {
      updatePositionForString(position, child.text);
    } else {
      drawGroupOutlines(context, child, depth + 1);
    }
    updatePositionForGap(position, gaps[i + 1]);
    rows.push(position.row);
    columns.push(position.column);
  }
  const endRow = position.row, width = outlineWidth(startColumn, characterWidth, findMaxWidth(context.lines, startRow, endRow, position.column)), startX = outlineStartX(startColumn, characterWidth), verticalLineOffset = LINE_THICKNESS * depth * 2;
  let path2 = rectangle(startX, outlineStartY(startRow, lineHeight, depth), width, outlineHeight(startRow, endRow, lineHeight, depth)), lastDividerRow = startRow;
  for (let i = 0; i < children.length - 1; i++) {
    const row = rows[i];
    if (row === lastDividerRow) {
      const x = columns[i] * characterWidth - characterWidth / 2, y = row * lineHeight + OFFSET_TOP + verticalLineOffset / 2;
      path2 += ` M ${x},${y - verticalLineOffset / 2 * +(row !== startRow)} V ${y + verticalLineOffset / 2 * +(row !== endRow) + lineHeight - verticalLineOffset}`;
    } else {
      path2 += ` M ${startX},${row * lineHeight + OFFSET_TOP} h ${width}`;
      lastDividerRow = row;
    }
  }
  context.shapes.push([
    "path",
    "array",
    colorIndex(context, depth),
    path2
  ]);
};
var drawControlFlowOutline = (nodeType, context, startX, startY, width, height, depth, block) => {
  const radius = cornerRadius(context, depth);
  if (block) {
    block.arrows.push({
      sourceLeft: startX,
      sourceTop: startY,
      cornerRadius: radius
    });
    depth = block.outlineDepth;
  }
  context.shapes.push([
    "path",
    nodeType,
    colorIndex(context, depth),
    chamferedRectangle(startX, startY, width, height, radius)
  ]);
};
var drawControlFlowArrows = (path2, context, arrows, startX, startY) => {
  const arrowTipX = startX + LINE_THICKNESS / 2, arrowX = 5, arrowY = 3;
  for (const arrow of arrows) {
    const arrowTop = arrow.sourceTop, halfRadius = arrow.cornerRadius / 2;
    if (arrowTop - startY < context.lineHeight) {
      continue;
    }
    path2 += ` M ${arrow.sourceLeft + halfRadius},${arrowTop + halfRadius} L ${arrow.sourceLeft},${arrowTop} L ${arrowTipX},${arrowTop} M ${arrowTipX + arrowX},${arrowTop - arrowY} L ${arrowTipX},${arrowTop} L ${arrowTipX + arrowX},${arrowTop + arrowY}`;
  }
  return path2;
};
var findMaxWidth = (lines, startRow, endRow, endColumn) => {
  let maxWidthExceptLastLine = 0;
  for (let i = startRow; i < endRow; i++) {
    if (lines[i].length > maxWidthExceptLastLine) {
      maxWidthExceptLastLine = lines[i].length;
    }
  }
  maxWidthExceptLastLine++;
  return Math.max(maxWidthExceptLastLine, endColumn);
};
var outlineStartX = (startColumn, characterWidth) => startColumn * characterWidth + LINE_THICKNESS / 2 + characterWidth / 2;
var outlineStartY = (startRow, lineHeight, depth) => startRow * lineHeight + LINE_THICKNESS * depth + OFFSET_TOP;
var outlineWidth = (startColumn, characterWidth, maxWidth) => (maxWidth - startColumn - 1) * characterWidth - LINE_THICKNESS;
var outlineHeight = (startRow, endRow, lineHeight, depth) => Math.max(0, (endRow + 1 - startRow) * lineHeight - LINE_THICKNESS * depth * 2);

// run-results.mjs
var RESULTS_SHOWN = "results-shown";
var resultsShown = (state) => !!state.results.parentNode;
var showResults = (state) => {
  if (resultsShown(state)) {
    return;
  }
  toggleResultsContainer.call(state);
};
var toggleResultsContainer = function() {
  let toggleButton = this.runStatus.querySelector("button");
  if (resultsShown(this)) {
    toggleButton.title = "Show results";
    toggleButton.replaceChildren(eyeIcon.cloneNode(true));
    this.resultsScrollPosition.top = this.results.scrollTop;
    this.resultsScrollPosition.left = this.results.scrollLeft;
    this.gridResizer.remove();
    this.results.remove();
    this.editor.classList.remove(RESULTS_SHOWN);
    return;
  }
  this.contents.after(this.gridResizer, this.results);
  this.results.scrollTo(this.resultsScrollPosition);
  if (!toggleButton) {
    this.runStatus.lastChild.before(toggleButton = document.createElement("button"));
    toggleButton.addEventListener("click", toggleResultsContainer.bind(this));
  }
  toggleButton.title = "Hide results";
  toggleButton.replaceChildren(eyeCrossedOutIcon.cloneNode(true));
  this.editor.classList.add(RESULTS_SHOWN);
};
var showResult = (state, textAtStart, result) => {
  const { row, column, value } = result, time = millisecondsToReadableString(result.performance);
  if (state.text === textAtStart) {
    updateLineNumberResultIndicator(state, row, column === 0 ? `${value}
(took ${time})` : `

Column ${column + 1}:
${value}
(took ${time})`, successIcon);
  }
  setResultsText(state, state.resultsText + `// Line ${row + 1}, Column ${column + 1} (took ${time})
${value}

`);
};
var showCrash = (state, textAtStart, crash) => {
  if (state.text === textAtStart) {
    updateLineNumberResultIndicator(state, crash.row, crash.error.toString(), errorIcon);
  }
};
var setResultsText = (state, text) => {
  state.resultsText = text;
  if (state.resultsUpdateQueued) {
    return;
  }
  state.resultsUpdateQueued = true;
  requestIdleCallback(updateResultsView.bind(null, state));
};
var updateResultsView = (state) => {
  state.resultsUpdateQueued = false;
  if (!resultsShown(state)) {
    return;
  }
  const { results, resultsText } = state, lines = resultsText.split("\n"), [errors, program] = parse(resultsText), virtualSpans = dustNodeToVirtualHTML(program, errors), virtualOutlines = drawSVGs(lines, program, state), width = state.characterWidth * (Math.max(...lines.map((it) => it.length)) + 1), height = state.lineHeight * lines.length;
  setPropertyIfChanged(results.style, "--program-width", `${width}px`);
  setPropertyIfChanged(results.style, "--program-height", `${height}px`);
  updateLineNumbers(results.firstChild, results, lines.length);
  patchOutlines(results.children[1], virtualOutlines, width, height);
  patchSpans(results.lastChild, virtualSpans);
  if (state.autoScrollResults) {
    results.scrollTo({
      top: results.scrollHeight,
      behavior: state.resultsScrollBehavior
    });
  }
};
var updateLineNumberResultIndicator = (state, row, title, icon) => {
  const lineNumberElementsWithResults = state.lineNumberElementsWithResults, lineNumberElement = (
    /** @type {HTMLElement} */
    state.lineNumbers.children[row]
  );
  lineNumberElement.title += title;
  lineNumberElement.firstElementChild?.remove();
  lineNumberElement.append(icon.cloneNode(true));
  if (lineNumberElementsWithResults.at(-1) !== lineNumberElement) {
    lineNumberElementsWithResults.push(lineNumberElement);
    state.lineNumberToResultRow.set(row, countNewLines(state.resultsText));
  }
};
var clearLineNumberResultIndicators = (state) => {
  for (const line of state.lineNumberElementsWithResults) {
    line.removeAttribute("title");
    line.firstElementChild?.remove();
  }
  state.lineNumberElementsWithResults.length = 0;
  state.lineNumberToResultRow.clear();
};
var countNewLines = (text) => {
  let lastNewLineIndexPlus1 = 0, row = 0;
  do {
    const nextNewLineIndex = text.indexOf("\n", lastNewLineIndexPlus1);
    if (nextNewLineIndex === -1) {
      break;
    }
    row++;
    lastNewLineIndexPlus1 = nextNewLineIndex + 1;
  } while (true);
  return row;
};
var handleResultsPointerDown = function(event) {
  if (!specialKeyPressed(event)) {
    return;
  }
  const scrollTop = this.results.scrollTop, clickedRow = Math.floor((event.clientY - this.results.getBoundingClientRect().top + scrollTop) / this.lineHeight);
  let targetResultRow, targetLineNumber = 0;
  for (const [lineNumber, resultRow] of this.lineNumberToResultRow) {
    if (resultRow > clickedRow) {
      break;
    }
    targetLineNumber = lineNumber;
    targetResultRow = resultRow;
  }
  let top = 0;
  if (targetResultRow) {
    top = targetLineNumber * this.lineHeight - (resultsDividerIsVertical(this) ? (targetResultRow - Math.round(scrollTop / this.lineHeight) + 1) * this.lineHeight : 0);
  }
  this.contents.scrollTo({
    top,
    behavior: this.resultsScrollBehavior
  });
};
var CURSOR_POINTER = "cursor-pointer";
var handleResultsPointerEnter = function(event) {
  updateCursorPointer.call(this, event);
  const abortController = new AbortController(), update = updateCursorPointer.bind(this), cleanup = cleanupCursorPointerState.bind(this, abortController), options = {
    signal: abortController.signal,
    capture: false
  };
  addEventListener("keydown", update, options);
  addEventListener("keyup", update, options);
  this.results.addEventListener("pointercancel", cleanup, options);
  this.results.addEventListener("pointerleave", cleanup, options);
};
var updateCursorPointer = function(event) {
  if (specialKeyPressed(event)) {
    this.results.classList.add(CURSOR_POINTER);
    this.results.title = "Jump to source";
  } else {
    this.results.classList.remove(CURSOR_POINTER);
    this.results.removeAttribute("title");
  }
};
var cleanupCursorPointerState = function(abortController) {
  this.results.classList.remove(CURSOR_POINTER);
  abortController.abort();
};

// update.mjs
var verifier = ENABLE_VERIFIER_THREAD ? new Worker(import.meta.resolve("./workers/worker-verifier.mjs"), {
  type: "module"
}) : null;
var EDITING_CLASS = "editing";
var setEditorText = (state, text, newCursorPosition) => {
  if (!(0 <= newCursorPosition && newCursorPosition <= text.length)) {
    throw new RangeError(`cursorPosition (${newCursorPosition}) out of bound of text of length ${text.length}`, {
      cause: {
        editor: void 0,
        text
      }
    });
  }
  const range = state.selectedRange;
  state.history.length = state.historyIndex;
  state.history.push([
    state.text,
    Object.freeze({
      ...range
    })
  ]);
  state.historyIndex++;
  removeAttributeIfPresent(state.undoButton, "disabled");
  setAttributeIfChanged(state.redoButton, "disabled", "");
  state.text = text;
  range.start = range.end = newCursorPosition;
  queueUpdateContents(state);
};
var queueUpdateContents = (state) => {
  if (state.updateQueued) {
    return;
  }
  state.updateQueued = true;
  requestAnimationFrame(updateContents.bind(null, state));
};
var updateContents = (state) => {
  state.updateQueued = false;
  const updateStart = performance.now(), text = state.text, lines = text.split("\n");
  verifier?.postMessage(text);
  let maxWidthLine = "";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxWidthLine.length) {
      maxWidthLine = lines[i];
    }
  }
  const parseProgramStart = performance.now(), [errors, program] = parse(text), parseProgramEnd = performance.now(), virtualSpans = dustNodeToVirtualHTML(program, errors), virtualSpansEnd = performance.now(), virtualOutlines = drawSVGs(lines, program, state), virtualShapesEnd = performance.now(), width = state.characterWidth * (maxWidthLine.length + 1), height = state.lineHeight * lines.length, contentsStyle = state.contents.style;
  setPropertyIfChanged(contentsStyle, "--program-width", `${width}px`);
  setPropertyIfChanged(contentsStyle, "--program-height", `${height}px`);
  clearLineNumberResultIndicators(state);
  updateLineNumbers(state.lineNumbers, state.contents, lines.length);
  const updateLineNumbersEnd = performance.now();
  patchSpans(state.program, virtualSpans);
  const updateProgramEnd = performance.now();
  patchOutlines(state.outlines, virtualOutlines, width, height);
  const updateOutlinesEnd = performance.now();
  if (errors) {
    setAttributeIfChanged(state.runButton, "disabled", "");
    setAttributeIfChanged(state.runButton, "title", "The program has parse errors. Please fix them before running.");
    setAttributeIfChanged(state.playIcon, "fill", "rgba(255, 0, 0, 0.35)");
    const classList = state.program.classList;
    if (!classList.contains(EDITING_CLASS)) {
      classList.add(EDITING_CLASS);
    }
    if (state.editingTimeoutID !== null) {
      clearTimeout(state.editingTimeoutID);
    }
    state.editingTimeoutID = setTimeout(removeEditingClass.bind(null, state), state.errorsDelayMilliseconds);
  } else {
    removeAttributeIfPresent(state.runButton, "disabled");
    setAttributeIfChanged(state.runButton, "title", RUN_BUTTON_TITLE);
    removeAttributeIfPresent(state.playIcon, "fill");
  }
  const drawSelectedRangeStart = performance.now();
  drawSelectedRange(state);
  const updateEnd = performance.now(), totalPerf = updateEnd - updateStart;
  if (totalPerf <= 15) {
    state.fastUpdates++;
    state.allUpdates.push(totalPerf);
    return;
  }
  state.slowUpdates++;
  const totalUpdates = state.fastUpdates + state.slowUpdates;
  if (totalUpdates === 1) {
    return;
  }
  state.allUpdates.push(totalPerf);
  const allUpdates = state.allUpdates.toSorted((a, b) => a - b);
  console.warn(`PERFORMANCE (update):
total:               ${totalPerf.toFixed(2)}ms
total fast updates:  ${state.fastUpdates}
total slow updates:  ${state.slowUpdates}
slow update %:       ${(100 * state.slowUpdates / totalUpdates).toFixed(2)}%
measure size:        ${(parseProgramStart - updateStart).toFixed(2)}ms
parse program:       ${(parseProgramEnd - parseProgramStart).toFixed(2)}ms
make virtual spans:  ${(virtualSpansEnd - parseProgramEnd).toFixed(2)}ms
make virtual shapes: ${(virtualShapesEnd - virtualSpansEnd).toFixed(2)}ms
update DOM:          ${(drawSelectedRangeStart - virtualShapesEnd).toFixed(2)}ms
  line numbers:      ${(updateLineNumbersEnd - virtualShapesEnd).toFixed(2)}ms
  program:           ${(updateProgramEnd - updateLineNumbersEnd).toFixed(2)}ms
    number of spans: ${virtualSpans.length}
  outlines:          ${(updateOutlinesEnd - updateProgramEnd).toFixed(2)}ms
draw selected range: ${(updateEnd - drawSelectedRangeStart).toFixed(2)}ms

stats:
  number of updates: ${allUpdates.length}
  mean:              ${(allUpdates.reduce((a, b) => a + b) / allUpdates.length).toFixed(2)}ms
  median:            ${allUpdates[Math.floor(allUpdates.length / 2)].toFixed(2)}ms
  min:               ${allUpdates[0].toFixed(2)}ms
  max:               ${allUpdates.at(-1)?.toFixed(2)}ms
`);
};
var removeEditingClass = (state) => {
  state.program.classList.remove(EDITING_CLASS);
  state.editingTimeoutID = null;
};

// selected-range.mjs
var closestPrecedingNewLine = (text, cursorPosition) => cursorPosition === 0 ? -1 : text.lastIndexOf("\n", cursorPosition - 1);
var cursorColumn = (text, cursorPosition) => cursorPosition - closestPrecedingNewLine(text, cursorPosition) - 1;
var setCursorPosition = (state, cursorPosition) => {
  const { text, selectedRange } = state, max = text.length;
  if (!(0 <= cursorPosition && cursorPosition <= max)) {
    throw new RangeError(`cursorPosition (${cursorPosition}) out of bound of text of length ${max}`, {
      cause: state
    });
  }
  state.rememberedColumn = cursorColumn(text, selectedRange.start = selectedRange.end = cursorPosition);
};
var setTextAndCursorPosition = (state, text, cursorPosition) => {
  state.rememberedColumn = cursorColumn(text, cursorPosition);
  setEditorText(state, text, cursorPosition);
};
var isRangeValid = (state, start, end) => {
  const max = state.text.length;
  return 0 <= start && start <= max && 0 <= end && end <= max;
};
var setSelectedRange = (state, start, end) => {
  const { text, selectedRange } = state;
  if (!isRangeValid(state, start, end)) {
    throw new RangeError(`start (${start}) and/or end (${end}) out of bound of text of length ${text.length}`, {
      cause: state
    });
  }
  selectedRange.start = start;
  state.rememberedColumn = cursorColumn(text, selectedRange.end = end);
};
var replaceSelectedRange = (state, replacement) => {
  const { text, selectedRange: { start, end } } = state, lower = Math.min(start, end);
  setTextAndCursorPosition(state, text.slice(0, lower) + replacement + text.slice(Math.max(start, end)), lower + replacement.length);
};

// local-storage.mjs
var setUpLocalStorage = (state, signal) => {
  const keys = {
    selectedRange: `${state.localStorageID} selected-range`,
    scrollPosition: `${state.localStorageID} scroll-position`
  }, savedRange = loadStoredObject(keys.selectedRange, state.selectedRange), savedScrollPosition = loadStoredObject(keys.scrollPosition, {
    top: 0,
    left: 0
  }), saveLocalStorageStateFn = saveLocalStorageState.bind(state, keys);
  if (savedRange && isRangeValid(state, savedRange.start, savedRange.end)) {
    setSelectedRange(state, savedRange.start, savedRange.end);
    drawSelectedRange(state);
  }
  if (savedScrollPosition) {
    state.contents.scrollTo(savedScrollPosition);
  }
  addEventListener("beforeunload", saveLocalStorageStateFn, {
    signal
  });
  addEventListener("pagehide", saveLocalStorageStateFn, {
    signal
  });
  signal.addEventListener("abort", saveLocalStorageStateFn);
};
var saveLocalStorageState = function(keys) {
  localStorage.setItem(keys.selectedRange, JSON.stringify(this.selectedRange));
  localStorage.setItem(keys.scrollPosition, JSON.stringify({
    top: this.contents.scrollTop,
    left: this.contents.scrollLeft
  }));
};
var loadStoredObject = (key, shape) => {
  const storedString = localStorage.getItem(key);
  if (storedString === null) {
    return null;
  }
  const parsedObject = parseJSON(storedString);
  if (isErr(parsedObject)) {
    console.info(parseErrorMessage({
      key,
      storedString,
      shape
    }), errCause(parsedObject));
    return null;
  }
  if (typeof parsedObject !== "object" || parsedObject === null || Array.isArray(parsedObject)) {
    console.info(parseErrorMessage({
      key,
      storedString,
      shape
    }), parsedObject);
    return null;
  }
  for (const [key2, value] of Object.entries(parsedObject)) {
    if (typeof value !== typeof shape[key2]) {
      console.info(parseErrorMessage({
        key: key2,
        storedString,
        shape
      }), parsedObject);
      return null;
    }
  }
  return (
    /** @type {T} */
    parsedObject
  );
};
var parseErrorMessage = ({ key, storedString, shape }) => `Ignoring localStorage "${key}" (${storedString}) because it's not an object with fields [${Object.keys(shape).join(", ")}] of the right types [${Object.values(shape).map((it) => typeof it).join(", ")}]`;

// style.mjs
var updateStyle = (state) => {
  const textMeasurementContext = state.textMeasurementContext, editor = state.editor, computedStyle = getComputedStyle(editor), lineHeight = parseIntegerPx(computedStyle, "--line-height", null, editor), fontSize = parseIntegerPx(computedStyle, "font-size", null, editor), fontFamily = computedStyle.fontFamily, font = `${fontSize}px ${fontFamily}`;
  if (lineHeight === null) {
    throw new Error(`"--line-height" not found`, {
      cause: {
        editor
      }
    });
  }
  if (fontSize === null) {
    throw new Error(`"font-size" not found`, {
      cause: {
        editor
      }
    });
  }
  if (fontFamily === "") {
    throw new Error(`"font-family" not found`, {
      cause: {
        editor
      }
    });
  }
  if (textMeasurementContext.font !== font) {
    textMeasurementContext.font = font;
  }
  let numberOfOutlineColors = 1;
  while (computedStyle.getPropertyValue(`--outline-color-${numberOfOutlineColors + 1}`)) {
    numberOfOutlineColors++;
  }
  const textMetrics = textMeasurementContext.measureText("0");
  state.characterWidth = textMetrics.width;
  state.characterHeight = textMetrics.fontBoundingBoxAscent + textMetrics.fontBoundingBoxDescent;
  state.lineHeight = lineHeight;
  state.fontSize = fontSize;
  state.numberOfOutlineColors = numberOfOutlineColors;
};
var parseIntegerPx = (style, propertyName, defaultValue, element) => {
  let valueString = style.getPropertyValue(propertyName);
  if (valueString === "") {
    return defaultValue;
  }
  if (!valueString.endsWith("px")) {
    console.warn(`Ignoring "${propertyName}" because "${valueString}" doesn't end with "px"`, element);
    return defaultValue;
  }
  valueString = valueString.slice(0, -2);
  const result = parseInt(valueString);
  if (isErr(result)) {
    console.warn(`Ignoring "${propertyName}" because "${valueString}" is not an integer`, element, errCause(result));
    return defaultValue;
  }
  return result;
};

// buttons.mjs
var addPressListener = (button, listener, options) => {
  button.addEventListener("pointerdown", pointerDownListener.bind(button, listener), options);
  button.addEventListener("click", keyboardClickListener.bind(button, listener), options);
};
var pointerDownListener = function(listener, event) {
  if (event.button === 0) {
    listener.call(this, event);
  }
};
var keyboardClickListener = function(listener, event) {
  if (event.pointerId === -1) {
    listener.call(this, event);
  }
};
var markActionPerformed = (button) => {
  const existingTimeoutID = markedButtonTimeoutIDs.get(button);
  if (existingTimeoutID) {
    clearTimeout(existingTimeoutID);
  } else {
    button.classList.add(ACTION_PERFORMED);
  }
  markedButtonTimeoutIDs.set(button, setTimeout(unmarkButton.bind(button), 16.67 * 6));
};
var unmarkButton = function() {
  this.classList.remove(ACTION_PERFORMED);
  markedButtonTimeoutIDs.delete(this);
};
var ACTION_PERFORMED = "action-performed";
var markedButtonTimeoutIDs = /* @__PURE__ */ new Map();

// clipboard.mjs
var copy = function(event) {
  writeClipboardData(event, getSelectedText(this));
};
var cut = function(event) {
  writeClipboardData(event, getSelectedText(this));
  replaceSelectedRange(this, "");
};
var paste = function(event) {
  if (!event.clipboardData) {
    return;
  }
  event.preventDefault();
  replaceSelectedRange(this, event.clipboardData.getData("text"));
};
var getSelectedText = (state) => {
  const { start, end } = state.selectedRange;
  return state.text.slice(Math.min(start, end), Math.max(start, end));
};
var writeClipboardData = (event, text) => {
  if (!event.clipboardData) {
    console.error(`Can't write "${text}": event.clipboardData is null`, event);
    return;
  }
  event.clipboardData.setData("text/plain", text);
  event.preventDefault();
};

// full-screen.mjs
var ENTER = "Full screen";
var ENTERING = "Entering full screen mode...";
var EXIT = "Exit full screen";
var EXITING = "Exiting full screen mode...";
var setUpFullScreenButton = (state, signal) => {
  updateFullScreenButton.call(state);
  if (requestFullscreen && exitFullscreen) {
    document.addEventListener("fullscreenchange", updateFullScreenButton.bind(state), {
      signal
    });
    document.addEventListener("webkitfullscreenchange", updateFullScreenButton.bind(state), {
      signal
    });
  } else {
    state.fullScreenButton.title = "This browser does not allow full screen websites";
    state.fullScreenButton.disabled = true;
  }
};
var toggleFullScreen = async function() {
  if (!requestFullscreen || !exitFullscreen) {
    return;
  }
  const button = this.fullScreenButton, wasFocused = button.matches(":focus");
  button.disabled = true;
  try {
    if (button.title === ENTER) {
      button.title = ENTERING;
      await requestFullscreen.call(this.editor);
    } else {
      button.title = EXITING;
      await exitFullscreen.call(document);
    }
  } finally {
    button.removeAttribute("disabled");
    if (wasFocused) {
      button.focus();
    }
  }
};
var updateFullScreenButton = function() {
  if (fullScreenElement(document) === this.editor) {
    this.fullScreenButton.title = EXIT;
    this.fullScreenButton.replaceChildren(fullScreenExitIcon.cloneNode(true));
  } else {
    this.fullScreenButton.title = ENTER;
    this.fullScreenButton.replaceChildren(fullScreenIcon.cloneNode(true));
  }
};
var requestFullscreen = (
  /** @type {{readonly requestFullscreen?: RequestFullscreen}} */
  Element.prototype.requestFullscreen ?? /** @type {{readonly webkitRequestFullscreen?: RequestFullscreen}} */
  Element.prototype.webkitRequestFullscreen
);
var exitFullscreen = (
  /** @type {{readonly exitFullscreen?: ExitFullscreen}} */
  Document.prototype.exitFullscreen ?? /** @type {{readonly webkitExitFullscreen?: ExitFullscreen}} */
  Document.prototype.webkitExitFullscreen
);
var fullScreenElement = (root) => root.fullscreenElement ?? root.webkitFullscreenElement;

// undo-redo.mjs
var undo = function(event) {
  if (this.historyIndex === 0) {
    return;
  }
  if (this.historyIndex === this.history.length) {
    this.history.push([
      this.text,
      Object.freeze({
        ...this.selectedRange
      })
    ]);
  }
  this.historyIndex--;
  updateUndoRedoButtons(this.redoButton, this.historyIndex === 0 && this.undoButton);
  if (!event) {
    markActionPerformed(this.undoButton);
  }
  restoreText(this);
};
var redo = function(event) {
  if (this.historyIndex + 1 >= this.history.length) {
    return;
  }
  this.historyIndex++;
  updateUndoRedoButtons(this.undoButton, this.historyIndex + 1 >= this.history.length && this.redoButton);
  if (!event) {
    markActionPerformed(this.redoButton);
  }
  restoreText(this);
};
var scrollToUndoOrRedo = function(event) {
  if (event.deltaY === 0) {
    return;
  }
  event.preventDefault();
  if (event.deltaY > 0) {
    undo.call(this);
  } else {
    redo.call(this);
  }
};
var restoreText = (state) => {
  const [text, range] = state.history[state.historyIndex];
  state.text = text;
  state.selectedRange.start = range.start;
  state.selectedRange.end = range.end;
  queueUpdateContents(state);
};
var updateUndoRedoButtons = (toEnable, toDisable) => {
  removeAttributeIfPresent(toEnable, "disabled");
  if (!toDisable) {
    return;
  }
  if (toDisable.matches(":focus")) {
    toEnable.focus();
  }
  setAttributeIfChanged(toDisable, "disabled", "");
};

// keyboard.mjs
var handleKeyDown = function(event) {
  const { selectedRange, text } = this, key = event.key;
  if (this.shadowRoot.activeElement !== this.program) {
    if (!specialKeyPressed(event)) {
      return;
    }
    switch (key) {
      case "z":
        undo.call(this);
        break;
      case "Z":
      case "y":
        redo.call(this);
        break;
    }
    return;
  }
  switch (key) {
    case "Shift":
    case "Control":
    case "Alt":
    case "Meta":
    case "CapsLock":
      return;
    case "Tab":
      return;
    case "Escape":
      selectedRange.start = selectedRange.end;
      drawSelectedRange(this);
      return;
    case "ArrowLeft":
      event.preventDefault();
      updateSelectedRangeByOneCharacter(this, -1, event.shiftKey);
      return;
    case "ArrowRight":
      event.preventDefault();
      updateSelectedRangeByOneCharacter(this, 1, event.shiftKey);
      return;
    case "ArrowUp": {
      event.preventDefault();
      const prevLineEnd = closestPrecedingNewLine(text, selectedRange.end);
      if (prevLineEnd === -1) {
        updateSelectedRangeByOneLine(this, 0, event.shiftKey);
        return;
      }
      const prevLineStart = text.lastIndexOf("\n", prevLineEnd - 1) + 1;
      updateSelectedRangeByOneLine(this, prevLineStart + Math.min(this.rememberedColumn, prevLineEnd - prevLineStart), event.shiftKey);
      return;
    }
    case "ArrowDown": {
      event.preventDefault();
      if (selectedRange.end === text.length) {
        if (event.shiftKey) {
          return;
        }
        selectedRange.start = text.length;
        drawSelectedRange(this);
        return;
      }
      const nextLineStart = text.indexOf("\n", selectedRange.end) + 1;
      if (nextLineStart > 0) {
        const nextLineEnd = text.indexOf("\n", nextLineStart);
        updateSelectedRangeByOneLine(this, nextLineStart + Math.min(this.rememberedColumn, (nextLineEnd >= 0 ? nextLineEnd : text.length) - nextLineStart), event.shiftKey);
        return;
      }
      if (event.shiftKey) {
        selectedRange.end = text.length;
      } else {
        setCursorPosition(this, text.length);
      }
      drawSelectedRange(this);
      return;
    }
    case "PageUp":
    case "PageDown":
      console.warn(`TODO handle ${key}: move the cursor up/down by one page`);
      return;
  }
  if (specialKeyPressed(event)) {
    switch (key) {
      case "a":
        setSelectedRange(this, 0, text.length);
        drawSelectedRange(this);
        event.preventDefault();
        break;
      case "l": {
        const start = selectedRange.start, newLineAfterEnd = text.indexOf("\n", selectedRange.end);
        setSelectedRange(
          this,
          // start looking at `start - 1` in case of empty lines
          Math.min(start, text.lastIndexOf("\n", start - 1) + 1),
          newLineAfterEnd >= 0 ? newLineAfterEnd + 1 : text.length
        );
        drawSelectedRange(this);
        event.preventDefault();
        break;
      }
      case "f":
        console.warn(`TODO ctrl+f: built-in find+replace is slow for some reason`);
        break;
      case "s":
        console.warn(`TODO ctrl+s: save the file if it's writable, otherwise show message/prompt to save a copy`);
        break;
      case "z":
        undo.call(this);
        break;
      case "Z":
      case "y":
        redo.call(this);
        break;
    }
    return;
  }
  handleKeyDownOrInputEvent(this, event, key);
};
var handleBeforeInput = function(event) {
  console.log(event);
  if (event.data && event.inputType === "insertText") {
    handleKeyDownOrInputEvent(this, event, event.data);
  }
};
var handleKeyDownOrInputEvent = (state, event, key) => {
  const { selectedRange, text } = state, atLeastOneCharacterSelected = selectedRange.start !== selectedRange.end;
  switch (key) {
    case "Backspace": {
      event.preventDefault();
      if (atLeastOneCharacterSelected) {
        replaceSelectedRange(state, "");
        break;
      }
      const end = selectedRange.end;
      if (end === 0) {
        return;
      }
      setTextAndCursorPosition(state, text.slice(0, end - 1) + text.slice(end), end - 1);
      break;
    }
    case "Delete": {
      event.preventDefault();
      if (atLeastOneCharacterSelected) {
        replaceSelectedRange(state, "");
        break;
      }
      const end = selectedRange.end;
      if (end === text.length) {
        return;
      }
      setEditorText(state, text.slice(0, end) + text.slice(end + 1), end);
      break;
    }
    case "Enter":
      event.preventDefault();
      replaceSelectedRange(state, "\n");
      break;
    case "Unidentified":
      event.preventDefault();
      break;
    default:
      if (key.length !== 1) {
        console.error(`forgot to handle special key "${key}"`, event, state);
        return;
      }
      event.preventDefault();
      replaceSelectedRange(state, key);
  }
};
var updateSelectedRangeByOneCharacter = (state, amount, shiftKey) => {
  const range = state.selectedRange;
  if (shiftKey) {
    setSelectedRange(state, range.start, Math.max(0, Math.min(range.end + amount, state.text.length)));
    drawSelectedRange(state);
    return;
  }
  let newPosition;
  if (range.start === range.end) {
    newPosition = Math.max(0, Math.min(range.end + amount, state.text.length));
  } else if (amount === 1) {
    newPosition = Math.max(range.start, range.end);
  } else {
    newPosition = Math.min(range.start, range.end);
  }
  setCursorPosition(state, newPosition);
  drawSelectedRange(state);
};
var updateSelectedRangeByOneLine = (state, cursorPosition, shiftKey) => {
  const range = state.selectedRange;
  if (shiftKey) {
    range.end = cursorPosition;
  } else {
    range.start = range.end = cursorPosition;
  }
  drawSelectedRange(state);
};

// pointers.mjs
var NON_WORD_CHARACTER = /[^\w_-]/;
var NON_WHITESPACE_CHARACTER = /[^\s]/;
var handlePointerDown = (state, event) => {
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  const pointerId = event.pointerId, programRect = state.program.getBoundingClientRect(), cursorPosition = findCursorPosition(state, event, programRect), target = event.target;
  state.program.focus({
    preventScroll: true
  });
  if (!(target instanceof Element)) {
    throw new Error(`pointer event target should always be an Element`, {
      cause: {
        context: state,
        target
      }
    });
  }
  if (state.lineNumbers.contains(target)) {
    selectWholeLine(state, cursorPosition);
    const lineNumberElement = (
      /** @type {HTMLElement} */
      target.closest("div")
    ), resultRow = state.lineNumberToResultRow.get(computeCursorRow(state, event, programRect));
    if (resultRow !== void 0) {
      showResults(state);
      state.results.scrollTo({
        top: resultRow * state.lineHeight - (resultsDividerIsVertical(state) ? lineNumberElement.getBoundingClientRect().top - state.contents.getBoundingClientRect().top : 0),
        behavior: state.resultsScrollBehavior
      });
    }
    drawSelectedRange(state);
    return;
  }
  if (state.pointerDownTime !== null && pointerId === state.lastClickPointerId && cursorPosition === state.lastClickPosition && event.timeStamp - state.pointerDownTime <= state.repeatedClickSpeedMilliseconds) {
    state.repeatedClicks = /** @type {1 | 2 | 3} */
    state.repeatedClicks % 3 + 1;
  } else {
    state.repeatedClicks = 1;
  }
  state.lastClickPointerId = pointerId;
  state.lastClickPosition = cursorPosition;
  state.pointerDownTime = event.timeStamp;
  switch (state.repeatedClicks) {
    case 1:
      setCursorPosition(state, cursorPosition);
      break;
    case 2:
      selectRange(state, target, cursorPosition);
      break;
    case 3:
      selectWholeLine(state, cursorPosition);
  }
  drawSelectedRange(state);
  const program = state.program;
  if (event.pointerType === "mouse") {
    const dragController = new AbortController(), signal = dragController.signal, dragListenerOptions = {
      signal
    }, dragEndFn = dragEnd.bind(program, dragController, pointerId);
    program.setPointerCapture(pointerId);
    program.addEventListener("pointermove", handlePointerMove.bind(state), dragListenerOptions);
    program.addEventListener("pointerup", dragEndFn, dragListenerOptions);
    program.addEventListener("pointercancel", dragEndFn, dragListenerOptions);
    return;
  }
  const initialPosition = {
    x: event.clientX,
    y: event.clientY
  }, abortController = new AbortController(), cancelLongPressFn = cancelLongPress.bind(abortController, state, initialPosition), options = {
    signal: abortController.signal
  };
  cancelLongPress.call(null, state, initialPosition, event);
  state.longPressTimoutID = setTimeout(handleLongPress.bind(target, state, cursorPosition), state.longPressDelayMilliseconds);
  program.addEventListener("pointerup", cancelLongPressFn, options);
  program.addEventListener("pointerleave", cancelLongPressFn, options);
  program.addEventListener("pointercancel", cancelLongPressFn, options);
  program.addEventListener("pointermove", cancelLongPressFn, options);
};
var handlePointerMove = function(event) {
  setSelectedRange(this, this.selectedRange.start, findCursorPosition(this, event, this.program.getBoundingClientRect()));
  drawSelectedRange(this);
};
var dragEnd = function(dragController, pointerId, event) {
  debug?.log(`drag ended because of:`, event);
  dragController.abort();
  this.releasePointerCapture(pointerId);
};
var handleLongPress = function(state, cursorPosition) {
  debug?.log(`handleLongPress pos=${cursorPosition}`, this);
  state.longPressTimoutID = null;
  selectRange(state, this, cursorPosition);
  drawSelectedRange(state);
};
var cancelLongPress = function(state, initialPosition, event) {
  if (event.type === "pointermove" && event.clientX === initialPosition.x && event.clientY === initialPosition.y) {
    return;
  }
  debug?.log(`cancelling long press due to "${event.type}"`, initialPosition, event);
  this?.abort();
  if (state.longPressTimoutID === null) {
    return;
  }
  clearTimeout(state.longPressTimoutID);
  state.longPressTimoutID = null;
};
var selectRange = (state, pointerTarget, cursorPosition) => {
  if (pointerTarget === state.program || pointerTarget === state.contents) {
    setSelectedRange(state, cursorPosition, Math.min(cursorPosition + 1, state.text.length));
    return;
  }
  if (pointerTarget.classList.contains("text")) {
    const text = state.text, regex = NON_WHITESPACE_CHARACTER.test(text[cursorPosition]) ? NON_WORD_CHARACTER : NON_WHITESPACE_CHARACTER;
    setSelectedRange(state, lastIndexOfRegex(text, regex, cursorPosition) + 1, indexOfRegex(text, regex, cursorPosition));
    return;
  }
  let start = 0;
  for (const child of state.program.children) {
    if (child === pointerTarget) {
      setSelectedRange(state, start, start + child.textContent.length);
      return;
    }
    start += child.textContent.length;
  }
  throw new Error(`Couldn't find the pointer event target in the program element (cursorPosition=${cursorPosition})`, {
    cause: {
      state,
      pointerTarget
    }
  });
};
var selectWholeLine = (state, cursorPosition) => {
  const text = state.text, start = Math.min(cursorPosition, text.lastIndexOf("\n", cursorPosition) + 1), nextNewLineIndex = text.indexOf("\n", cursorPosition), end = nextNewLineIndex >= 0 ? nextNewLineIndex + 1 : text.length;
  setSelectedRange(state, start, end);
};
var computeCursorRow = (state, event, rect2) => (
  // TODO explain the 0.5
  Math.round((event.clientY - rect2.top) / state.lineHeight - 0.5)
);
var findCursorPosition = (state, event, rect2) => {
  const text = state.text, cursorRow = computeCursorRow(state, event, rect2);
  let lastNewLineIndexPlus1 = 0, maxPosition;
  for (let row = 0; ; row++) {
    const nextNewLineIndex = text.indexOf("\n", lastNewLineIndexPlus1);
    if (nextNewLineIndex === -1) {
      maxPosition = text.length;
      break;
    }
    if (row >= cursorRow) {
      maxPosition = nextNewLineIndex;
      break;
    }
    lastNewLineIndexPlus1 = nextNewLineIndex + 1;
  }
  ;
  return Math.min(lastNewLineIndexPlus1 + Math.max(0, Math.round((event.clientX - rect2.left) / state.characterWidth)), maxPosition);
};
var indexOfRegex = (string, regex, start) => {
  for (let i = start; i < string.length; i++) {
    if (regex.test(string[i])) {
      return i;
    }
  }
  return -1;
};
var lastIndexOfRegex = (string, regex, start) => {
  for (let i = start; i >= 0; i--) {
    if (regex.test(string[i])) {
      return i;
    }
  }
  return -1;
};

// run.mjs
var runOrStop = (state, event) => {
  if (!event) {
    markActionPerformed(state.runButton);
  }
  if (state.runningState) {
    stop(state, state.runningState, "Program was stopped", stoppedIcon);
    return false;
  }
  const worker = new Worker(import.meta.resolve("./workers/worker-runner.mjs"), {
    type: "module"
  }), stopper = makeSharedArrayBuffer(), startTimeNotification = `${(/* @__PURE__ */ new Date()).toLocaleTimeString()}: program started`, timer = state.runStatus.lastChild;
  worker.onmessage = handleWorkerResponse.bind(state, state.text);
  worker.postMessage(
    /** @satisfies {WorkerRunnerMessage} */
    {
      fileName: state.editor.fileName,
      text: state.text,
      stopper
    }
  );
  state.runningState = {
    worker,
    stopper: stopper && new Uint8Array(stopper),
    stopTimer: startTimer(timer.firstChild)
  };
  timer.title = "Program run time";
  if (state.runStatus.firstChild instanceof SVGSVGElement) {
    state.runStatus.firstChild.replaceWith(runningIcon.cloneNode(true));
  } else {
    state.runStatus.prepend(runningIcon.cloneNode(true));
  }
  state.runStatus.title = startTimeNotification;
  state.runButton.title = "Stop the program";
  state.playIcon.replaceWith(state.stopIcon);
  clearLineNumberResultIndicators(state);
  showResults(state);
  setResultsText(state, `// ${startTimeNotification}

`);
  return true;
};
var stop = (state, runningState, event, icon) => {
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} stopping.........`);
  const { worker, stopper, stopTimer } = runningState, notification = `${(/* @__PURE__ */ new Date()).toLocaleTimeString()}: ${event}`;
  state.runningState = null;
  stopTimer();
  if (stopper) {
    Atomics.exchange(stopper, 0, 1);
  }
  worker.terminate();
  console.log(`${(/* @__PURE__ */ new Date()).toISOString()} stopped.........`);
  state.runStatus.lastChild.title = "Last program run time";
  state.runStatus.firstChild.replaceWith(icon.cloneNode(true));
  state.runStatus.title = notification;
  state.runButton.title = RUN_BUTTON_TITLE;
  state.stopIcon.replaceWith(state.playIcon);
  if (notification.includes("\n")) {
    setResultsText(state, state.resultsText + `/*
${notification}
*/
`);
  } else {
    setResultsText(state, state.resultsText + `// ${notification}
`);
  }
};
var handleWorkerResponse = function(textAtStart, event) {
  const response = event.data, runningState = this.runningState;
  if (response.type === "result") {
    showResult(this, textAtStart, response.data);
    return;
  }
  if (!runningState) {
    console.error(`Got response from worker thread after it was already stopped`);
    return;
  }
  switch (response.type) {
    case "done":
      stop(this, runningState, "Program completed successfully", successIcon);
      return;
    case "stopped":
      stop(this, runningState, "Program was stopped", stoppedIcon);
      return;
    case "parse errors":
      stop(this, runningState, "Program had parse errors", errorIcon);
      return;
    case "crash in the parser":
    case "crash in the interpreter":
    case "crash in the worker thread":
      stop(this, runningState, `Editor hit a ${response.type}`, errorIcon);
      return;
    case "crash in the program":
      showCrash(this, textAtStart, response.data);
      stop(this, runningState, `Program crashed:
${response.data.error}
`, errorIcon);
      return;
    default:
      return response.type;
  }
};
var makeSharedArrayBuffer = () => {
  if (window.SharedArrayBuffer) {
    return new SharedArrayBuffer(1);
  }
  console.warn(`SharedArrayBuffer is not defined, so some features (like stopping execution of a program mid-run) might not work. Make sure to set the following HTTP headers:
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin`);
};

// settings.mjs
var makeSettingsButton = (state) => {
  console.log(`TODO make settings widget`, state);
  const button = html("button").set({
    title: "Settings (coming soon!)",
    disabled: true
  }).append(settingsIcon.cloneNode(true)).build();
  return button;
};

// internal-state.mjs
var InternalState = class {
  /* DOM */
  /** @readonly @type {DustFileEditor} */
  editor;
  /** @readonly @type {ShadowRoot} */
  shadowRoot;
  // toolbar: run button
  /** @readonly */
  playIcon = path("M 1,0 L 10,5 L 1,10 Z");
  /** @readonly */
  stopIcon = rect({
    width: 8,
    height: 8,
    x: 1,
    y: 1
  });
  /** @readonly @type {HTMLButtonElement} */
  runButton = html("button").set({
    title: RUN_BUTTON_TITLE
  }).append(svg({
    viewBox: "0 0 10 10"
  }, this.playIcon)).on("click", runOrStop.bind(null, this)).build();
  // toolbar: undo/redo
  /** @readonly @type {HTMLButtonElement} */
  undoButton = html("button").set({
    title: `Undo (${specialKeyName}+Z)`,
    disabled: true
  }).append("\u27F2").onCustom(addPressListener, undo.bind(this)).build();
  /** @readonly @type {HTMLButtonElement} */
  redoButton = html("button").set({
    title: `Redo (Shift+${specialKeyName}+Z or ${specialKeyName}+Y)`,
    disabled: true
  }).append("\u27F3").onCustom(addPressListener, redo.bind(this)).build();
  /** @readonly */
  fullScreenButton = html("button").on("click", toggleFullScreen.bind(this)).build();
  // contents
  /** @readonly */
  lineNumbers = html("div").set({
    className: "line-numbers"
  }).build();
  /** @readonly */
  program = html("span").set({
    className: "program-container",
    tabIndex: 0,
    spellcheck: false,
    autocapitalize: "off"
  }).build();
  /** @readonly */
  outlines = svg({
    class: "outlines"
  });
  /** @readonly @type {HTMLElement} */
  contents = html("div").set({
    className: "contents",
    tabIndex: -1
  }).append(this.lineNumbers, this.outlines, this.program).on("pointerdown", handlePointerDown.bind(null, this)).on("contextmenu", (event) => {
    console.warn(`TODO handle contextmenu: show a custom menu, with a space where the user can right-click to bring up the built-in context menu`, event);
  }).on("copy", copy.bind(this)).on("cut", cut.bind(this)).on("paste", paste.bind(this)).build();
  /** @readonly */
  highlightedRange = (
    /** @type {HighlightedRange} */
    // SAFETY: `.append("", createTextElement(...))` ensures its `firstChild` and `firstElementChild` match the type signature
    html("span").set({
      className: "highlighted-range"
    }).append("", createTextElement("span", "")).build()
  );
  /** @readonly */
  cursor = html("span").set({
    className: "cursor"
  }).build();
  /** @type {Element | null} // TODO should this be non-nullable since there's always at least one line, even for empty files? */
  lineWithCursor = null;
  /** @readonly */
  gridResizer = html("div").set({
    className: "grid-resizer"
  }).build();
  /** @readonly */
  results = (
    /** @type {ResultsContainer} */
    // SAFETY: `results` is initialized with three children that match the `ResultsContainer` signature.
    html("div").set({
      className: "results",
      tabIndex: -1
    }).append(html("div").set({
      className: "line-numbers"
    }).build(), svg({
      class: "outlines"
    }), html("span").set({
      className: "program-container"
    }).build()).on("pointerdown", handleResultsPointerDown.bind(this), {
      capture: true
    }).on("pointerenter", handleResultsPointerEnter.bind(this)).build()
  );
  // status bar
  /** @readonly */
  selectionIndicator = new Text();
  /** @readonly */
  runStatus = (
    /** @type {RunStatus} */
    html("span").set({
      className: "run-status"
    }).append(createTextElement("span", millisecondsToHoursMinutesSeconds(0), {
      className: "program-timer",
      title: "Program run time will be measured here"
    })).build()
  );
  /* End DOM */
  /* STYLE */
  /** @readonly @type {OffscreenCanvasRenderingContext2D} */
  textMeasurementContext;
  characterWidth = 0;
  characterHeight = 0;
  lineHeight = 0;
  fontSize = 0;
  numberOfOutlineColors = 0;
  /* End STYLE */
  /* PROGRAM STATE */
  /** @type {string} */
  text;
  /** @readonly */
  selectedRange = {
    start: 0,
    end: 0
  };
  /** @readonly @type {HistoryEntry[]} */
  history = [];
  historyIndex = 0;
  updateQueued = false;
  /** @type {number | null} */
  editingTimeoutID = null;
  // TODO should these be stored and restored with undo/redo? Maybe they should go into the SelectedRange struct.
  rememberedColumn = 0;
  /** @type {number | null} */
  pointerDownTime = null;
  /** @type {1 | 2 | 3} */
  repeatedClicks = 1;
  /** @type {number | null} */
  lastClickPointerId = null;
  /** @type {number | null} */
  lastClickPosition = null;
  /** @type {number | null} */
  longPressTimoutID = null;
  /** @type {RunningState | null} */
  runningState = null;
  /* End PROGRAM STATE */
  /* RESULTS STATE */
  resultsText = "";
  resultsUpdateQueued = false;
  /** @readonly */
  resultsScrollPosition = {
    top: 0,
    left: 0
  };
  /** @readonly @type {HTMLElement[]} */
  lineNumberElementsWithResults = [];
  /** @readonly @type {Map<number, number>} */
  lineNumberToResultRow = /* @__PURE__ */ new Map();
  /* End RESULTS STATE */
  /* SETTINGS */
  // TODO add a way to change these settings 
  /** Amount to wait before showing parse errors (avoids overwhelming the user with red squigglies while they're typing) */
  errorsDelayMilliseconds = 500;
  repeatedClickSpeedMilliseconds = 500;
  longPressDelayMilliseconds = 300;
  autoScrollResults = false;
  /** @type {ScrollBehavior} TODO change default based on https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion */
  resultsScrollBehavior = "smooth";
  /**
   * If the width of the text area is big enough to fit this many characters,
   * the results will be shown side by side with the code. Otherwise, the
   * results will be shown below the code.
   */
  widthThresholdForVerticalGridSplitInCharacters = 80;
  /* End SETTINGS */
  /* PERF */
  fastUpdates = 0;
  slowUpdates = 0;
  /** @readonly @type {number[]} */
  allUpdates = [];
  /* End PERF */
  /** @readonly @type {string} */
  localStorageID;
  /**
   * 
   * @param {DustFileEditor} editor 
   * @param {CSSStyleSheet} styleSheet 
   */
  constructor(editor, styleSheet2) {
    const context = new OffscreenCanvas(0, 0).getContext("2d");
    if (!context) {
      throw new Error(`Failed to get text measurement canvas context`);
    }
    this.textMeasurementContext = context;
    this.editor = editor;
    this.text = editor.textContent;
    this.localStorageID = `dust-file-editor-storage file:"${editor.fileName}" id:"${editor.dataset.storageId}"`;
    this.shadowRoot = editor.attachShadow({
      mode: "closed",
      delegatesFocus: true
    });
    this.shadowRoot.adoptedStyleSheets = [
      styleSheet2
    ];
    if (DEBUG_STYLES) {
      this.shadowRoot.prepend(html("link").set({
        rel: "stylesheet",
        href: import.meta.resolve("./dust-file-editor.css")
      }).on("load", () => {
        this.shadowRoot.adoptedStyleSheets = [];
      }, {
        once: true
      }).build());
    }
    this.shadowRoot.append(html("div").set({
      className: "toolbar",
      title: editor.fileName
    }).append(this.runButton, html("span").set({
      className: "undo-redo",
      title: "scroll up/down to undo/redo"
    }).append(this.undoButton, this.redoButton).on("wheel", scrollToUndoOrRedo.bind(this)).build(), this.fullScreenButton, makeSettingsButton(this)).build(), this.contents, html("div").set({
      className: "status-bar"
    }).append(html("span").set({
      className: "selection-indicator"
    }).append(this.selectionIndicator).build(), this.runStatus).build());
    editor.addEventListener("keydown", handleKeyDown.bind(this), {
      capture: true
    });
    editor.addEventListener("beforeinput", handleBeforeInput.bind(this));
    setUpGridResizer(this);
  }
};
var DEBUG_STYLES = false;

// dust-file-editor.mjs
var styleSheet = await new CSSStyleSheet().replace(await (await fetch(import.meta.resolve("./dust-file-editor.css"))).text());
var DustFileEditor = class extends HTMLElement {
  /** @readonly */
  #state = new InternalState(this, styleSheet);
  /** @type {AbortController | undefined | null} */
  #abortController;
  connectedCallback() {
    if (!this.isConnected) {
      return;
    }
    this.#abortController?.abort();
    const signal = (this.#abortController = new AbortController()).signal, focusOnLoad = this.dataset.focusOnLoad, toFocus = focusOnLoad !== void 0 && FOCUS_ON_LOAD_MAP.get(focusOnLoad);
    if (this.classList.contains(RESULTS_SHOWN) && !resultsShown(this.#state)) {
      console.error(`Class name "${RESULTS_SHOWN}" is reserved for internal use`, this);
    }
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.update.bind(this), { signal });
    specializeBasedOnDeviceType(this.#state, signal);
    setUpFullScreenButton(this.#state, signal);
    updateStyle(this.#state);
    updateContents(this.#state);
    if (toFocus === void 0) {
      console.error(`Unrecognized "data-focus-on-load" value "${focusOnLoad}" (expected one of [${[...FOCUS_ON_LOAD_MAP.keys().map((it) => `"${it}"`)].join(", ")}])`, this);
    } else if (toFocus) {
      this.#state[toFocus].focus({ preventScroll: true });
    }
    setUpLocalStorage(this.#state, signal);
  }
  disconnectedCallback() {
    this.#abortController?.abort();
    this.#abortController = null;
  }
  /** @returns {string} */
  get fileName() {
    return this.dataset.fileName ?? "untitled";
  }
  /** Call this function after changing styles like `font-size`, `--line-height`, etc. */
  update() {
    updateStyle(this.#state);
    queueUpdateContents(this.#state);
  }
};
var FOCUS_ON_LOAD_MAP = /* @__PURE__ */ new Map([
  ["program", "program"],
  ["run-button", "runButton"]
]);
if (document.readyState === "loading") {
  console.error(`Document is still loading: make sure to use type="module" with this script so it waits for the document to fully stream in before running`);
} else {
  customElements.define("dust-file-editor", DustFileEditor);
}
export {
  DustFileEditor
};
