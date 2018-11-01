// @flow

import React, {PureComponent} from 'react'
import noop from 'lodash/noop'

type Props = {
    children?: any,
    isActive: boolean,
    styleNameFactory: any,
    onClick: Function
};

export default class Tab extends PureComponent {
    static defaultProps = {
        children: null,
        onClick: noop
    };

    props: Props;

    render() {
        const {isActive, children, styleNameFactory, onClick} = this.props;
        return (
            <button
                type="button"
                {...styleNameFactory('tab', {active: isActive})}
                onClick={onClick}
            >
                {children}
            </button>
        )
    }
}
