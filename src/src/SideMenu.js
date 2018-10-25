import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import Divider from '@material-ui/core/Divider';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import Theme from './Theme';

import {MdFolder as IconFolder} from 'react-icons/md';
import {MdDescription as IconDocument} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';
import {MdExpandMore as IconExpand} from 'react-icons/md';
import {MdExpandLess as IconCollapse} from 'react-icons/md';
import {MdPlayArrow as IconPlay} from 'react-icons/md';
import {MdPause as IconPause} from 'react-icons/md';

const styles = theme => ({
    drawerPaper: {
        position: 'relative',
        width: Theme.menu.width,
    },
    toolbar: theme.mixins.toolbar,
    menu: {
        width: '100%',
        height: '100%'
    },
    innerMenu: {
        width: '100%',
        height: '100%',
        overflowX: 'hidden',
        overflowY: 'auto'
    }
});

class SideDrawer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            listItems: [
                {title: 'List Item 1', id: '1'},
                {title: 'List Item 1', id: '2', parent: '1'}
            ],
            commonItems: [{title: 'List Item 2', id: '3'}],
            globalItems: [{title: 'List Item 3', id: '4'}],
            expanded: []
        };
    }

    static treeCalculateDepth(items, item, depth) {
        depth = depth || 0;
        if (!item.parent) return depth;
        const parent = items.find(i => i.id === item.id);
        if (parent) {
            return SideDrawer.treeCalculateDepth(items, parent, depth + 1);
        } else {
            return depth;
        }
    }
    static treeGetChildren(items, item) {
        return items.filter(i => i.parent === item.id);
    }

    onExpand(id) {
        if (this.state.expanded.indexOf(id) === -1) {
            this.setState({expanded: this.state.expanded.concat([id])});
        }
    }

    onCollapse(id) {
        const pos = this.state.expanded.indexOf(id);
        if (pos !== -1) {
            const expanded = this.state.expanded.concat([]);
            expanded.splice(pos, 1);
            this.setState({expanded});
        }
    }

    renderItemButtons(item, children) {
        if (children && children.length) {
            return this.state.expanded.indexOf(item.id) !== -1 ? (<IconCollapse onClick={() => this.onCollapse(item.id)}/>): (<IconExpand onClick={() => this.onExpand(item.id)}/>);
        } else {
            return [
                (<IconButton style={{color: '#589458'}}><IconPause/></IconButton>),
                (<IconButton><IconDelete /></IconButton>)
            ];
        }

    }

    renderOneItem(items, item, depth) {
        depth = depth || 0;
        let children = SideDrawer.treeGetChildren(items, item);

        const result = [(
            <ListItem style={{paddingLeft: 10 + depth * Theme.menu.depthOffset}}>
                <ListItemIcon>
                    {children.length ? (<IconFolder/>) : (<IconDocument/>)}
                </ListItemIcon>
                <ListItemText
                    primary={item.title}
                    secondary={null}
                />
                <ListItemSecondaryAction>
                    {this.renderItemButtons(item, children)}
                </ListItemSecondaryAction>
            </ListItem>)];
        if (children && this.state.expanded.indexOf(item.id) !== -1) {
            children.forEach(it => result.push(this.renderOneItem(items, it, depth + 1)));
        }
        return result;
    }

    renderAllItems(items) {
        const result = [];
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item)));
        return (<List dense={true}>{result}</List>);
    }

    render() {
        const {classes} = this.props;

        return (
            <Drawer
                variant="permanent"
                className={classes.menu}
                classes={{paper: classes.drawerPaper}}
                anchor='left'
            >
                <div className={classes.toolbar}/>
                <Divider/>
                <div className={classes.innerMenu}>
                    {this.renderAllItems(this.state.listItems)}
                    <Divider/>
                    {this.renderAllItems(this.state.commonItems)}
                    <Divider/>
                    {this.renderAllItems(this.state.globalItems)}
                </div>
            </Drawer>
        );
    }
}

SideDrawer.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withStyles(styles)(SideDrawer);
