import React, { Component } from 'react';
import FlatButton from 'material-ui/FlatButton';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton';
import Dialog from '../../UI/Dialog';
import ColorField from '../../UI/ColorField';
import EmptyMessage from '../../UI/EmptyMessage';
import PropertiesEditor from '../../PropertiesEditor';
import propertiesMapToSchema from '../../PropertiesEditor/PropertiesMapToSchema';
import some from 'lodash/some';

export default class ScenePropertiesDialog extends Component {
  constructor(props) {
    super(props);
    this.state = { ...this._loadFrom(props.layout) };
  }

  _loadFrom(layout) {
    return {
      windowTitle: layout.getWindowDefaultTitle(),
      backgroundColor: {
        r: layout.getBackgroundColorRed(),
        g: layout.getBackgroundColorGreen(),
        b: layout.getBackgroundColorBlue(),
        a: 1,
      },
    };
  }

  componentWillReceiveProps(newProps) {
    if (
      (!this.props.open && newProps.open) ||
      (newProps.open && this.props.layout !== newProps.layout)
    ) {
      this.setState(this._loadFrom(newProps.layout));
    }
  }

  _onApply = () => {
    this.props.layout.setWindowDefaultTitle(this.state.windowTitle);
    this.props.layout.setBackgroundColor(
      this.state.backgroundColor.r,
      this.state.backgroundColor.g,
      this.state.backgroundColor.b
    );
    if (this.props.onApply) this.props.onApply();
  };

  render() {
    const { layout, project } = this.props;
    const actions = [
      // TODO: Add support for cancelling modifications made to BehaviorSharedData
      // (either by enhancing a function like propertiesMapToSchema or using copies)
      // and then re-enable cancel button.
      // <FlatButton
      //   label="Cancel"
      //   primary={false}
      //   onClick={this.props.onClose}
      // />,
      <FlatButton
        label="Ok"
        key="ok"
        primary={true}
        keyboardFocused={true}
        onClick={this._onApply}
      />,
    ];

    const allBehaviorSharedDataNames = layout
      .getAllBehaviorSharedDataNames()
      .toJSArray();

    const propertiesEditors = allBehaviorSharedDataNames.map(name => {
      const sharedData = layout.getBehaviorSharedData(name);

      const properties = sharedData.getProperties(project);
      const propertiesSchema = propertiesMapToSchema(
        properties,
        sharedData => sharedData.getProperties(project),
        (sharedData, name, value) =>
          sharedData.updateProperty(name, value, project)
      );

      return (
        !!propertiesSchema.length && (
          <PropertiesEditor
            schema={propertiesSchema}
            instances={[sharedData]}
          />
        )
      );
    });

    return (
      <Dialog
        actions={actions}
        open={this.props.open}
        onRequestClose={this.props.onClose}
        autoScrollBodyContent={true}
        contentStyle={{ width: '350px' }}
      >
        <TextField
          floatingLabelText="Window title"
          fullWidth
          type="text"
          value={this.state.windowTitle}
          onChange={(e, value) => this.setState({ windowTitle: value })}
        />
        <ColorField
          floatingLabelText="Scene background color"
          fullWidth
          disableAlpha
          color={this.state.backgroundColor}
          onChangeComplete={color =>
            this.setState({ backgroundColor: color.rgb })}
        />
        <RaisedButton
          label="Edit scene variables"
          fullWidth
          onClick={() => {
            this.props.onEditVariables();
            this.props.onClose();
          }}
        />
        {!some(propertiesEditors) && (
          <EmptyMessage>
            Any additional properties will appear here if you add behaviors to
            objects, like Physics behavior.
          </EmptyMessage>
        )}
        {propertiesEditors}
        {this.props.onOpenMoreSettings && (
          <RaisedButton
            label="Open advanced settings"
            fullWidth
            onClick={() => {
              this.props.onOpenMoreSettings();
              this.props.onClose();
            }}
          />
        )}
      </Dialog>
    );
  }
}
