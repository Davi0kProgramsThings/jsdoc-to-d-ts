import fs from 'fs'

import * as ohm from 'ohm-js'

import { JSDOC, semanticsJSDOC } from './JSDOC.js'

const file = fs.readFileSync('grammars/ES2022.ohm', 'utf-8')

export const ES2022 = ohm.grammar(file, { JSDOC })

export const semanticsES2022 = ES2022.extendSemantics(semanticsJSDOC).extendOperation('eval', {
  File(items) {
    return items.children
      .filter(item => item.ctorName == 'Class')
      .map(_class => _class.eval())
  },

  Class(doc, _export, _1, id, _3, body, _5) {
    return {
      doc: doc.numChildren > 0 ? { raw: doc.sourceString, ...doc.child(0).eval()} : undefined,
      export: _export.numChildren > 0 ? _export.child(0).eval() : undefined,
      id: id.eval(),
      methods: body.eval()
    };
  },

  Export(_, _default) {
    return {
      default: _default.numChildren > 0
    }
  },

  ClassBody(methods) {
    return methods.children.map(method => method.eval())
  },

  Method(doc, _async, id, _2, _arguments, _4, _5, _6, _7) {
    return {
      async: _async.numChildren > 0,
      doc: doc.numChildren > 0 ? { raw: doc.sourceString, ...doc.child(0).eval()} : undefined,
      id: id.eval(),
      arguments: _arguments.eval()
    }
  },

  ArgumentList(ids) {
    return ids.asIteration().children.map(id => id.sourceString)
  }
})
