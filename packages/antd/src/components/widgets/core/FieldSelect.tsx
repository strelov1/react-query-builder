import React, { PureComponent } from 'react';
import { Tooltip, Select } from 'antd';
import keys from 'lodash/keys';
import {
  BUILT_IN_PLACEMENTS,
  SELECT_WIDTH_OFFSET_RIGHT,
  calcTextWidth,
} from '../../../../utils/stuff';

const { Option, OptGroup } = Select;

type FieldSelectProps = {
  config: any;
  customProps?: any;
  items: Array<any>;
  placeholder?: string;
  selectedKey?: string;
  selectedKeys?: Array<any>;
  selectedPath?: Array<any>;
  selectedLabel?: string;
  selectedAltLabel?: string;
  selectedFullLabel?: string;
  selectedOpts?: any;
  readonly?: boolean;
  // actions
  setField: () => void;
};

export default class FieldSelect extends PureComponent<FieldSelectProps> {
  onChange = (key) => {
    this.props.setField(key);
  };

  filterOption = (input, option) => {
    const dataForFilter = option;
    const keysForFilter = ['title', 'value', 'grouplabel', 'label'];
    const valueForFilter = keysForFilter
      .map((k) => (typeof dataForFilter[k] === 'string' ? dataForFilter[k] : ''))
      .join('\0');
    return valueForFilter.toLowerCase().indexOf(input.toLowerCase()) >= 0;
  };

  render() {
    const {
      config,
      customProps,
      items,
      placeholder,
      selectedKey,
      selectedLabel,
      selectedOpts,
      selectedAltLabel,
      selectedFullLabel,
      readonly,
    } = this.props;
    const { showSearch } = customProps || {};

    const selectText = selectedLabel || placeholder;
    const selectWidth = calcTextWidth(selectText);
    const isFieldSelected = !!selectedKey;
    const { dropdownPlacement } = config.settings;
    const dropdownAlign = dropdownPlacement
      ? BUILT_IN_PLACEMENTS[dropdownPlacement]
      : undefined;
    const width =
      isFieldSelected && !showSearch ? null : selectWidth + SELECT_WIDTH_OFFSET_RIGHT;
    let tooltipText = selectedAltLabel || selectedFullLabel;
    if (tooltipText == selectedLabel) tooltipText = null;

    const fieldSelectItems = this.renderSelectItems(items);

    let res = (
      <Select
        dropdownAlign={dropdownAlign}
        dropdownMatchSelectWidth={false}
        style={{ width }}
        placeholder={placeholder}
        size={config.settings.renderSize}
        onChange={this.onChange}
        value={selectedKey || undefined}
        filterOption={this.filterOption}
        disabled={readonly}
        {...customProps}
      >
        {fieldSelectItems}
      </Select>
    );

    if (tooltipText && !selectedOpts.tooltip) {
      res = <Tooltip title={tooltipText}>{res}</Tooltip>;
    }

    return res;
  }

  renderSelectItems(fields) {
    return keys(fields).map((fieldKey) => {
      const field = fields[fieldKey];
      const { items, key, path, label, fullLabel, altLabel, tooltip, grouplabel } = field;
      const _path = path || key;
      if (items) {
        return (
          <OptGroup key={_path} label={label}>
            {this.renderSelectItems(items)}
          </OptGroup>
        );
      }
      const option = tooltip ? <Tooltip title={tooltip}>{label}</Tooltip> : label;
      return (
        <Option
          key={_path}
          value={_path}
          title={altLabel}
          grouplabel={grouplabel}
          label={label}
        >
          {option}
        </Option>
      );
    });
  }
}
