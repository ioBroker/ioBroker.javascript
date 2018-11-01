// @flow

import React, {PureComponent} from 'react'
import Tab from './Tab'

type Props = {
    styleNameFactory: any,
    single: string,
    multiple: string,
    isMultiple: boolean,
    onChange: any
};

export default class MultipleSwitcher extends PureComponent {
    static defaultProps = {
        single: 'Every:',
        multiple: 'On:'
    };

    props: Props;

    render() {
        const {styleNameFactory, single, multiple, isMultiple, onChange} = this.props;
        return (
            <div>
                <div
                    {...styleNameFactory('row', 'inline')}
                    onClick={onChange}
                    data-multiple-switcher
                >
                    <Tab
                        styleNameFactory={styleNameFactory}
                        isActive={!isMultiple}
                    >
                        {single}
                    </Tab>
                    <Tab
                        styleNameFactory={styleNameFactory}
                        isActive={isMultiple}
                    >
                        {multiple}
                    </Tab>
                </div>
            </div>
        )
    }
}
