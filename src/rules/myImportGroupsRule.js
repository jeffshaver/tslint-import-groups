"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlJbXBvcnRHcm91cHNSdWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibXlJbXBvcnRHcm91cHNSdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFBLCtCQUFnQztBQUNoQyw2QkFBOEI7QUFDOUIsbUNBQStEO0FBVS9ELElBQU0sWUFBWSxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUU1QztJQUEwQix3QkFBdUI7SUFBakQ7O0lBaUJBLENBQUM7SUFUUSxvQkFBSyxHQUFaLFVBQWEsVUFBeUI7UUFDcEMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUN6QixJQUFJLGtCQUFrQixDQUNwQixVQUFVLEVBQ1YsSUFBSSxDQUFDLFFBQVEsRUFDYixZQUFZLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUNqQyxDQUNGLENBQUE7SUFDSCxDQUFDO0lBZmEsOEJBQXlCLEdBQ3JDLGtHQUFrRyxDQUFBO0lBQ3RGLHVCQUFrQixHQUM5QixtREFBbUQsQ0FBQTtJQUN2Qyw0QkFBdUIsR0FDbkMsMkRBQTJELENBQUE7SUFXL0QsV0FBQztDQUFBLEFBakJELENBQTBCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxHQWlCaEQ7QUFqQlksb0JBQUk7QUFtQmpCLElBQU0sd0JBQXdCLEdBQUcsVUFBQyxVQUFrQjtJQUNsRCxLQUFrQixVQUFzQixFQUF0QixLQUFBLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBdEIsY0FBc0IsRUFBdEIsSUFBc0IsRUFBRTtRQUFyQyxJQUFJLEtBQUssU0FBQTtRQUNaLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNoQyxPQUFPLEtBQUssQ0FBQTtTQUNiO0tBQ0Y7QUFDSCxDQUFDLENBQUE7QUFFRCxJQUFNLG1CQUFtQixHQUFHLFVBQUMsSUFBMEI7SUFDckQsT0FBQSxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDLE9B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