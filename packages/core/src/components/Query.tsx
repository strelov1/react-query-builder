import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { createStore } from 'redux';
import { Provider, connect } from 'react-redux';
import pick from 'lodash/pick';
import { Config, ImmutableTree } from 'types';
import createTreeStore from '../stores/tree';
import * as actions from '../actions';
import { extendConfig } from '../utils/configUtils';
import { fixPathsInTree } from '../utils/treeUtils';
import {
  bindActionCreators,
  shallowEqual,
  immutableEqual,
  onPropsChanged,
} from '../utils/stuff';
import { validateTree } from '../utils/validation';
import { defaultRoot } from '../utils/defaultUtils';
import { liteShouldComponentUpdate } from '../utils/renderUtils';

const configKeys = [
  'conjunctions',
  'fields',
  'types',
  'operators',
  'widgets',
  'settings',
  'funcs',
];

const validateAndFixTree = (newTree, _oldTree, newConfig, oldConfig) => {
  let tree = validateTree(newTree, _oldTree, newConfig, oldConfig, true, true);
  tree = fixPathsInTree(tree);
  return tree;
};

type QueryProps = {
  config: Config;
  onChange?: () => void;
  renderBuilder: () => void;
  tree: ImmutableTree;
};
class Query extends PureComponent<QueryProps> {
  constructor(props: QueryProps) {
    super(props);
    onPropsChanged(this);

    this._updateActions(props);

    this.validatedTree = this.validateTree(props, props);
    // props.onChange && props.onChange(this.validatedTree, props.config);
  }

  validateTree(props, oldProps) {
    return validateAndFixTree(props.tree, oldProps.tree, props.config, oldProps.config);
  }

  _updateActions(props) {
    const { config, dispatch } = props;
    this.actions = bindActionCreators(
      { ...actions.tree, ...actions.group, ...actions.rule },
      config,
      dispatch
    );
  }

  onPropsChanged(nextProps) {
    const { onChange } = nextProps;
    const oldConfig = this.props.config;
    const newTree = nextProps.tree;
    const newConfig = nextProps.config;
    const oldValidatedTree = this.validatedTree;

    this.validatedTree = newTree;
    if (oldConfig !== newConfig) {
      this._updateActions(nextProps);
      this.validatedTree = this.validateTree(nextProps, this.props);
    }

    const validatedTreeChanged = !immutableEqual(this.validatedTree, oldValidatedTree);
    if (validatedTreeChanged) {
      onChange && onChange(this.validatedTree, newConfig);
    }
  }

  render() {
    const { config, renderBuilder, dispatch, __isInternalValueChange } = this.props;
    const builderProps = {
      tree: this.validatedTree,
      actions: this.actions,
      config,
      dispatch,
      __isInternalValueChange,
    };

    return renderBuilder(builderProps);
  }
}

const ConnectedQuery = connect((state) => {
  return {
    tree: state.tree,
    __isInternalValueChange: state.__isInternalValueChange,
  };
})(Query);
ConnectedQuery.displayName = 'ConnectedQuery';

export default class QueryContainer extends Component {
  static propTypes = {
    // config
    conjunctions: PropTypes.object.isRequired,
    fields: PropTypes.object.isRequired,
    types: PropTypes.object.isRequired,
    operators: PropTypes.object.isRequired,
    widgets: PropTypes.object.isRequired,
    settings: PropTypes.object.isRequired,

    onChange: PropTypes.func,
    renderBuilder: PropTypes.func,
    value: PropTypes.any, // instanceOf(Immutable.Map)
  };

  constructor(props, context) {
    super(props, context);
    onPropsChanged(this);

    const config = pick(props, configKeys);
    const extendedConfig = extendConfig(config);
    const tree = props.value;
    const validatedTree = tree ? validateAndFixTree(tree, null, config, config) : null;

    const store = createTreeStore({ ...config, tree: validatedTree });

    this.state = {
      store: createStore(store),
      config: extendedConfig,
    };
  }

  shouldComponentUpdate = liteShouldComponentUpdate(this, {
    value: (nextValue, prevValue, state) => {
      return false;
    },
  });

  onPropsChanged(nextProps) {
    // compare configs
    const oldConfig = pick(this.props, configKeys);
    let nextConfig = pick(nextProps, configKeys);
    const isConfigChanged = !shallowEqual(oldConfig, nextConfig, true);
    if (isConfigChanged) {
      nextConfig = extendConfig(nextConfig);
      this.setState({ config: nextConfig });
    }

    // compare trees
    const storeValue = this.state.store.getState().tree;
    const isTreeChanged =
      !immutableEqual(nextProps.value, this.props.value) &&
      !immutableEqual(nextProps.value, storeValue);
    if (isTreeChanged) {
      const nextTree = nextProps.value || defaultRoot({ ...nextProps, tree: null });
      const validatedTree = validateAndFixTree(nextTree, null, nextConfig, oldConfig);
      return Promise.resolve().then(() => {
        this.state.store.dispatch(actions.tree.setTree(nextProps, validatedTree));
      });
    }
  }

  render() {
    // `get_children` is deprecated!
    const { renderBuilder, get_children, onChange, settings } = this.props;
    const { config, store } = this.state;
    const { renderProvider: QueryWrapper } = settings;

    return (
      <QueryWrapper config={config}>
        <Provider store={store}>
          <ConnectedQuery
            store={store}
            config={config}
            onChange={onChange}
            renderBuilder={renderBuilder || get_children}
          />
        </Provider>
      </QueryWrapper>
    );
  }
}
