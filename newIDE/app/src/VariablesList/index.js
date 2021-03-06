// @flow
import React, { Component } from 'react';
import {
  Table,
  TableHeader,
  TableHeaderColumn,
  TableRow,
} from 'material-ui/Table';
import IconButton from 'material-ui/IconButton';
import ContentCopy from 'material-ui/svg-icons/content/content-copy';
import ContentPaste from 'material-ui/svg-icons/content/content-paste';
import Delete from 'material-ui/svg-icons/action/delete';
import flatten from 'lodash/flatten';
import { SortableContainer, SortableElement } from 'react-sortable-hoc';
import { mapFor } from '../Utils/MapFor';
import EmptyMessage from '../UI/EmptyMessage';
import newNameGenerator from '../Utils/NewNameGenerator';
import VariableRow from './VariableRow';
import AddVariableRow from './AddVariableRow';
import styles from './styles';
import {
  getInitialSelection,
  hasSelection,
  addToSelection,
  getSelection,
} from '../Utils/SelectionHandler';
import { CLIPBOARD_KIND } from './ClipboardKind';
import Clipboard from '../Utils/Clipboard';
import { serializeToJSObject, unserializeFromJSObject } from '../Utils/Serializer';
const gd = global.gd;

const SortableVariableRow = SortableElement(VariableRow);
const SortableAddVariableRow = SortableElement(AddVariableRow);

class VariablesListBody extends Component<*, *> {
  render() {
    return <div>{this.props.children}</div>;
  }
}

const SortableVariablesListBody = SortableContainer(VariablesListBody);
SortableVariablesListBody.muiName = 'TableBody';

type VariableAndName = {| name: string, ptr: number, variable: gdVariable |};

type Props = {|
  variablesContainer: gdVariablesContainer,
  emptyExplanationMessage?: string,
  emptyExplanationSecondMessage?: string,
|};
type State = {|
  nameErrors: { [string]: string },
  selectedVariables: { [number]: ?VariableAndName },
  mode: 'select' | 'move',
|};

export default class VariablesList extends Component<Props, State> {
  state = {
    nameErrors: {},
    selectedVariables: getInitialSelection(),
    mode: 'select',
  };

  _selectVariable = (variableAndName: VariableAndName, select: boolean) => {
    this.setState({
      selectedVariables: addToSelection(
        this.state.selectedVariables,
        variableAndName,
        select
      ),
    });
  };

  copySelection = () => {
    Clipboard.set(
      CLIPBOARD_KIND,
      getSelection(this.state.selectedVariables).map(({ name, variable }) => ({
        name,
        serializedVariable: serializeToJSObject(variable),
      }))
    );
  };

  paste = () => {
    const { variablesContainer } = this.props;
    if (!Clipboard.has(CLIPBOARD_KIND)) return;

    const variables = Clipboard.get(CLIPBOARD_KIND);
    variables.forEach(({ name, serializedVariable }) => {
      const newName = newNameGenerator(name, (name) => variablesContainer.has(name), 'CopyOf');
      const newVariable = new gd.Variable();
      unserializeFromJSObject(newVariable, serializedVariable);
      variablesContainer.insert(newName, newVariable, variablesContainer.count())
      newVariable.delete();
    });
    this.forceUpdate();
  };

  deleteSelection = () => {
    const { variablesContainer } = this.props;
    const selection: Array<VariableAndName> = getSelection(
      this.state.selectedVariables
    );

    // Only delete ancestor variables, as selection can be composed of variables
    // that are contained inside others.
    const ancestorOnlyVariables = selection.filter(({ variable }) => {
      return selection.filter(
        otherVariableAndName =>
          variable !== otherVariableAndName &&
          otherVariableAndName.variable.contains(variable)
      );
    });

    // We don't want to ever manipulate/access to variables that have been deleted (by removeRecursively):
    // that's why it's important to only delete ancestor variables.
    ancestorOnlyVariables.forEach(({ variable }: VariableAndName) =>
      variablesContainer.removeRecursively(variable)
    );
    this.setState({
      selectedVariables: getInitialSelection(),
    });
  };

  _renderVariableChildren(
    name: string,
    parentVariable: gdVariable,
    depth: number
  ) {
    const names = parentVariable.getAllChildrenNames().toJSArray();

    return flatten(
      names.map((name, index) => {
        const variable = parentVariable.getChild(name);
        return this._renderVariableAndChildrenRows(
          name,
          variable,
          depth + 1,
          index,
          parentVariable
        );
      })
    );
  }

