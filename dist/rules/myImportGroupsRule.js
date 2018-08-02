"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var Lint = require("tslint");
var tsutils_1 = require("tsutils");
var importGroups = ['module', '../', './'];
var Rule = (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithWalker(new ImportGroupsWalker(sourceFile, this.ruleName, parseOptions(this.ruleArguments)));
    };
    Rule.GROUP_OUT_OF_ORDER_STRING = 'Imports must be in the following order: node_modules, aliases, parentDirectory, currentDirectory';
    Rule.SAME_GROUP_FAILURE = 'Imports of the same type must be grouped together';
    Rule.SEPERATE_GROUPS_FAILURE = 'Imports of different groups must be separated by newlines';
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
var getGroupTypeByModuleName = function (moduleName) {
    for (var _i = 0, _a = importGroups.reverse(); _i < _a.length; _i++) {
        var group = _a[_i];
        if (moduleName.startsWith(group)) {
            return group;
        }
    }
};
var getModuleNameByNode = function (node) {
    return node.moduleSpecifier.getText().replace(/'/g, '');
};
var moduleIsAlphabeticallySorted = function (nextModuleName, currentModuleName) {
    return currentModuleName.localeCompare(nextModuleName) === 1;
};
var ImportGroupsWalker = (function (_super) {
    __extends(ImportGroupsWalker, _super);
    function ImportGroupsWalker(sourceFile, ruleName, options) {
        var _this = _super.call(this, sourceFile, ruleName, options) || this;
        if (options.aliasPrefix) {
            importGroups.splice(1, 0, options.aliasPrefix);
        }
        return _this;
    }
    ImportGroupsWalker.prototype.walk = function (sourceFile) {
        var _this = this;
        var cb = function (node) {
            if (node.kind === ts.SyntaxKind.ImportDeclaration) {
                _this.visitImportDeclaration(node);
            }
            return ts.forEachChild(node, cb);
        };
        return ts.forEachChild(sourceFile, cb);
    };
    ImportGroupsWalker.prototype.visitImportDeclaration = function (node) {
        var sourceFile = this.sourceFile;
        var moduleName = getModuleNameByNode(node);
        var importGroupType = getGroupTypeByModuleName(moduleName);
        var next = tsutils_1.getNextStatement(node);
        if (!next) {
            return;
        }
        var start = node.getStart(sourceFile);
        var line = ts.getLineAndCharacterOfPosition(sourceFile, start).line;
        var nextLine = ts.getLineAndCharacterOfPosition(sourceFile, next.end).line;
        this.currentImportGroupType = importGroupType;
        if (nextLine - line === 1) {
            if (!tsutils_1.isImportDeclaration(next)) {
                return;
            }
            var nextModuleName = getModuleNameByNode(next);
            var nextImportGroupType = getGroupTypeByModuleName(nextModuleName);
            if (nextImportGroupType !== this.currentImportGroupType) {
                this.addFailure(next.getStart(), next.getStart() + next.getWidth(), Rule.SEPERATE_GROUPS_FAILURE);
            }
            else if (!moduleIsAlphabeticallySorted(moduleName, nextModuleName)) {
                this.addFailure(next.getStart(), next.getStart() + next.getWidth(), 'Must be sorted alphabetically');
            }
        }
        else if (nextLine - line > 1) {
            if (!tsutils_1.isImportDeclaration(next)) {
                return;
            }
            var nextModuleText = next.moduleSpecifier.getText().replace(/'/g, '');
            var nextGroupType = getGroupTypeByModuleName(nextModuleText);
            if (nextGroupType === this.currentImportGroupType) {
                this.addFailure(next.getStart(), next.getStart() + next.getWidth(), Rule.SAME_GROUP_FAILURE);
            }
            else if (importGroups.indexOf(nextGroupType) <
                importGroups.indexOf(importGroupType)) {
                this.addFailure(next.getStart(), next.getStart() + next.getWidth(), Rule.GROUP_OUT_OF_ORDER_STRING);
            }
        }
    };
    return ImportGroupsWalker;
}(Lint.AbstractWalker));
var defaultOptions = {
    aliasPrefix: undefined
};
function parseOptions(ruleArguments) {
    var options = ruleArguments[0];
    if (!options) {
        return defaultOptions;
    }
    return {
        aliasPrefix: options['alias-prefix']
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlJbXBvcnRHcm91cHNSdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3J1bGVzL215SW1wb3J0R3JvdXBzUnVsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBZ0M7QUFDaEMsNkJBQThCO0FBQzlCLG1DQUErRDtBQVUvRCxJQUFNLFlBQVksR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFFNUM7SUFBMEIsd0JBQXVCO0lBQWpEOztJQWlCQSxDQUFDO0lBVFEsb0JBQUssR0FBWixVQUFhLFVBQXlCO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FDekIsSUFBSSxrQkFBa0IsQ0FDcEIsVUFBVSxFQUNWLElBQUksQ0FBQyxRQUFRLEVBQ2IsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FDakMsQ0FDRixDQUFBO0lBQ0gsQ0FBQztJQWZhLDhCQUF5QixHQUNyQyxrR0FBa0csQ0FBQTtJQUN0Rix1QkFBa0IsR0FDOUIsbURBQW1ELENBQUE7SUFDdkMsNEJBQXVCLEdBQ25DLDJEQUEyRCxDQUFBO0lBVy9ELFdBQUM7Q0FBQSxBQWpCRCxDQUEwQixJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksR0FpQmhEO0FBakJZLG9CQUFJO0FBbUJqQixJQUFNLHdCQUF3QixHQUFHLFVBQUMsVUFBa0I7SUFDbEQsS0FBa0IsVUFBc0IsRUFBdEIsS0FBQSxZQUFZLENBQUMsT0FBTyxFQUFFLEVBQXRCLGNBQXNCLEVBQXRCLElBQXNCLEVBQUU7UUFBckMsSUFBSSxLQUFLLFNBQUE7UUFDWixJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDaEMsT0FBTyxLQUFLLENBQUE7U0FDYjtLQUNGO0FBQ0gsQ0FBQyxDQUFBO0FBRUQsSUFBTSxtQkFBbUIsR0FBRyxVQUFDLElBQTBCO0lBQ3JELE9BQUEsSUFBSSxDQUFDLGVBQWUsQ0FB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