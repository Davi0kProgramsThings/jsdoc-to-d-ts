import fs from 'fs'

import * as ohm from 'ohm-js'

const TAGS_TO_IGNORE = [
  '@link'
]

const file = fs.readFileSync('grammars/JSDOC.ohm', 'utf-8')

export const JSDOC = ohm.grammar(file)

export const semanticsJSDOC = JSDOC.createSemantics().addOperation('eval', {
  DocComment(_, body, _2) {
    return body.eval()
  },

  Body(items) {
    return {
      tags: items.children
        .filter(item => item.ctorName == 'At')
        .map(at => at.eval())
        .filter(({ tag }) => !TAGS_TO_IGNORE.includes(tag))
    }
  },

  At(tag) {
    return {
      tag: tag.child(0).sourceString,
      arguments: tag.children.slice(1).map(argument => argument.eval())
    }
  },

  IdInBraces(_, id, _2) {
    return id.eval()
  },

  id(_, _1) {
    return this.sourceString
  }
})
