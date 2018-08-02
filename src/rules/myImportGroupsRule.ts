import * as ts from 'typescript'
import * as Lint from 'tslint'
import { getNextStatement, isImportDeclaration } from 'tsutils'

interface IOptions {
  aliasPrefix: string
}

interface IJsonOptions {
  'alias-prefix': string
}

const importGroups = ['module', '../', './']

export class Rule extends Lint.Rules.AbstractRule {
  public static GROUP_OUT_OF_ORDER_STRING =
    'Imports must be in the following order: node_modules, aliases, parentDirectory, currentDirectory'
  public static SAME_GROUP_FAILURE =
    'Imports of the same type must be grouped together'
  public static SEPERATE_GROUPS_FAILURE =
    'Imports of different groups must be separated by newlines'

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(
      new ImportGroupsWalker(
        sourceFile,
        this.ruleName,
        parseOptions(this.ruleArguments)
      )
    )
  }
}

const getGroupTypeByModuleName = (moduleName: string) => {
  for (let group of importGroups.reverse()) {
    if (moduleName.startsWith(group)) {
      return group
    }
  }
}

const getModuleNameByNode = (node: ts.ImportDeclaration) =>
  node.moduleSpecifier.getText().replace(/'/g, '')

const moduleIsAlphabeticallySorted = (
  nextModuleName: string,
  currentModuleName: string
) => {
  return currentModuleName.localeCompare(nextModuleName) === 1
}

// The walker takes care of all the work.
class ImportGroupsWalker extends Lint.AbstractWalker<IOptions> {
  currentImportGroupType: string

  constructor(sourceFile, ruleName, options) {
    super(sourceFile, ruleName, options)

    /**
     * If the developer passed in an alias prefix,
     * splice that into the available group types array
     */
    if (options.aliasPrefix) {
      importGroups.splice(1, 0, options.aliasPrefix)
    }
  }

  public walk(sourceFile: ts.SourceFile) {
    const cb = (node: ts.Node): void => {
      if (node.kind === ts.SyntaxKind.ImportDeclaration) {
        this.visitImportDeclaration(node as ts.ImportDeclaration)
      }

      return ts.forEachChild(node, cb)
    }
    return ts.forEachChild(sourceFile, cb)
  }

  public visitImportDeclaration(node: ts.ImportDeclaration) {
    const { sourceFile } = this
    const moduleName = getModuleNameByNode(node)
    const importGroupType = getGroupTypeByModuleName(moduleName)
    const next = getNextStatement(node)

    if (!next) {
      return
    }

    const start = node.getStart(sourceFile)
    const line = ts.getLineAndCharacterOfPosition(sourceFile, start).line
    const nextLine = ts.getLineAndCharacterOfPosition(sourceFile, next.end).line

    this.currentImportGroupType = importGroupType

    // If the next statement is on the line right below the current
    if (nextLine - line === 1) {
      // If the next node isn't an import, just return
      if (!isImportDeclaration(next)) {
        return
      }

      const nextModuleName = getModuleNameByNode(next)
      const nextImportGroupType = getGroupTypeByModuleName(nextModuleName)

      /**
       * If the current import and next import don't have the same group
       * then we need to add a failure because imports within the same group
       * (not separated by newlines) must be in the same group
       */
      if (nextImportGroupType !== this.currentImportGroupType) {
        this.addFailure(
          next.getStart(),
          next.getStart() + next.getWidth(),
          Rule.SEPERATE_GROUPS_FAILURE
        )
      } else if (!moduleIsAlphabeticallySorted(moduleName, nextModuleName)) {
        this.addFailure(
          next.getStart(),
          next.getStart() + next.getWidth(),
          'Must be sorted alphabetically'
        )
      }
      // If there is a new line between this node and the next
    } else if (nextLine - line > 1) {
      // If the next node isn't an import declaration, just return
      if (!isImportDeclaration(next)) {
        return
      }

      const nextModuleText = next.moduleSpecifier.getText().replace(/'/g, '')
      const nextGroupType = getGroupTypeByModuleName(nextModuleText)

      /**
       * If the current import and the next import are of the same group,
       * we need to add a failure because imports of the same group
       * must be in the same group (not separated by a newline)
       */
      if (nextGroupType === this.currentImportGroupType) {
        this.addFailure(
          next.getStart(),
          next.getStart() + next.getWidth(),
          Rule.SAME_GROUP_FAILURE
        )
        /**
         * Import groups must be in the right order. So if the index
         * of the nextimport group is before the current import group,
         * than the order is messed up
         */
      } else if (
        importGroups.indexOf(nextGroupType) <
        importGroups.indexOf(importGroupType)
      ) {
        this.addFailure(
          next.getStart(),
          next.getStart() + next.getWidth(),
          Rule.GROUP_OUT_OF_ORDER_STRING
        )
      }
    }
  }
}

const defaultOptions: IOptions = {
  aliasPrefix: undefined
}

function parseOptions(ruleArguments: any[]): IOptions {
  const options = (ruleArguments as IJsonOptions[])[0]

  if (!options) {
    return defaultOptions
  }

  return {
    aliasPrefix: options['alias-prefix']
  }
}