  _renderVariableAndChildrenRows(
    name: string,
    variable: gdVariable,
    depth: number,
    index: number,
    parentVariable: ?gdVariable
  ) {
    const { variablesContainer } = this.props;
    const isStructure = variable.isStructure();

    return (
      <SortableVariableRow
        name={name}
        index={index}
        key={'variable-' + name}
        variable={variable}
        disabled={depth !== 0}
        depth={depth}
        errorText={
          this.state.nameErrors[variable.ptr]
            ? 'This name is already taken'
            : undefined
        }
        onChangeValue={text => {
          variable.setString(text);
          this.forceUpdate();
          if (this.props.onSizeUpdated) this.props.onSizeUpdated();
        }}
        onBlur={event => {
          const text = event.target.value;
          if (name === text) return;

          let success = true;
          if (!parentVariable) {
            success = this.props.variablesContainer.rename(name, text);
          } else {
            success = parentVariable.renameChild(name, text);
          }

          this.setState({
            nameErrors: {
              ...this.state.nameErrors,
              [variable.ptr]: !success,
            },
          });
        }}
        onRemove={() => {
          if (!parentVariable) {
            variablesContainer.remove(name);
          } else {
            parentVariable.removeChild(name);
          }

          this.forceUpdate();
          if (this.props.onSizeUpdated) this.props.onSizeUpdated();
        }}
        onAddChild={() => {
          const name = newNameGenerator('ChildVariable', name =>
            variable.hasChild(name)
          );
          variable.getChild(name).setString('');

          this.forceUpdate();
          if (this.props.onSizeUpdated) this.props.onSizeUpdated();
        }}
        children={
          isStructure
            ? this._renderVariableChildren(name, variable, depth)
            : null
        }
        showHandle={this.state.mode === 'move'}
        showSelectionCheckbox={this.state.mode === 'select'}
        isSelected={!!this.state.selectedVariables[variable.ptr]}
        onSelect={select =>
          this._selectVariable({ name, ptr: variable.ptr, variable }, select)}
      />
    );
  }

  _renderEmpty() {
    return (
      <div>
        <EmptyMessage
          style={styles.emptyExplanation}
          messageStyle={styles.emptyExplanationMessage}
        >
          {this.props.emptyExplanationMessage}
        </EmptyMessage>
        <EmptyMessage
          style={styles.emptyExplanation}
          messageStyle={styles.emptyExplanationMessage}
        >
          {this.props.emptyExplanationSecondMessage}
        </EmptyMessage>
      </div>
    );
  }

  render() {
    const { variablesContainer } = this.props;
    if (!variablesContainer) return;

    const containerVariablesTree = mapFor(
      0,
      variablesContainer.count(),
      index => {
        const variable = variablesContainer.getAt(index);
        const name = variablesContainer.getNameAt(index);

        return this._renderVariableAndChildrenRows(
          name,
          variable,
          0,
          index,
          undefined
        );
      }
    );

    const addRow = (
      <SortableAddVariableRow
        index={0}
        key={'add-variable-row'}
        disabled
        onAdd={() => {
          const variable = new gd.Variable();
          variable.setString('');
          const name = newNameGenerator('Variable', name =>
            variablesContainer.has(name)
          );
          variablesContainer.insert(name, variable, variablesContainer.count());

          this.forceUpdate();
          if (this.props.onSizeUpdated) this.props.onSizeUpdated();
        }}
      />
    );

    return (
      <div>
        <Table selectable={false}>
          <TableHeader displaySelectAll={false} adjustForCheckbox={false}>
            <TableRow>
              <TableHeaderColumn>Name</TableHeaderColumn>
              <TableHeaderColumn>Value</TableHeaderColumn>
              <TableHeaderColumn style={styles.toolColumnHeader}>
                <IconButton
                  onClick={this.copySelection}
                  disabled={!hasSelection(this.state.selectedVariables)}
                >
                  <ContentCopy />
                </IconButton>
                <IconButton
                  onClick={this.paste}
                  disabled={!Clipboard.has(CLIPBOARD_KIND)}
                >
                  <ContentPaste />
                </IconButton>
                <IconButton
                  onClick={this.deleteSelection}
                  disabled={!hasSelection(this.state.selectedVariables)}
                >
                  <Delete />
                </IconButton>
              </TableHeaderColumn>
            </TableRow>
          </TableHeader>
        </Table>
        <SortableVariablesListBody
          variablesContainer={this.props.variablesContainer}
          onSortEnd={({ oldIndex, newIndex }) => {
            this.props.variablesContainer.move(oldIndex, newIndex);
            this.forceUpdate();
          }}
          helperClass="sortable-helper"
          useDragHandle
          lockToContainerEdges
        >
          {!containerVariablesTree.length && this._renderEmpty()}
          {!!containerVariablesTree.length && containerVariablesTree}
          {addRow}
        </SortableVariablesListBody>
      </div>
    );
  }
}
