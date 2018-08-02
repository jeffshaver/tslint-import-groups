import * as ts from 'typescript';
import * as Lint from 'tslint';
export declare class Rule extends Lint.Rules.AbstractRule {
    static GROUP_OUT_OF_ORDER_STRING: string;
    static SAME_GROUP_FAILURE: string;
    static SEPERATE_GROUPS_FAILURE: string;
    apply(sourceFile: ts.SourceFile): Lint.RuleFailure[];
}
