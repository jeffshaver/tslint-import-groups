import * as ts from 'typescript'
import * as Lint from 'tslint'
import { getNextStatement, isImportDeclaration } from 'tsutils'

interface IOptions {
  aliases: string[]
}

interface IJsonOptions {
  aliases: string[]
}

const moduleGroups = ['node_module', 'alias', '../', './']
const reversedModuleGroups = [...moduleGroups].reverse()

export class Rule extends Lint.Rules.AbstractRule {
  public static ALPHABETICAL_ERROR =
    'Imports must be sorted alphabetically, by node_module/alias and by module name'
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

const getModulePathByNode = (
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile
) => node.moduleSpecifier.getText(sourceFile).replace(/'/g, '')
const getModuleNameFromPath = (modulePath: string) => {
  return modulePath.substring(modulePath.lastIndexOf('/') + 1)
}

// The walker takes care of all the work.
class ImportGroupsWalker extends Lint.AbstractWalker<IOptions> {
  currentModuleGroupType: string
  moduleGroups: string[]
  options: IOptions

  constructor(sourceFile: ts.SourceFile, ruleName: string, options: IOptions) {
    super(sourceFile, ruleName, options)

    this.options = options
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
    const modulePath = getModulePathByNode(node, sourceFile)
    const moduleGroupType = this.getGroupTypeByModulePath(modulePath)
    const next = getNextStatement(node)

    if (!next) {
      return
    }

    // Get info about the current node
    const nodeStart = node.getStart(sourceFile)
    const nodeLine = ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd())
      .line
    const nodeText = node.getText(sourceFile)
    const nodeWidth = node.getWidth(sourceFile)
    // Get info about the next node
    const nextNodeStart = next.getStart(sourceFile)
    const nextNodeLine = ts.getLineAndCharacterOfPosition(
      sourceFile,
      nextNodeStart
    ).line
    const nextNodeText = next.getText(sourceFile)
    const nextNodeWidth = next.getWidth(sourceFile)

    this.currentModuleGroupType = moduleGroupType

    // If the next statement is on the line right below the current
    if (nextNodeLine - nodeLine === 1) {
      // If the next node isn't an import, just return
      if (!isImportDeclaration(next)) {
        return
      }

      const nextModulePath = getModulePathByNode(next, sourceFile)
      const nextModuleGroupType = this.getGroupTypeByModulePath(nextModulePath)

      /**
       * If the current module and next module don't have the same group
       * then we need to add a failure because modules within the same group
       * (not separated by newlines) must be in the same group
       */
      if (nextModuleGroupType !== this.currentModuleGroupType) {
        this.addFailure(
          nextNodeStart,
          next.getEnd(),
          Rule.SEPERATE_GROUPS_FAILURE,
          [
            // Add a newline before the import that should be in the next group
            new Lint.Replacement(
              nextNodeStart,
              nextNodeWidth,
              `\n${nextNodeText}`
            )
          ]
        )
      } else if (
        /**
         * If the next module comes alphabetically after
         * the current module, than there is an error
         */
        !this.moduleIsAlphabeticallySorted(nextModulePath, modulePath)
      ) {
        this.addFailure(nextNodeStart, next.getEnd(), Rule.ALPHABETICAL_ERROR, [
          // Replace the current line with the next one
          new Lint.Replacement(nodeStart, nodeWidth, nextNodeText),
          // Replace the next line with the current one
          new Lint.Replacement(nextNodeStart, nextNodeWidth, nodeText)
        ])
      }
      // If there is a new line between this node and the next
    } else if (nextNodeLine - nodeLine > 1) {
      // If the next node isn't an import declaration, just return
      if (!isImportDeclaration(next)) {
        return
      }

      const nextModuleText = getModulePathByNode(next, sourceFile)
      const nextGroupType = this.getGroupTypeByModulePath(nextModuleText)

      /**
       * If the current module and the next module are of the same group,
       * we need to add a failure because modules of the same group
       * must be in the same group (not separated by a newline)
       */
      if (nextGroupType === this.currentModuleGroupType) {
        this.addFailure(nextNodeStart, next.getEnd(), Rule.SAME_GROUP_FAILURE, [
          // Remove the newline from before the current line
          new Lint.Replacement(
            nextNodeStart - 1,
            nextNodeWidth + 1,
            nextNodeText
          )
        ])
        /**
         * Import groups must be in the right order. So if the index
         * of the current module group is after the next module group,
         * than the order is messed up
         */
      } else if (
        moduleGroups.indexOf(moduleGroupType) >
        moduleGroups.indexOf(nextGroupType)
      ) {
        this.addFailure(
          nextNodeStart,
          next.getEnd(),
          Rule.GROUP_OUT_OF_ORDER_STRING,
          [
            // Replace the current line with the next one
            new Lint.Replacement(nodeStart, nodeWidth, nextNodeText),
            // Replace the next line with the current one
            new Lint.Replacement(nextNodeStart, nextNodeWidth, nodeText)
          ]
        )
      }
    }
  }

  getGroupTypeByModulePath = (modulePath: string): string => {
    for (let group of reversedModuleGroups) {
      if (group === 'alias' && this.options.aliases) {
        const alias = this.options.aliases.find(alias =>
          modulePath.startsWith(alias)
        )

        if (!alias) {
          continue
        }

        return group
      }

      if (modulePath.startsWith(group)) {
        return group
      }
    }

    return 'node_module'
  }

  // Pulls out the first part of the module path
  getNodeModuleOrAliasNameFromPath = nodeModuleOrAliasPath => {
    const firstSeparatorIndex = nodeModuleOrAliasPath.indexOf('/')

    return nodeModuleOrAliasPath.substring(
      0,
      firstSeparatorIndex === -1 ? undefined : firstSeparatorIndex
    )
  }

  stringIsAfter = (string1: string, string2: string) => {
    return (
      getModuleNameFromPath(string1).localeCompare(
        getModuleNameFromPath(string2)
      ) === 1
    )
  }

  moduleIsAlphabeticallySorted = (
    nextModulePath: string,
    currentModulePath: string
  ): boolean => {
    const groupType = this.getGroupTypeByModulePath(currentModulePath)

    if (groupType === 'node_module' || groupType === 'alias') {
      const currentNodeModuleOrAliasName = this.getNodeModuleOrAliasNameFromPath(
        currentModulePath
      )
      const nextNodeModuleOrAliasName = this.getNodeModuleOrAliasNameFromPath(
        nextModulePath
      )

      if (currentNodeModuleOrAliasName !== nextNodeModuleOrAliasName) {
        return this.stringIsAfter(
          nextNodeModuleOrAliasName,
          currentNodeModuleOrAliasName
        )
      }
    }

    return this.stringIsAfter(nextModulePath, currentModulePath)
  }
}

const defaultOptions: IOptions = {
  aliases: undefined
}

function parseOptions(ruleArguments: any[]): IOptions {
  const options = (ruleArguments as IJsonOptions[])[0]

  if (!options) {
    return defaultOptions
  }

  return {
    aliases: options['aliases']
  }
}
