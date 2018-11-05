// @flow

import React, {PureComponent} from 'react'
import BEMHelper from 'react-bem-helper'
import {generateCronExpression, parseCronExpression} from './utils'
import cronsTrue from 'cronstrue'
import noop from 'lodash/noop'
import Tab from './components/Tab'
import PeriodicallyTab from './components/PeriodicallyTab'
import PeriodicallyFrameTab from './components/PeriodicallyFrameTab'
import FixedTimeTab from './components/FixedTimeTab'

import './cron-builder.styl'

const styleNameFactory = new BEMHelper('cron-builder');

type Props = {
    cronExpression: string,
    showResult?: boolean,
    onChange: Function
};

type State = {
    activeIndex: number,
    Component: any,
    generatedExpression: string
};

const components = [PeriodicallyTab, PeriodicallyFrameTab, FixedTimeTab];
const getActiveTabIndex = (props: Props) => {
    const {cronExpression} = props;
    const parsedExpression = parseCronExpression(cronExpression);
    if(parsedExpression.hours.includes('-')) {
        return 1
    } else {
        return 0
    }
};

export default class CronBuilder extends PureComponent {
    static defaultProps = {
        cronExpression: '* * * * *',
        showResult: true,
        onChange: noop
    };

    constructor(props: Props, ctx: Object) {
        super(props, ctx);
        const activeIndex = getActiveTabIndex(props);
        this.state = {
            activeIndex,
            generatedExpression: ''
        };
        setTimeout(() => this.generateExpression(), 100);
    }

    state: State;

    props: Props;

    presetComponent: any;

    generateExpression = () => {
        const {onChange} = this.props;
        this.setState({
            generatedExpression: generateCronExpression(
                this.presetComponent.getExpression()
            )
        }, () => onChange(this.state.generatedExpression));
    };

    selectTab = (activeIndex: number) => {
        return () => {
            this.setState({
                activeIndex
            }, () => {
                this.generateExpression();
            })
        }
    };

    render() {
        const {cronExpression, showResult} = this.props;
        const {activeIndex, generatedExpression} = this.state;
        const Component = components[activeIndex];
        return (
            <div {...styleNameFactory()} >
                <fieldset {...styleNameFactory('fieldset')} >
                    <legend {...styleNameFactory('legend')} >
                        <Tab
                            isActive={activeIndex === 0}
                            styleNameFactory={styleNameFactory}
                            onClick={this.selectTab(0)}
                        >
                            Periodically
                        </Tab>
                        <Tab
                            isActive={activeIndex === 1}
                            styleNameFactory={styleNameFactory}
                            onClick={this.selectTab(1)}
                        >
                            Periodically within a time frame
                        </Tab>
                        <Tab
                            isActive={activeIndex === 2}
                            styleNameFactory={styleNameFactory}
                            onClick={this.selectTab(2)}
                        >
                            At a recurring fixed time
                        </Tab>
                    </legend>
                    <Component
                        styleNameFactory={styleNameFactory}
                        ref={(component: any) => this.presetComponent = component}
                        onChange={() => this.generateExpression()}
                        expression={parseCronExpression(cronExpression)}
                    />
                </fieldset>
                {!!generatedExpression && showResult &&
                    (<div data-result>
                        <hr{...styleNameFactory('hr')}/>
                        <PrettyExpression expression={generatedExpression}/>
                        <div{...styleNameFactory('result')}>
                            {generatedExpression}
                        </div>
                    </div>)
                }
            </div>
        )
    }
}

function PrettyExpression(props: any) {
    const {expression} = props;
    return (
        <div
            {...styleNameFactory('pretty-expression')}
        >
            {cronsTrue.toString(expression)}
        </div>
    )
}
