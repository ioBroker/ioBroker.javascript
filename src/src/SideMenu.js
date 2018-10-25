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
import {DragDropContext, Droppable, Draggable} from 'react-beautiful-dnd';

import Theme from './Theme';

import {MdFolder as IconFolder} from 'react-icons/md';
import {MdDescription as IconDocument} from 'react-icons/md';
import {MdDelete as IconDelete} from 'react-icons/md';
import {MdExpandMore as IconExpand} from 'react-icons/md';
import {MdExpandLess as IconCollapse} from 'react-icons/md';
import {MdPlayArrow as IconPlay} from 'react-icons/md';
import {MdPause as IconPause} from 'react-icons/md';
import {MdSwapVert as IconReorder} from 'react-icons/md';
import ImgJS from './assets/js.png';
import ImgBlockly from './assets/blockly.png';
import ImgTypeScript from './assets/typescript.png';

import data from './data';


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
    },
    scriptIcon: {
        width: 18,
        height: 18
    },
    folder: {
        background: '#e2e2e2'
    }
});

const images = {
    'Blockly': ImgBlockly,
    'Javascript/js': ImgJS,
    def: ImgJS,
    'TypeScript/ts': ImgTypeScript,
};

const getItemStyle = (isDragging, draggableStyle) => ({
    userSelect: 'none',
    background: isDragging ? 'lightgreen' : 'inherit',
    ...draggableStyle,
});

const getObjectName = (id, obj, lang) => {
    if (obj && obj.common && obj.common.name) {
        if (typeof obj.common.name === 'object') {
            return obj.common.name[lang] || obj.common.name.en;
        } else {
            return obj.common.name;
        }
    } else {
        return id.replace(/^script\.js./, '');
    }
};

const prepareList = data => {
    const result = [];
    const ids = Object.keys(data);
    ids.sort((a, b) => {
        if ((a === 'script.js.common' || a === 'script.js.global') && (b === 'script.js.common' || b === 'script.js.global')) {
            return a > b ? 1 : -1;
        } else if (a === 'script.js.common' || a === 'script.js.global' || b === 'script.js.common' || b === 'script.js.global') {
            return 1;
        } else {
            return a > b ? 1 : -1;
        }
    });

    for (let i = 0; i < ids.length; i++) {
        const obj = data[ids[i]];
        const parts = ids[i].split('.');
        parts.pop();
        result.push({
            id:         ids[i],
            index:      i,
            title:      getObjectName(ids[i], obj, 'de'),
            enabled:    obj && obj.common && obj.common.enabled,
            depth:      parts.length - 2,
            type:       obj.type === 'script' ? obj.common.engineType : 'folder',
            parent:     parts.length > 2 ? parts.join('.') : null
        });

    }
    return result;
};

class SideDrawer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            listItems: prepareList(data),
            expanded: [],
            reorder: false,
            selected: null
        };
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

    onDragEnd(result) {
        // dropped outside the list
        if (!result.destination) {
            return;
        }

        /*const items = reorder(
            this.state.items,
            result.source.index,
            result.destination.index
        );

        this.setState({
            items,
        });*/
    }

    onDragUpdate = (update, provided) => {
        console.log(update);
    };


    renderItemButtons(item, children) {
        if (this.state.reorder) return null;
        if (children && children.length) {
            return this.state.expanded.indexOf(item.id) !== -1 ? (
                <IconCollapse onClick={() => this.onCollapse(item.id)}/>) : (
                <IconExpand onClick={() => this.onExpand(item.id)}/>);
        } else {
            return [
                item.type !== 'folder' ? (<IconButton style={{color: item.enabled ? '#589458' : 'red'}}>{item.enabled ? (<IconPause/>) : (<IconPlay/>)}</IconButton>) : null,
                item.id !== 'script.js.common' && item.id !== 'script.js.global' ? (<IconButton><IconDelete/></IconButton>) : null
            ];
        }
    }

    getTextStyle(type) {
        if (!this.state.reorder && type !== 'folder') {
            return {
                width: 130,
                overflow: 'hidden',
                flex: 'none'
            };
        } else {
            return undefined;
        }
    }

    onClick(item) {
        if (item.type === 'folder') {
            if (this.state.expanded.indexOf(item.id) === -1) {
                this.onExpand(item.id);
            } else {
                this.onCollapse(item.id);
            }
        } else {
            this.props.onSelect && this.props.onSelect(item.id);
        }
    }

    renderOneItem(items, item) {
        let children = items.filter(i => i.parent === item.id);

        const Icon = item.icon;
        const inner = (
            <ListItem
                style={{paddingLeft: item.depth * Theme.menu.depthOffset}}
                className={item.type === 'folder' ? this.props.classes.folder : ''}
                onClick={() => this.onClick(item)}
            >
                <ListItemIcon>
                    {item.type === 'folder' ? (<IconFolder />) : (<img className={this.props.classes.scriptIcon} src={images[item.type] || images.def}/>)}
                </ListItemIcon>
                <ListItemText style={this.getTextStyle(item.type)} primary={item.title} secondary={null}/>
                <ListItemSecondaryAction>{this.renderItemButtons(item, children)}</ListItemSecondaryAction>
            </ListItem>
        );

        const result = [this.state.reorder ? (
            <Draggable key={item.id} draggableId={item.id} index={item.index}>
                {(provided, snapshot) => (
                    <div ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={getItemStyle(
                                snapshot.isDragging,
                                provided.draggableProps.style
                            )}>
                        {inner}
                    </div>
                )}
            </Draggable>) : inner];

        if (children && (this.state.reorder || this.state.expanded.indexOf(item.id) !== -1)) {
            children.forEach(it => result.push(this.renderOneItem(items, it)));
        }
        return result;
    }

    renderAllItems(items, dragging) {
        const result = [];
        const index = {value: 0};
        items.forEach(item => !item.parent && result.push(this.renderOneItem(items, item, dragging)));

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
                <div className={classes.toolbar}>
                    <IconButton
                        style={{color: this.state.reorder ? 'red' : 'inherit'}}
                        onClick={() => this.setState({reorder: !this.state.reorder})}><IconReorder/></IconButton>
                </div>
                <Divider/>
                <DragDropContext
                    onDragEnd={this.onDragEnd}
                    onDragUpdate={this.onDragUpdate}
                >
                    <Droppable droppableId="droppable">
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef}
                                 //style={getListStyle(snapshot.isDraggingOver)}
                                 className={classes.innerMenu}>
                                {this.renderAllItems(this.state.listItems)}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

            </Drawer>
        );
    }
}

SideDrawer.propTypes = {
    classes: PropTypes.object.isRequired,
    onSelect: PropTypes.func
};

export default withStyles(styles)(SideDrawer);
