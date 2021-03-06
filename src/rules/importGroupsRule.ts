import * as ts from 'typescript'
import * as Lint from 'tslint'
import { getNextStatement, isImportDeclaration } from 'tsutils'

interface IOptions {
  aliases: string[]
  alphabeticalByFullPath: boolean
}

interface IJsonOptions {
  aliases: string[]
  'alphabetical-by-full-path': boolean
}

const moduleGroups = ['node_module', 'alias', '../', './']
const reversedModuleGroups = [...moduleGroups].reverse()
const moduleGroupNameMap = {
  '../': 'parentDirectory',
  './': 'currentDirectory'
}

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

// The walker takes care of all the work.
class ImportGroupsWalker extends Lint.AbstractWalker<IOptions> {
  currentModuleGroupType: string
  fix: Lint.Replacement
  importDeclarations: ts.ImportDeclaration[] = []
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
    ts.forEachChild(sourceFile, cb)

    if (this.importDeclarations.length > 0) {
      this.createFix()
    }

    this.importDeclarations.forEach(importDeclaration => {
      this.createFailure(importDeclaration)
    })
  }

  public visitImportDeclaration(node: ts.ImportDeclaration) {
    this.importDeclarations.push(node)
  }

  private createFix() {
    const { sourceFile } = this
    const importsGrouped = {
      alias: [],
      currentDirectory: [],
      node_module: [],
      parentDirectory: []
    }

    /**
     * For each of the original import declarations, we need to
     * group them into their module groups
     */
    this.importDeclarations.forEach(importDeclaration => {
      const modulePath = this.getModulePathByNode(importDeclaration, sourceFile)
      const groupType = this.getGroupTypeByModulePath(modulePath)
      const groupTypeName = moduleGroupNameMap[groupType] || groupType

      importsGrouped[groupTypeName].push(importDeclaration)
    })

    // Sort each module group
    Object.keys(importsGrouped).forEach(importGroupKey => {
      importsGrouped[importGroupKey] = importsGrouped[importGroupKey].sort(
        (a, b) => {
          return this.getSortDirection(a, b)
        }
      )
    })

    /**
     * Creates a fix that replaces everything from the start of
     * the first import to the end of the last import with
     * the newly grouped and sorted imports
     */
    this.fix = new Lint.Replacement(
      this.importDeclarations[0].getStart(),
      this.importDeclarations[this.importDeclarations.length - 1].getEnd(),
      [
        importsGrouped.node_module.map(this.getFullText).join('\n'),
        importsGrouped.alias.map(this.getFullText).join('\n'),
        importsGrouped.parentDirectory.map(this.getFullText).join('\n'),
        importsGrouped.currentDirectory.map(this.getFullText).join('\n')
      ]
        // If any of the groups are empty, filter them out
        .filter(a => a !== '')
        // Make sure there is a newline between groups
        .join('\n\n')
    )
  }

  private createFailure(node: ts.ImportDeclaration) {
    const { sourceFile } = this
    const modulePath = this.getModulePathByNode(node, sourceFile)
    const moduleGroupType = this.getGroupTypeByModulePath(modulePath)
    const next = getNextStatement(node)

    if (!next) {
      return
    }

    // Get info about the current node
    const nodeLine = ts.getLineAndCharacterOfPosition(sourceFile, node.getEnd())
      .line
    // Get info about the next node
    const nextNodeStart = next.getStart(sourceFile)
    const nextNodeLine = ts.getLineAndCharacterOfPosition(
      sourceFile,
      nextNodeStart
    ).line

    this.currentModuleGroupType = moduleGroupType

    // If the next statement is on the line right below the current
    if (nextNodeLine - nodeLine === 1) {
      // If the next node isn't an import, just return
      if (!isImportDeclaration(next)) {
        return
      }

      const nextModulePath = this.getModulePathByNode(next, sourceFile)
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
          this.fix
        )
      } else if (
        /**
         * If the current module comes alphabetically after
         * the next module, than there is an error
         */
        !this.moduleIsAlphabeticallySorted(node, next)
      ) {
        this.addFailure(
          nextNodeStart,
          next.getEnd(),
          Rule.ALPHABETICAL_ERROR,
          this.fix
        )
      }
      // If there is a new line between this node and the next
    } else if (nextNodeLine - nodeLine > 1) {
      // If the next node isn't an import declaration, just return
      if (!isImportDeclaration(next)) {
        return
      }

      const nextModuleText = this.getModulePathByNode(next, sourceFile)
      const nextGroupType = this.getGroupTypeByModulePath(nextModuleText)

      /**
       * If the current module and the next module are of the same group,
       * we need to add a failure because modules of the same group
       * must be in the same group (not separated by a newline)
       */
      if (nextGroupType === this.currentModuleGroupType) {
        this.addFailure(
          nextNodeStart,
          next.getEnd(),
          Rule.SAME_GROUP_FAILURE,
          this.fix
        )
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
          this.fix
        )
      }
    }
  }

  private getFullText = (node: ts.ImportDeclaration) => node.getText()

  private getModulePathByNode = (
    node: ts.ImportDeclaration,
    sourceFile: ts.SourceFile
  ) => node.moduleSpecifier.getText(sourceFile).replace(/'/g, '')

  private getModuleNameFromPath = (modulePath: string) => {
    return modulePath.substring(modulePath.lastIndexOf('/') + 1)
  }

  private getGroupTypeByModulePath = (modulePath: string): string => {
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
  private getNodeModuleOrAliasNameFromPath = nodeModuleOrAliasPath => {
    const firstSeparatorIndex = nodeModuleOrAliasPath.indexOf('/')

    return nodeModuleOrAliasPath.substring(
      0,
      firstSeparatorIndex === -1 ? undefined : firstSeparatorIndex
    )
  }

  /**
   * Given two import declarations, return a -1, 0 or 1 based on
   * how the first import needs to move in order to be sorted correctly
   */
  private getSortDirection = (
    a: ts.ImportDeclaration,
    b: ts.ImportDeclaration
  ) => {
    const { sourceFile } = this
    const { alphabeticalByFullPath } = this.options
    const aPath = this.getModulePathByNode(a, sourceFile)
    const bPath = this.getModulePathByNode(b, sourceFile)
    const groupType = this.getGroupTypeByModulePath(aPath)

    /**
     * If we are dealing with a node module or alias, we need to
     * check whether the node_module/alias are sorted alphabetically before
     * checking whether or not they are sorted by module name
     */
    if (!alphabeticalByFullPath) {
      if (groupType === 'node_module' || groupType === 'alias') {
        const currentNodeModuleOrAliasName = this.getNodeModuleOrAliasNameFromPath(
          aPath
        )
        const nextNodeModuleOrAliasName = this.getNodeModuleOrAliasNameFromPath(
          bPath
        )

        if (currentNodeModuleOrAliasName !== nextNodeModuleOrAliasName) {
          return currentNodeModuleOrAliasName.localeCompare(
            nextNodeModuleOrAliasName
          )
        } else {
          return this.getModuleNameFromPath(aPath).localeCompare(
            this.getModuleNameFromPath(bPath)
          )
        }
      }
    }

    return aPath.localeCompare(bPath)
  }

  private moduleIsAlphabeticallySorted = (
    nextModule: ts.ImportDeclaration,
    currentModule: ts.ImportDeclaration
  ): boolean => {
    return this.getSortDirection(nextModule, currentModule) <= 0
  }
}

const defaultOptions: IOptions = {
  aliases: undefined,
  alphabeticalByFullPath: false
}

function parseOptions(ruleArguments: any[]): IOptions {
  const options = (ruleArguments as IJsonOptions[])[0]

  if (!options) {
    return defaultOptions
  }

  return {
    aliases: options.aliases,
    alphabeticalByFullPath: options['alphabetical-by-full-path']
  }
}
