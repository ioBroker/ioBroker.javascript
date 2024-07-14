import React from 'react';
import PropTypes from 'prop-types';

import { FormControl, MenuItem, Select } from '@mui/material';

import { I18n, Utils } from '@iobroker/adapter-react-v5';

import cls from './style.module.scss';

const DAYS = [
    31, // 1
    29, // 2
    31, // 3
    30, // 4
    31, // 5
    30, // 6
    31, // 7
    31, // 8
    30, // 9
    31, // 10
    30, // 11
    31  // 12
];

const CustomDate = ({ value, onChange, className, title, style }) => {
    let [month, date] = (value || '01.01').toString().split('.');
    date = parseInt(date, 10) || 0;
    month = parseInt(month, 10) || 0;
    if (month > 12) {
        month = 12;
    } else if (month < 0) {
        month = 0;
    }

    if (date > DAYS[month]) {
        date = DAYS[month];
    } else if (date < 0) {
        date = 0;
    }

    let days = [];
    for (let i = 0; i < DAYS[month]; i++) {
        days.push(i + 1);
    }

    return <div>
        <FormControl
            variant="standard"
            className={Utils.clsx(cls.root, className)}
            style={style}
        >
            <Select
                variant="standard"
                className={Utils.clsx(cls.root, className)}
                margin="dense"
                label={I18n.t('Month')}
                onChange={e =>
                    onChange(`${e.target.value.toString().padStart(2, '0')}.${date.toString().padStart(2, '0')}`)}
                value={month}
            >
                <MenuItem style={{ placeContent: 'space-between' }} key={0} value={0}>{I18n.t('Any month')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={1} value={1}>{I18n.t('January')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={2} value={2}>{I18n.t('February')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={3} value={3}>{I18n.t('March')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={4} value={4}>{I18n.t('April')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={5} value={5}>{I18n.t('May')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={6} value={6}>{I18n.t('June')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={7} value={7}>{I18n.t('July')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={8} value={8}>{I18n.t('August')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={9} value={9}>{I18n.t('September')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={10} value={10}>{I18n.t('October')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={11} value={11}>{I18n.t('November')}</MenuItem>
                <MenuItem style={{ placeContent: 'space-between' }} key={12} value={12}>{I18n.t('December')}</MenuItem>
            </Select>
        </FormControl>
        <FormControl
            variant="standard"
            className={Utils.clsx(cls.root, className)}
            style={style}
        >
            <Select
                variant="standard"
                className={Utils.clsx(cls.root, className)}
                margin="dense"
                label={I18n.t('Date')}
                onChange={e =>
                    onChange(`${month.toString().padStart(2, '0')}.${e.target.value.toString().padStart(2, '0')}`)}
                value={date}
            >
                <MenuItem style={{ placeContent: 'space-between' }} key={'A'} value={0}>{I18n.t('Any')}</MenuItem>
                {days.map(i => <MenuItem style={{ placeContent: 'space-between' }} key={i} value={i}>{i}</MenuItem>)}
            </Select>
        </FormControl>
    </div>;
}

CustomDate.defaultProps = {
    value: '',
    className: null,
};

CustomDate.propTypes = {
    title: PropTypes.string,
    attr: PropTypes.string,
    style: PropTypes.object,
    onChange: PropTypes.func
};

export default CustomDate;
